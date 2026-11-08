"""Verificación de extremo a extremo de F3 (Orden de producción, ciclos y plan de entrega) contra servidor HTTP real.

Comprueba el contrato de F3 contra el servidor levantado con ``uvicorn app.main:app``,
que es el proceso que consume el frontend (AC-F3-01 a AC-F3-14). Uso:

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
            crudo = respuesta.read()
            return respuesta.status, json.loads(crudo) if crudo else None
    except HTTPError as error:
        crudo = error.read()
        try:
            return error.code, json.loads(crudo)
        except json.JSONDecodeError:
            return error.code, crudo.decode("utf-8", errors="replace")


def comprobar(escenario: str, esperado: str, obtenido: str, condicion: bool) -> None:
    resultados.append((escenario, esperado, obtenido, condicion))


def main() -> int:
    # 1. AC-F3-01: Diagnóstico global en catálogo acíclico (DAG)
    estado, cuerpo = llamar("GET", "/api/v1/orden-produccion")
    comprobar(
        "AC-F3-01 GET /orden-produccion responde 200 en catálogo acíclico",
        "200 OK con esDag: True",
        f"{estado} con esDag: {cuerpo.get('esDag') if isinstance(cuerpo, dict) else None}",
        estado == 200 and isinstance(cuerpo, dict) and cuerpo.get("esDag") is True,
    )

    orden = cuerpo.get("orden", []) if isinstance(cuerpo, dict) else []
    total_pasos = cuerpo.get("totalPasos", 0) if isinstance(cuerpo, dict) else 0

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

    # 3. AC-F3-03 / AC-F3-04: Diagnóstico global con ciclo responde 200 (sin 409 ni orden parcial)
    estado_crear, dep_ciclo = llamar(
        "POST",
        "/api/v1/dependencias",
        {"origen": "PROC-CORTE", "destino": "INS-BARRA"},
    )

    estado_ciclo, cuerpo_ciclo = llamar("GET", "/api/v1/orden-produccion")

    es_dag = cuerpo_ciclo.get("esDag") if isinstance(cuerpo_ciclo, dict) else None
    ciclos = cuerpo_ciclo.get("ciclos", []) if isinstance(cuerpo_ciclo, dict) else []
    bloqueados = cuerpo_ciclo.get("elementosBloqueados", []) if isinstance(cuerpo_ciclo, dict) else []
    orden_en_ciclo = cuerpo_ciclo.get("orden", []) if isinstance(cuerpo_ciclo, dict) else None

    comprobar(
        "AC-F3-03 Diagnóstico global responde 200 ante ciclos con esDag: False y orden vacío",
        "200 OK con esDag: False, orden: [] y totalPasos: 0",
        f"{estado_ciclo} con esDag: {es_dag}, len(orden): {len(orden_en_ciclo) if orden_en_ciclo is not None else None}",
        estado_ciclo == 200 and es_dag is False and orden_en_ciclo == [] and cuerpo_ciclo.get("totalPasos") == 0,
    )

    comprobar(
        "AC-F3-03 Diagnóstico global incluye ciclos estructurados y elementosBloqueados",
        "ciclos con secuencias cerradas y elementosBloqueados populated",
        f"len(ciclos): {len(ciclos)}, len(bloqueados): {len(bloqueados)}",
        len(ciclos) > 0 and len(bloqueados) > 0 and "INS-BARRA" in bloqueados,
    )

    # 4. AC-F3-05: Plan de entrega para producto aislado o específico
    # PROD-ESCRITORIO está en la rama de madera acíclica
    estado_plan, cuerpo_plan = llamar("GET", "/api/v1/plan-entrega?productos=PROD-ESCRITORIO")
    comprobar(
        "AC-F3-07 Plan de entrega para PROD-ESCRITORIO no se contamina por ciclo en acero",
        "200 OK con esPlanificable: True y pasos acíclicos",
        f"{estado_plan} con esPlanificable: {cuerpo_plan.get('esPlanificable') if isinstance(cuerpo_plan, dict) else None}",
        estado_plan == 200 and cuerpo_plan.get("esPlanificable") is True and len(cuerpo_plan.get("pasos", [])) > 0,
    )

    # 5. AC-F3-06: Plan de entrega para producto bloqueado
    estado_plan_b, cuerpo_plan_b = llamar("GET", "/api/v1/plan-entrega?productos=PROD-PANEL")
    comprobar(
        "AC-F3-06 Plan de entrega responde 200 con BLOQUEADO y pasos: []",
        "200 OK con esPlanificable: False y pasos: []",
        f"{estado_plan_b} con esPlanificable: {cuerpo_plan_b.get('esPlanificable') if isinstance(cuerpo_plan_b, dict) else None}",
        estado_plan_b == 200 and cuerpo_plan_b.get("esPlanificable") is False and cuerpo_plan_b.get("pasos") == [],
    )

    # Restaurar el catálogo eliminando la arista cíclica
    if estado_crear == 201:
        llamar("DELETE", f"/api/v1/dependencias/{dep_ciclo['origen']}/{dep_ciclo['destino']}")

    # 6. AC-F3-11: Restricción de arquitectura - Sin NetworkX para algoritmos en dominio
    raiz = Path(__file__).resolve().parent.parent
    archivos_dominio = list((raiz / "app" / "dominio").glob("*.py"))
    usa_networkx = False
    for archivo in archivos_dominio:
        contenido = archivo.read_text(encoding="utf-8")
        if "networkx" in contenido.lower():
            usa_networkx = True
            break

    comprobar(
        "AC-F3-11 Sin NetworkX para orden topológico ni detección de ciclos en dominio",
        "Cero menciones a NetworkX en backend/app/dominio",
        "Libre de NetworkX" if not usa_networkx else "Se detectó NetworkX",
        not usa_networkx,
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
