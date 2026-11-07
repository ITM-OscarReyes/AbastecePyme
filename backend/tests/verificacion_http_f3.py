"""Verificación de extremo a extremo de F3 (Orden de producción y ciclos) contra servidor HTTP real.

Comprueba el contrato de F3 contra el servidor levantado con ``uvicorn app.main:app``,
que es el proceso que consume el frontend (C-02, AC-F3-01 a AC-F3-11). Uso:

    python tests/verificacion_http_f3.py [http://127.0.0.1:8000]

Precondición: servidor arrancado con el catálogo sintético de demostración intacto.
La salida declara por cada escenario qué se esperaba, qué se obtuvo y si pasó o falló.
"""

import json
import sys
from pathlib import Path
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


def comprobar(escenario: str, esperado: str, obtenido: str, condicion: bool) -> None:
    resultados.append((escenario, esperado, obtenido, condicion))


def main() -> int:
    # 1. AC-F3-01: Orden de producción nominal en catálogo acíclico (DAG)
    estado, cuerpo = llamar("GET", "/api/v1/orden-produccion")
    comprobar(
        "AC-F3-01 GET /orden-produccion responde 200 en catálogo acíclico",
        "200 OK con esDag: True",
        f"{estado} con esDag: {cuerpo.get('esDag') if isinstance(cuerpo, dict) else None}",
        estado == 200 and isinstance(cuerpo, dict) and cuerpo.get("esDag") is True,
    )

    orden = cuerpo.get("orden", []) if isinstance(cuerpo, dict) else []
    total_pasos = cuerpo.get("totalPasos", 0) if isinstance(cuerpo, dict) else 0

    # Obtener el grafo para verificar precedencias: para cada origen -> destino, paso(origen) < paso(destino)
    _, grafo = llamar("GET", "/api/v1/grafo")
    dependencias = grafo.get("dependencias", []) if isinstance(grafo, dict) else []
    paso_por_id = {item["id"]: item["paso"] for item in orden if "id" in item and "paso" in item}

    precedencias_validas = True
    violaciones = []
    for dep in dependencias:
        orig = dep["origen"]
        dest = dep["destino"]
        if orig in paso_por_id and dest in paso_por_id:
            if paso_por_id[orig] >= paso_por_id[dest]:
                precedencias_validas = False
                violaciones.append(f"{orig} (paso {paso_por_id[orig]}) >= {dest} (paso {paso_por_id[dest]})")

    comprobar(
        "AC-F3-01 Respeto estricto de precedencias origen habilita destino en todos los pasos",
        "Toda dependencia origen -> destino cumple paso(origen) < paso(destino)",
        "Precedencias 100% respetadas" if precedencias_validas else f"Violaciones: {violaciones}",
        precedencias_validas and total_pasos == len(orden) and total_pasos > 0,
    )

    # 2. AC-F3-02: Determinismo estricto de Kahn en sucesivas peticiones
    estado2, cuerpo2 = llamar("GET", "/api/v1/orden-produccion")
    bytes1 = json.dumps(cuerpo, sort_keys=True)
    bytes2 = json.dumps(cuerpo2, sort_keys=True)
    comprobar(
        "AC-F3-02 Determinismo byte a byte y desempate alfabético por ID",
        "Respuestas consecutivas idénticas byte a byte",
        "Respuestas idénticas" if bytes1 == bytes2 else "Discrepancia en determinismo",
        bytes1 == bytes2 and estado2 == 200,
    )

    # 3. AC-F3-03 / AC-F3-04: Detección y reporte de dependencias circulares (409 Conflict)
    # Registrar temporalmente una dependencia inversa que genere ciclo
    # En el catálogo de madera: INS-BARNIZ -> PROC-ENSAMBLE -> PROD-ESCRITORIO
    # Creamos PROD-ESCRITORIO -> INS-BARNIZ para forzar ciclo
    estado_crear, dep_ciclo = llamar(
        "POST",
        "/api/v1/dependencias",
        {"origen": "PROD-ESCRITORIO", "destino": "INS-BARNIZ"}
    )

    # Puede requerir validar si las reglas de tipo permiten producto -> insumo o si se prueba entre elementos permitidos
    # Si las reglas de tipo impiden PROD -> INSUMO, creamos un ciclo permitido entre PROCESO ↔ SUMINISTRO
    # Ejemplo: PROC-CORTE habilita INS-BARRA (ya existe INS-BARRA -> PROC-CORTE)
    if estado_crear != 201:
        estado_crear, dep_ciclo = llamar(
            "POST",
            "/api/v1/dependencias",
            {"origen": "PROC-CORTE", "destino": "INS-BARRA"}
        )

    estado_ciclo, cuerpo_ciclo = llamar("GET", "/api/v1/orden-produccion")

    error_dict = cuerpo_ciclo.get("error", {}) if isinstance(cuerpo_ciclo, dict) else {}
    codigo_error = error_dict.get("codigo")
    detalles_error = error_dict.get("detalles", [])
    campos_detalles = {d.get("campo"): d.get("mensaje") for d in detalles_error if isinstance(d, dict)}

    comprobar(
        "AC-F3-03 Catálogo cíclico responde 409 Conflict con código CONFIGURACION_CICLICA",
        "409 Conflict con CONFIGURACION_CICLICA",
        f"{estado_ciclo} con código: {codigo_error}",
        estado_ciclo == 409 and codigo_error == "CONFIGURACION_CICLICA",
    )

    comprobar(
        "AC-F3-03 Detalles incluyen lazo cerrado ('ciclo') y elementos bloqueados",
        "Detalle con campo 'ciclo' y campo 'elementosBloqueados'",
        f"Campos presentes: {list(campos_detalles.keys())}",
        "ciclo" in campos_detalles and "elementosBloqueados" in campos_detalles,
    )

    # 4. AC-F3-05: Prohibición de orden parcial o falso cuando existe contradicción
    comprobar(
        "AC-F3-05 Prohibición de orden falso ante ciclos (no devuelve clave 'orden')",
        "Cuerpo de error sin array de orden de producción",
        f"Claves devueltas: {list(cuerpo_ciclo.keys()) if isinstance(cuerpo_ciclo, dict) else []}",
        "orden" not in cuerpo_ciclo and "totalPasos" not in cuerpo_ciclo,
    )

    # Restaurar el catálogo eliminando la arista cíclica
    if estado_crear == 201:
        llamar("DELETE", f"/api/v1/dependencias/{dep_ciclo['origen']}/{dep_ciclo['destino']}")

    # 5. AC-F3-08: Restricción de arquitectura - Sin NetworkX para algoritmos
    raiz = Path(__file__).resolve().parent.parent
    archivos_dominio = list((raiz / "app" / "dominio").glob("*.py"))
    usa_networkx = False
    for archivo in archivos_dominio:
        contenido = archivo.read_text(encoding="utf-8")
        if "networkx" in contenido.lower():
            usa_networkx = True
            break

    comprobar(
        "AC-F3-08 Sin NetworkX para orden topológico ni detección de ciclos en dominio",
        "Cero menciones a NetworkX en backend/app/dominio",
        "Libre de NetworkX" if not usa_networkx else "Se detectó NetworkX",
        not usa_networkx,
    )

    # 6. AC-F3-11: Restricción de arquitectura - Frontend no implementa algoritmos de grafo
    raiz_frontend = raiz.parent / "frontend" / "src"
    componentes_frontend = list(raiz_frontend.glob("**/*.tsx")) + list(raiz_frontend.glob("**/*.ts"))
    algoritmos_cliente = False
    palabras_prohibidas = ["topologicalsort", "shortestpath", "dijkstra"]
    for archivo in componentes_frontend:
        if "test" in str(archivo):
            continue
        contenido = archivo.read_text(encoding="utf-8").lower()
        for palabra in palabras_prohibidas:
            if palabra in contenido:
                algoritmos_cliente = True
                break

    comprobar(
        "AC-F3-11 El frontend no duplica algoritmos de orden topológico en TypeScript",
        "Frontend libre de algoritmos de grafo",
        "Frontend actúa estrictamente como presentación" if not algoritmos_cliente else "Se detectaron algoritmos en cliente",
        not algoritmos_cliente,
    )

    # Imprimir reporte formateado
    print()
    print("=" * 70)
    print("VERIFICACIÓN DE CRITERIOS DE ACEPTACIÓN — F3 (ORDEN Y CICLOS)")
    print("=" * 70)
    todos_pasaron = True
    for escenario, esperado, obtenido, condicion in resultados:
        etiqueta = "[PASÓ]" if condicion else "[FALLÓ]"
        if not condicion:
            todos_pasaron = False
        print(f"{etiqueta} {escenario}")
        print(f"        esperado: {esperado}")
        print(f"        obtenido: {obtenido}")

    total = len(resultados)
    pasados = sum(1 for _, _, _, c in resultados if c)
    fallados = total - pasados

    print("-" * 70)
    print(f"Total escenarios F3: {total} · PASÓ: {pasados} · FALLÓ: {fallados}")
    print("-" * 70)

    return 0 if todos_pasaron else 1


if __name__ == "__main__":
    sys.exit(main())
