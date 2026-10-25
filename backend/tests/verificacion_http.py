"""Verificación de extremo a extremo contra el backend arrancado por HTTP real.

No usa ``TestClient``: comprueba el mismo contrato de F1 contra el servidor
levado con ``uvicorn app.main:app``, que es el proceso que consume el
frontend (C-02, AC-F1-24). Uso:

    python tests/verificacion_http.py [http://127.0.0.1:8000]

Precondición: servidor recién arrancado con el catálogo de demostración
intacto (11 elementos y 11 dependencias), porque los escenarios de alta y de
duplicado modifican el catálogo.

La salida declara por cada escenario qué se esperaba, qué se obtuvo y si pasó
o falló.
"""

import json
import sys
from typing import Any
from urllib.error import HTTPError
from urllib.request import Request, urlopen

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8000"

resultados: list[tuple[str, str, str, bool]] = []


def llamar(metodo: str, ruta: str, cuerpo: Any = None, cabeceras: dict | None = None) -> tuple[int, Any]:
    datos = json.dumps(cuerpo).encode("utf-8") if cuerpo is not None else None
    peticion = Request(f"{BASE}{ruta}", data=datos, method=metodo)
    peticion.add_header("Content-Type", "application/json")
    for clave, valor in (cabeceras or {}).items():
        peticion.add_header(clave, valor)
    try:
        with urlopen(peticion) as respuesta:
            return respuesta.status, json.loads(respuesta.read())
    except HTTPError as error:
        crudo = error.read()
        try:
            return error.code, json.loads(crudo)
        except json.JSONDecodeError:
            return error.code, crudo.decode("utf-8", errors="replace")


def cuerpo_crudo(ruta: str) -> tuple[int, Any]:
    peticion = Request(f"{BASE}{ruta}", data=b"{roto", method="POST")
    peticion.add_header("Content-Type", "application/json")
    try:
        with urlopen(peticion) as respuesta:
            return respuesta.status, json.loads(respuesta.read())
    except HTTPError as error:
        return error.code, json.loads(error.read())


def comprobar(escenario: str, esperado: str, obtenido: str, condicion: bool) -> None:
    resultados.append((escenario, esperado, obtenido, condicion))


def main() -> int:
    estado, grafo = llamar("GET", "/api/v1/grafo")
    resumen = json.dumps(grafo["resumen"])
    comprobar(
        "AC-F1-10 GET /grafo responde 200",
        "200",
        str(estado),
        estado == 200,
    )
    comprobar(
        "AC-F1-10 el resumen coincide con lo devuelto",
        "resumen con 11 elementos y 11 dependencias, igual que las listas",
        resumen,
        grafo["resumen"]["totalElementos"] == len(grafo["elementos"]) == 11
        and grafo["resumen"]["totalDependencias"] == len(grafo["dependencias"]) == 11,
    )
    comprobar(
        "AC-F1-09c cada dependencia lleva tipoRelacion habilita",
        'tipoRelacion "habilita" en las 11 dependencias',
        str({d["tipoRelacion"] for d in grafo["dependencias"]}),
        all(d["tipoRelacion"] == "habilita" for d in grafo["dependencias"]),
    )

    estado, cuerpo = llamar(
        "POST",
        "/api/v1/elementos",
        {"id": "ins-prueba-http", "tipo": "insumo", "nombre": "Insumo de prueba HTTP"},
    )
    comprobar("AC-F1-01b alta en minúsculas normalizada responde 201", "201", str(estado), estado == 201)
    comprobar(
        "AC-F1-01b el id y el tipo se devuelven en mayúsculas",
        "id INS-PRUEBA-HTTP, tipo INSUMO",
        f"id {cuerpo.get('id')}, tipo {cuerpo.get('tipo')}",
        cuerpo.get("id") == "INS-PRUEBA-HTTP" and cuerpo.get("tipo") == "INSUMO",
    )

    estado, _ = llamar(
        "POST",
        "/api/v1/elementos",
        {"id": "PROV-PRUEBA-HTTP", "tipo": "PROVEEDOR", "nombre": "Proveedor de prueba HTTP"},
    )
    comprobar(
        "El suministro de prueba se asocia a un proveedor",
        "201 para el proveedor",
        str(estado),
        estado == 201,
    )
    estado, _ = llamar(
        "POST",
        "/api/v1/dependencias",
        {"origen": "PROV-PRUEBA-HTTP", "destino": "INS-PRUEBA-HTTP"},
    )
    comprobar(
        "La asociación proveedor → suministro se registra",
        "201",
        str(estado),
        estado == 201,
    )

    estado, _ = llamar(
        "POST",
        "/api/v1/elementos",
        {"id": "PROC-PRUEBA-HTTP", "tipo": "PROCESO", "nombre": "Proceso de prueba HTTP"},
    )
    comprobar(
        "El proceso de prueba se crea para las relaciones inversas",
        "201",
        str(estado),
        estado == 201,
    )

    estado, cuerpo = llamar(
        "POST",
        "/api/v1/elementos",
        {"id": "INS-PRUEBA-HTTP", "tipo": "PRODUCTO", "nombre": "Duplicado"},
    )
    comprobar(
        "AC-F1-02 un id ya registrado responde 409 ERR-01",
        "409 con error.codigo ELEMENTO_DUPLICADO",
        f"{estado} con {cuerpo['error']['codigo']}",
        estado == 409 and cuerpo["error"]["codigo"] == "ELEMENTO_DUPLICADO",
    )

    estado, cuerpo = llamar("GET", "/api/v1/elementos/INS-PRUEBA-HTTP")
    comprobar(
        "AC-F1-02 el original no se altera por el duplicado",
        "200 con tipo INSUMO y nombre Insumo de prueba HTTP",
        f"{estado} con tipo {cuerpo.get('tipo')} y nombre {cuerpo.get('nombre')}",
        estado == 200 and cuerpo["tipo"] == "INSUMO" and cuerpo["nombre"] == "Insumo de prueba HTTP",
    )

    estado, cuerpo = llamar("GET", "/api/v1/elementos/INS-NO-EXISTE")
    comprobar(
        "AC-F1-05b elemento inexistente responde 404 ERR-02",
        "404 con error.codigo ELEMENTO_NO_ENCONTRADO",
        f"{estado} con {cuerpo['error']['codigo']}",
        estado == 404 and cuerpo["error"]["codigo"] == "ELEMENTO_NO_ENCONTRADO",
    )

    estado, cuerpo = llamar("GET", "/api/v1/elementos/xx")
    comprobar(
        "AC-F1-05c id mal formado responde 422 ERR-05",
        "422 con error.codigo IDENTIFICADOR_INVALIDO",
        f"{estado} con {cuerpo['error']['codigo']}",
        estado == 422 and cuerpo["error"]["codigo"] == "IDENTIFICADOR_INVALIDO",
    )

    estado, cuerpo = llamar(
        "POST", "/api/v1/dependencias", {"origen": "INS-PRUEBA-HTTP", "destino": "PROD-BANCO"}
    )
    comprobar("AC-F1-06 dependencia válida responde 201", "201", str(estado), estado == 201)

    estado, cuerpo = llamar(
        "POST", "/api/v1/dependencias", {"origen": "INS-NO-EXISTE", "destino": "PROD-BANCO"}
    )
    comprobar(
        "AC-F1-06c origen inexistente responde 404 ERR-02 en el campo origen",
        "404 con ELEMENTO_NO_ENCONTRADO y detalle de campo origen",
        f"{estado} con {cuerpo['error']['codigo']} y campo "
        f"{cuerpo['error']['detalles'][0]['campo']}",
        estado == 404
        and cuerpo["error"]["codigo"] == "ELEMENTO_NO_ENCONTRADO"
        and [d["campo"] for d in cuerpo["error"]["detalles"]] == ["origen"],
    )

    estado, cuerpo = llamar(
        "POST", "/api/v1/dependencias", {"origen": "INS-BARRA", "destino": "NO-EXISTE"}
    )
    comprobar(
        "AC-F1-06c destino inexistente responde 404 ERR-02 en el campo destino",
        "404 con ELEMENTO_NO_ENCONTRADO y detalle de campo destino",
        f"{estado} con {cuerpo['error']['codigo']} y campo "
        f"{cuerpo['error']['detalles'][0]['campo']}",
        estado == 404
        and cuerpo["error"]["codigo"] == "ELEMENTO_NO_ENCONTRADO"
        and [d["campo"] for d in cuerpo["error"]["detalles"]] == ["destino"],
    )

    estado, cuerpo = llamar("GET", "/api/v1/dependencias?origen=INS-NO-EXISTE")
    comprobar(
        "AC-F1-13c filtro sin coincidencias responde 200 con lista vacía",
        "200 con total 0 y dependencias vacías",
        f"{estado} con total {cuerpo.get('total')}",
        estado == 200 and cuerpo["total"] == 0 and cuerpo["dependencias"] == [],
    )

    estado, cuerpo = llamar(
        "POST", "/api/v1/dependencias", {"origen": "INS-PRUEBA-HTTP", "destino": "PROD-BANCO"}
    )
    comprobar(
        "AC-F1-08 dependencia repetida responde 409 ERR-08",
        "409 con error.codigo DEPENDENCIA_DUPLICADA",
        f"{estado} con {cuerpo['error']['codigo']}",
        estado == 409 and cuerpo["error"]["codigo"] == "DEPENDENCIA_DUPLICADA",
    )

    estado, _ = llamar(
        "POST",
        "/api/v1/dependencias",
        {"origen": "INS-PRUEBA-HTTP", "destino": "PROC-PRUEBA-HTTP"},
    )
    comprobar(
        "La relación suministro → proceso se registra",
        "201",
        str(estado),
        estado == 201,
    )

    estado, _ = llamar(
        "POST",
        "/api/v1/dependencias",
        {"origen": "PROC-PRUEBA-HTTP", "destino": "INS-PRUEBA-HTTP"},
    )
    comprobar("AC-F1-08b el par inverso responde 201", "201", str(estado), estado == 201)

    estado, cuerpo = llamar(
        "POST", "/api/v1/dependencias", {"origen": "PROD-BANCO", "destino": "PROD-BANCO"}
    )
    comprobar(
        "AC-F1-07 dependencia reflexiva responde 422 ERR-07",
        "422 con error.codigo DEPENDENCIA_INVALIDA",
        f"{estado} con {cuerpo['error']['codigo']}",
        estado == 422 and cuerpo["error"]["codigo"] == "DEPENDENCIA_INVALIDA",
    )

    estado, cuerpo = llamar("GET", "/api/v1/dependencias?origen=INS-PRUEBA-HTTP")
    comprobar(
        "AC-F1-09b filtro por origen devuelve solo las de ese origen",
        "200 con total 2 hacia PROD-BANCO y PROC-PRUEBA-HTTP",
        f"{estado} con total {cuerpo.get('total')}",
        estado == 200
        and cuerpo["total"] == 2
        and {d["destino"] for d in cuerpo["dependencias"]}
        == {"PROD-BANCO", "PROC-PRUEBA-HTTP"},
    )

    estado, cuerpo = llamar("GET", "/api/v1/elementos?tipo=DESCONOCIDO")
    comprobar(
        "AC-F1-04d filtro de tipo inválido responde 422 ERR-04",
        "422 con error.codigo VALIDACION_FALLIDA",
        f"{estado} con {cuerpo['error']['codigo']}",
        estado == 422 and cuerpo["error"]["codigo"] == "VALIDACION_FALLIDA",
    )

    estado, cuerpo = llamar("GET", "/api/v1/no-existe")
    comprobar(
        "AC-F1-17 ruta inexistente responde 404 ERR-09",
        "404 con error.codigo TIPO_NO_ENCONTRADO",
        f"{estado} con {cuerpo['error']['codigo']}",
        estado == 404 and cuerpo["error"]["codigo"] == "TIPO_NO_ENCONTRADO",
    )

    estado, cuerpo = llamar("POST", "/api/v1/elementos", {"id": "AB", "tipo": "INSUMO", "nombre": "Corto"})
    comprobar(
        "AC-F1-11 id corto responde 422 ERR-04 señalando el campo",
        "422 con VALIDACION_FALLIDA y detalles de campo id",
        f"{estado} con {cuerpo['error']['codigo']} y campos "
        f"{[d['campo'] for d in cuerpo['error']['detalles']]}",
        estado == 422
        and cuerpo["error"]["codigo"] == "VALIDACION_FALLIDA"
        and [d["campo"] for d in cuerpo["error"]["detalles"]] == ["id"],
    )

    estado, cuerpo = llamar(
        "POST", "/api/v1/elementos", {"id": "INS-PESO", "tipo": "INSUMO", "nombre": "Con peso", "peso": 5}
    )
    comprobar(
        "AC-F1-11c campo de peso responde 422 ERR-06",
        "422 con error.codigo CAMPO_NO_PERMITIDO y el nombre del campo",
        f"{estado} con {cuerpo['error']['codigo']}",
        estado == 422 and cuerpo["error"]["codigo"] == "CAMPO_NO_PERMITIDO",
    )

    estado, cuerpo = cuerpo_crudo("/api/v1/elementos")
    comprobar(
        "AC-F1-11b cuerpo que no es JSON responde 400 ERR-03",
        "400 con error.codigo PETICION_MAL_FORMADA",
        f"{estado} con {cuerpo['error']['codigo']}",
        estado == 400 and cuerpo["error"]["codigo"] == "PETICION_MAL_FORMADA",
    )

    estado, cuerpo = llamar("GET", "/api/v1/elementos/INS-PRUEBA-HTTP")
    comprobar(
        "AC-F1-11d los rechazos no modifican el catálogo",
        "200 con el elemento original de tipo INSUMO",
        f"{estado} con tipo {cuerpo.get('tipo')}",
        estado == 200 and cuerpo["tipo"] == "INSUMO",
    )

    primera = llamar("GET", "/api/v1/grafo")[1]
    segunda = llamar("GET", "/api/v1/grafo")[1]
    comprobar(
        "AC-F1-18 dos lecturas idénticas devuelven lo mismo",
        "idénticas",
        "idénticas" if primera == segunda else "distintas",
        primera == segunda,
    )

    ciclo = [
        ("PROC-CICLO-A", "INS-CICLO-B"),
        ("INS-CICLO-B", "PROC-CICLO-C"),
        ("PROC-CICLO-C", "INS-CICLO-D"),
        ("INS-CICLO-D", "PROC-CICLO-A"),
    ]
    tipos_ciclo = {
        "PROC-CICLO-A": ("PROCESO", "Primer proceso del ciclo"),
        "INS-CICLO-B": ("INSUMO", "Primer suministro del ciclo"),
        "PROC-CICLO-C": ("PROCESO", "Segundo proceso del ciclo"),
        "INS-CICLO-D": ("INSUMO", "Segundo suministro del ciclo"),
    }
    estados_alta: list[int] = []
    for identificador, (tipo, nombre) in tipos_ciclo.items():
        estado, _ = llamar(
            "POST", "/api/v1/elementos", {"id": identificador, "tipo": tipo, "nombre": nombre}
        )
        estados_alta.append(estado)
    comprobar(
        "AC-F1-16 los cuatro elementos del ciclo se crean",
        "201, 201, 201, 201",
        ", ".join(str(e) for e in estados_alta),
        estados_alta == [201, 201, 201, 201],
    )

    estados_ciclo: list[int] = []
    for origen, destino in ciclo:
        estado, _ = llamar("POST", "/api/v1/dependencias", {"origen": origen, "destino": destino})
        estados_ciclo.append(estado)
    comprobar(
        "AC-F1-16 un ciclo se registra íntegramente sin error",
        "201, 201, 201, 201 para las cuatro aristas del ciclo",
        ", ".join(str(e) for e in estados_ciclo),
        estados_ciclo == [201, 201, 201, 201],
    )

    _, grafo_con_ciclo = llamar("GET", "/api/v1/grafo")
    parejas = {(d["origen"], d["destino"]) for d in grafo_con_ciclo["dependencias"]}
    comprobar(
        "AC-F1-16 las cuatro aristas del ciclo aparecen en GET /grafo",
        "las cuatro parejas del ciclo presentes",
        f"{len(parejas & set(ciclo))} de 4 presentes",
        set(ciclo) <= parejas,
    )

    texto_grafo = json.dumps(grafo_con_ciclo).lower()
    avisos = [palabra for palabra in ("advertencia", "veredicto") if palabra in texto_grafo]
    comprobar(
        "AC-F1-16b la respuesta no anuncia el ciclo",
        "sin campos de advertencia ni veredicto de ciclo",
        ", ".join(avisos) if avisos else "sin campos de advertencia ni veredicto",
        not avisos,
    )

    for escenario, esperado, obtenido, condicion in resultados:
        marca = "PASÓ" if condicion else "FALLÓ"
        print(f"[{marca}] {escenario}")
        print(f"        esperado: {esperado}")
        print(f"        obtenido: {obtenido}")

    fallos = [r for r in resultados if not r[3]]
    print(f"\nEscenarios: {len(resultados)} · PASÓ: {len(resultados) - len(fallos)} · FALLÓ: {len(fallos)}")
    return 1 if fallos else 0


if __name__ == "__main__":
    raise SystemExit(main())
