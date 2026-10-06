"""Verificación de extremo a extremo contra el backend arrancado por HTTP real.

No usa ``TestClient``: comprueba el mismo contrato de F1 contra el servidor
levantado con ``uvicorn app.main:app``, que es el proceso que consume el
frontend (C-02, AC-F1-24). Uso:

    python tests/verificacion_http.py [http://127.0.0.1:8000]
"""

import json
import sys
from typing import Any
from urllib.error import HTTPError
from urllib.request import Request, urlopen

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8000"

resultados: list[tuple[str, bool, str]] = []


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


def comprobar(nombre: str, condicion: bool, detalle: str = "") -> None:
    resultados.append((nombre, condicion, detalle))


def main() -> int:
    estado, grafo = llamar("GET", "/api/v1/grafo")
    comprobar("AC-F1-10 GET /grafo responde 200", estado == 200, str(estado))
    comprobar(
        "AC-F1-10 resumen coincide con lo devuelto",
        grafo["resumen"]["totalElementos"] == len(grafo["elementos"]) == 6
        and grafo["resumen"]["totalDependencias"] == len(grafo["dependencias"]) == 6,
        json.dumps(grafo["resumen"]),
    )
    comprobar(
        "AC-F1-09c cada dependencia lleva tipoRelacion habilita",
        all(d["tipoRelacion"] == "habilita" for d in grafo["dependencias"]),
    )

    estado, cuerpo = llamar(
        "POST",
        "/api/v1/elementos",
        {"id": "ins-prueba-http", "tipo": "insumo", "nombre": "Insumo de prueba HTTP"},
    )
    comprobar("AC-F1-01b alta en minúsculas normalizada responde 201", estado == 201, str(cuerpo))
    comprobar("AC-F1-01b id normalizado", cuerpo.get("id") == "INS-PRUEBA-HTTP", str(cuerpo))

    estado, cuerpo = llamar(
        "POST",
        "/api/v1/elementos",
        {"id": "INS-PRUEBA-HTTP", "tipo": "PRODUCTO", "nombre": "Duplicado"},
    )
    comprobar(
        "AC-F1-02 duplicado responde 409 ERR-01",
        estado == 409 and cuerpo["error"]["codigo"] == "ELEMENTO_DUPLICADO",
        f"{estado} {cuerpo}",
    )

    estado, cuerpo = llamar("GET", "/api/v1/elementos/INS-PRUEBA-HTTP")
    comprobar(
        "AC-F1-02 el original no se altera",
        estado == 200 and cuerpo["tipo"] == "INSUMO" and cuerpo["nombre"] == "Insumo de prueba HTTP",
        str(cuerpo),
    )

    estado, cuerpo = llamar("GET", "/api/v1/elementos/INS-NO-EXISTE")
    comprobar(
        "AC-F1-05b inexistente responde 404 ERR-02",
        estado == 404 and cuerpo["error"]["codigo"] == "ELEMENTO_NO_ENCONTRADO",
        f"{estado} {cuerpo}",
    )

    estado, cuerpo = llamar("GET", "/api/v1/elementos/xx")
    comprobar(
        "AC-F1-05c id mal formado responde 422 ERR-05",
        estado == 422 and cuerpo["error"]["codigo"] == "IDENTIFICADOR_INVALIDO",
        f"{estado} {cuerpo}",
    )

    estado, cuerpo = llamar(
        "POST", "/api/v1/dependencias", {"origen": "INS-PRUEBA-HTTP", "destino": "PROD-BANCO"}
    )
    comprobar("AC-F1-06 dependencia responde 201", estado == 201, f"{estado} {cuerpo}")

    estado, cuerpo = llamar(
        "POST", "/api/v1/dependencias", {"origen": "INS-PRUEBA-HTTP", "destino": "PROD-BANCO"}
    )
    comprobar(
        "AC-F1-08 duplicada responde 409 ERR-08",
        estado == 409 and cuerpo["error"]["codigo"] == "DEPENDENCIA_DUPLICADA",
        f"{estado} {cuerpo}",
    )

    estado, cuerpo = llamar(
        "POST", "/api/v1/dependencias", {"origen": "PROD-BANCO", "destino": "INS-PRUEBA-HTTP"}
    )
    comprobar("AC-F1-08b inversa responde 201", estado == 201, f"{estado} {cuerpo}")

    estado, cuerpo = llamar(
        "POST", "/api/v1/dependencias", {"origen": "PROD-BANCO", "destino": "PROD-BANCO"}
    )
    comprobar(
        "AC-F1-07 reflexiva responde 422 ERR-07",
        estado == 422 and cuerpo["error"]["codigo"] == "DEPENDENCIA_INVALIDA",
        f"{estado} {cuerpo}",
    )

    estado, cuerpo = llamar("GET", "/api/v1/dependencias?origen=INS-PRUEBA-HTTP")
    comprobar(
        "AC-F1-09b filtro por origen",
        estado == 200 and cuerpo["total"] == 1 and cuerpo["dependencias"][0]["destino"] == "PROD-BANCO",
        str(cuerpo),
    )

    estado, cuerpo = llamar("GET", "/api/v1/elementos?tipo=DESCONOCIDO")
    comprobar(
        "AC-F1-04d filtro de tipo invalido responde 422 ERR-04",
        estado == 422 and cuerpo["error"]["codigo"] == "VALIDACION_FALLIDA",
        f"{estado} {cuerpo}",
    )

    estado, cuerpo = llamar("GET", "/api/v1/no-existe")
    comprobar(
        "AC-F1-17 ruta inexistente responde 404 ERR-09",
        estado == 404 and cuerpo["error"]["codigo"] == "TIPO_NO_ENCONTRADO",
        f"{estado} {cuerpo}",
    )

    estado, cuerpo = llamar(
        "POST", "/api/v1/elementos", {"id": "AB", "tipo": "INSUMO", "nombre": "Corto"}
    )
    comprobar(
        "AC-F1-11 validacion responde 422 ERR-04 con campo",
        estado == 422
        and cuerpo["error"]["codigo"] == "VALIDACION_FALLIDA"
        and [d["campo"] for d in cuerpo["error"]["detalles"]] == ["id"],
        f"{estado} {cuerpo}",
    )

    estado, cuerpo = llamar("POST", "/api/v1/elementos", {"id": "INS-PESO", "tipo": "INSUMO", "nombre": "Con peso", "peso": 5})
    comprobar(
        "AC-F1-11c campo de peso responde 422 ERR-06",
        estado == 422 and cuerpo["error"]["codigo"] == "CAMPO_NO_PERMITIDO",
        f"{estado} {cuerpo}",
    )

    peticion = Request(f"{BASE}/api/v1/elementos", data=b"{roto", method="POST")
    peticion.add_header("Content-Type", "application/json")
    try:
        with urlopen(peticion) as respuesta:
            estado, cuerpo = respuesta.status, json.loads(respuesta.read())
    except HTTPError as error:
        estado, cuerpo = error.code, json.loads(error.read())
    comprobar(
        "AC-F1-11b cuerpo no JSON responde 400 ERR-03",
        estado == 400 and cuerpo["error"]["codigo"] == "PETICION_MAL_FORMADA",
        f"{estado} {cuerpo}",
    )

    primera = llamar("GET", "/api/v1/grafo")[1]
    segunda = llamar("GET", "/api/v1/grafo")[1]
    comprobar("AC-F1-18 lecturas identicas son identicas", primera == segunda)

    for nombre, condicion, detalle in resultados:
        print(f"{'PASS' if condicion else 'FAIL'} · {nombre}" + (f" · {detalle}" if not condicion else ""))

    fallos = [r for r in resultados if not r[1]]
    print(f"\nTotal: {len(resultados)} · PASS: {len(resultados) - len(fallos)} · FAIL: {len(fallos)}")
    return 1 if fallos else 0


if __name__ == "__main__":
    raise SystemExit(main())
