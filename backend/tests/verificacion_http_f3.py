"""Verificación HTTP de extremo a extremo de F3 (orden, ciclos y plan de entrega).

Comprueba el contrato de ``docs/api-contract.md`` §3.7 y §3.8 contra el servidor
levantado con ``uvicorn app.main:app``, que es el proceso que consume el
frontend. Uso:

    python tests/verificacion_http_f3.py [http://127.0.0.1:8000]

Precondición: servidor arrancado con el catálogo sintético de demostración
intacto. El escenario de ciclo crea ``PROC-ACABADO -> INS-PIEZA-CORTADA`` y lo
elimina al terminar, de modo que el catálogo queda como estaba.

La salida declara por cada escenario qué se esperaba, qué se obtuvo y si pasó o
falló. El código de salida es 1 si algún escenario falla.
"""

import json
import sys
import time
from pathlib import Path
from typing import Any
from urllib.error import HTTPError
from urllib.request import Request, urlopen

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8000"

ORIGEN_CICLO = "PROC-ACABADO"
DESTINO_CICLO = "INS-PIEZA-CORTADA"

resultados: list[tuple[str, str, str, bool]] = []


def llamar(metodo: str, ruta: str, cuerpo: Any = None) -> tuple[int, Any]:
    datos = json.dumps(cuerpo).encode("utf-8") if cuerpo is not None else None
    peticion = Request(f"{BASE}{ruta}", data=datos, method=metodo)
    if datos is not None:
        peticion.add_header("Content-Type", "application/json")
    try:
        with urlopen(peticion) as respuesta:
            texto = respuesta.read().decode("utf-8")
            return respuesta.status, json.loads(texto) if texto else None
    except HTTPError as error:
        texto = error.read().decode("utf-8")
        return error.code, json.loads(texto) if texto else None


def verificar(nombre: str, esperado: str, obtenido: Any, condicion: bool) -> None:
    resultados.append((nombre, esperado, repr(obtenido), condicion))
    estado = "PASÓ" if condicion else "FALLÓ"
    print(f"[{estado}] {nombre}")
    print(f"        esperado: {esperado}")
    print(f"        obtenido: {obtenido}")


def ids_pasos(pasos: list[dict]) -> list[str]:
    return [paso["id"] for paso in pasos]


def crear_ciclo() -> None:
    estado, _ = llamar(
        "POST",
        "/api/v1/dependencias",
        {"origen": ORIGEN_CICLO, "destino": DESTINO_CICLO},
    )
    if estado not in (201, 409):
        raise RuntimeError(f"No se pudo crear el ciclo de prueba: HTTP {estado}")


def eliminar_ciclo() -> None:
    llamar("DELETE", f"/api/v1/dependencias/{ORIGEN_CICLO}/{DESTINO_CICLO}")


def main() -> int:
    print("=" * 70)
    print("VERIFICACIÓN DE CRITERIOS DE ACEPTACIÓN — F3 (ORDEN Y CICLOS)")
    print("=" * 70)

    eliminar_ciclo()

    # ------------------------------------------------------------------
    # AC-F3-01 / 01b / 02 — Diagnóstico global acíclico
    # ------------------------------------------------------------------
    estado_grafo, grafo = llamar("GET", "/api/v1/grafo")
    total_elementos = grafo["resumen"]["totalElementos"]
    total_dependencias = grafo["resumen"]["totalDependencias"]

    estado, global_dag = llamar("GET", "/api/v1/orden-produccion")
    verificar(
        "AC-F3-01 GET /orden-produccion responde 200 en catálogo acíclico",
        "200 OK con esDag: true",
        f"{estado} con esDag: {global_dag.get('esDag')}",
        estado == 200 and global_dag["esDag"] is True,
    )
    verificar(
        "AC-F3-01 el orden contiene todos los elementos del catálogo",
        f"totalPasos = totalElementos = {total_elementos}",
        f"totalPasos: {global_dag['totalPasos']}, orden: {len(global_dag['orden'])}",
        global_dag["totalPasos"] == total_elementos
        and len(global_dag["orden"]) == total_elementos,
    )
    verificar(
        "AC-F3-01 sin ciclos, bloqueados ni productos bloqueados",
        "ciclos, elementosBloqueados y productosBloqueados vacíos",
        (
            f"ciclos: {len(global_dag['ciclos'])}, "
            f"bloqueados: {len(global_dag['elementosBloqueados'])}, "
            f"productosBloqueados: {len(global_dag['productosBloqueados'])}"
        ),
        not global_dag["ciclos"]
        and not global_dag["elementosBloqueados"]
        and not global_dag["productosBloqueados"],
    )

    posicion = {paso["id"]: indice for indice, paso in enumerate(global_dag["orden"])}
    incumplidas = [
        (dependencia["origen"], dependencia["destino"])
        for dependencia in grafo["dependencias"]
        if not posicion[dependencia["origen"]] < posicion[dependencia["destino"]]
    ]
    verificar(
        "AC-F3-01 respeto estricto de precedencias origen habilita destino",
        "Toda arista origen -> destino cumple paso(origen) < paso(destino)",
        f"{len(incumplidas)} incumplidas de {total_dependencias}",
        not incumplidas,
    )

    respuestas = [llamar("GET", "/api/v1/orden-produccion")[1] for _ in range(10)]
    verificar(
        "AC-F3-02 determinismo en diez llamadas consecutivas",
        "Las diez respuestas son idénticas",
        "idénticas" if all(r == respuestas[0] for r in respuestas) else "difieren",
        all(r == respuestas[0] for r in respuestas),
    )

    # ------------------------------------------------------------------
    # AC-F3-05 / 05e / 08 — Plan de entrega y validación
    # ------------------------------------------------------------------
    estado, plan_mesa = llamar(
        "GET", "/api/v1/plan-entrega?productos=PROD-MESA-TRABAJO"
    )
    ids_mesa = ids_pasos(plan_mesa["pasos"]) if estado == 200 else []
    verificar(
        "AC-F3-05 plan de entrega de un producto planificable",
        "200, esPlanificable true y el producto aparece en el plan",
        (
            f"{estado}, esPlanificable: {plan_mesa.get('esPlanificable')}, "
            f"pasos: {plan_mesa.get('totalPasos')}"
        ),
        estado == 200
        and plan_mesa["esPlanificable"] is True
        and plan_mesa["productos"][0]["estado"] == "PLANIFICABLE"
        and "PROD-MESA-TRABAJO" in ids_mesa,
    )
    verificar(
        "AC-F3-05 el plan respeta todas las precedencias del subgrafo",
        "Toda arista entre pasos del plan cumple origen antes que destino",
        "sin incumplimientos",
        all(
            ids_mesa.index(dependencia["origen"]) < ids_mesa.index(dependencia["destino"])
            for dependencia in grafo["dependencias"]
            if dependencia["origen"] in ids_mesa and dependencia["destino"] in ids_mesa
        ),
    )

    estado_a, plan_a = llamar(
        "GET", "/api/v1/plan-entrega?productos=PROD-ESCRITORIO,PROD-MESA-TRABAJO"
    )
    estado_b, plan_b = llamar(
        "GET", "/api/v1/plan-entrega?productos=PROD-MESA-TRABAJO,PROD-ESCRITORIO"
    )
    verificar(
        "AC-F3-05e el orden de la selección no altera el plan",
        "Misma respuesta con la selección invertida",
        "idénticas" if plan_a == plan_b else "difieren",
        estado_a == estado_b == 200 and plan_a == plan_b,
    )

    estado_norm, plan_norm = llamar(
        "GET", "/api/v1/plan-entrega?productos=prod-mesa-trabajo,PROD-MESA-TRABAJO"
    )
    verificar(
        "AC-F3-08e normaliza mayúsculas y deduplica la selección",
        "Un único producto y el mismo plan que PROD-MESA-TRABAJO",
        f"{estado_norm}, productos: {[p['id'] for p in plan_norm.get('productos', [])]}",
        estado_norm == 200
        and [p["id"] for p in plan_norm["productos"]] == ["PROD-MESA-TRABAJO"]
        and plan_norm["totalPasos"] == plan_mesa["totalPasos"],
    )

    validaciones = (
        ("AC-F3-08 producto inexistente", "?productos=PROD-NOEXISTE", 404, "ELEMENTO_NO_ENCONTRADO"),
        ("AC-F3-08b elemento que no es producto", "?productos=INS-TORNILLO", 422, "VALIDACION_FALLIDA"),
        ("AC-F3-08c lista vacía", "?productos=", 422, "VALIDACION_FALLIDA"),
        ("AC-F3-08c parámetro ausente", "", 422, "VALIDACION_FALLIDA"),
        ("AC-F3-08d identificador mal formado", "?productos=xx", 422, "IDENTIFICADOR_INVALIDO"),
        (
            "AC-F3-08f mezcla válida e inválida falla completa",
            "?productos=PROD-MESA-TRABAJO,INS-TORNILLO",
            422,
            "VALIDACION_FALLIDA",
        ),
    )
    for nombre, consulta, codigo_esperado, codigo_error in validaciones:
        estado, cuerpo = llamar("GET", f"/api/v1/plan-entrega{consulta}")
        obtenido = cuerpo.get("error", {}).get("codigo") if isinstance(cuerpo, dict) else None
        verificar(
            nombre,
            f"{codigo_esperado} {codigo_error} sin plan parcial",
            f"{estado} {obtenido}",
            estado == codigo_esperado
            and obtenido == codigo_error
            and not (isinstance(cuerpo, dict) and "pasos" in cuerpo),
        )

    # ------------------------------------------------------------------
    # AC-F3-03 / 03b / 04 / 06 / 07 — Ciclos y aislamiento por subgrafo
    # ------------------------------------------------------------------
    crear_ciclo()
    try:
        estado, global_ciclo = llamar("GET", "/api/v1/orden-produccion")
        secuencias = [ciclo["secuencia"] for ciclo in global_ciclo.get("ciclos", [])]
        verificar(
            "AC-F3-03 con ciclo responde 200, esDag false y sin orden parcial",
            "200, esDag false, orden [] y totalPasos 0",
            (
                f"{estado}, esDag: {global_ciclo.get('esDag')}, "
                f"orden: {len(global_ciclo.get('orden', []))}, "
                f"totalPasos: {global_ciclo.get('totalPasos')}"
            ),
            estado == 200
            and global_ciclo["esDag"] is False
            and global_ciclo["orden"] == []
            and global_ciclo["totalPasos"] == 0,
        )
        verificar(
            "AC-F3-03 el ciclo se reporta como secuencia cerrada",
            f"Secuencia {DESTINO_CICLO} -> {ORIGEN_CICLO} -> {DESTINO_CICLO}",
            secuencias,
            [DESTINO_CICLO, ORIGEN_CICLO, DESTINO_CICLO] in secuencias,
        )
        bloqueados = set(global_ciclo.get("elementosBloqueados", []))
        verificar(
            "AC-F3-03b los requisitos previos del ciclo no quedan bloqueados",
            "PROC-CORTE-MADERA e INS-TABLERO fuera de elementosBloqueados",
            sorted(bloqueados),
            "PROC-CORTE-MADERA" not in bloqueados and "INS-TABLERO" not in bloqueados,
        )
        verificar(
            "AC-F3-04 la rama de madera queda bloqueada y la de acero planificable",
            "PROD-ESCRITORIO y PROD-REPISA bloqueados; PROD-MESA-TRABAJO planificable",
            (
                f"bloqueados: {global_ciclo.get('productosBloqueados')}, "
                f"planificables: {global_ciclo.get('productosPlanificables')}"
            ),
            {"PROD-ESCRITORIO", "PROD-REPISA"}
            <= set(global_ciclo.get("productosBloqueados", []))
            and global_ciclo.get("productosPlanificables") == ["PROD-MESA-TRABAJO"],
        )

        estado, plan_bloqueado = llamar(
            "GET", "/api/v1/plan-entrega?productos=PROD-ESCRITORIO"
        )
        verificar(
            "AC-F3-06 producto bloqueado responde 200 sin pasos",
            "200, esPlanificable false, estado BLOQUEADO y pasos []",
            (
                f"{estado}, esPlanificable: {plan_bloqueado.get('esPlanificable')}, "
                f"estado: {plan_bloqueado.get('productos', [{}])[0].get('estado')}, "
                f"pasos: {plan_bloqueado.get('totalPasos')}"
            ),
            estado == 200
            and plan_bloqueado["esPlanificable"] is False
            and plan_bloqueado["productos"][0]["estado"] == "BLOQUEADO"
            and plan_bloqueado["pasos"] == [],
        )

        estado, plan_aislado = llamar(
            "GET", "/api/v1/plan-entrega?productos=PROD-MESA-TRABAJO"
        )
        verificar(
            "AC-F3-07 un ciclo en otra rama no bloquea el plan solicitado",
            "200, esPlanificable true, sin ciclos ni bloqueados",
            (
                f"{estado}, esPlanificable: {plan_aislado.get('esPlanificable')}, "
                f"ciclos: {len(plan_aislado.get('ciclos', []))}, "
                f"bloqueados: {len(plan_aislado.get('elementosBloqueados', []))}"
            ),
            estado == 200
            and plan_aislado["esPlanificable"] is True
            and plan_aislado["ciclos"] == []
            and plan_aislado["elementosBloqueados"] == [],
        )
    finally:
        eliminar_ciclo()

    # ------------------------------------------------------------------
    # AC-F3-12 — Rendimiento sobre el catálogo de demostración
    # ------------------------------------------------------------------
    duraciones_global = []
    duraciones_plan = []
    for _ in range(5):
        inicio = time.perf_counter()
        llamar("GET", "/api/v1/orden-produccion")
        duraciones_global.append((time.perf_counter() - inicio) * 1000)

        inicio = time.perf_counter()
        llamar("GET", "/api/v1/plan-entrega?productos=PROD-ESCRITORIO,PROD-MESA-TRABAJO")
        duraciones_plan.append((time.perf_counter() - inicio) * 1000)

    verificar(
        "AC-F3-12 diagnóstico y plan responden en menos de 100 ms",
        "Máximo de 5 llamadas < 100 ms",
        (
            f"diagnóstico: {max(duraciones_global):.1f} ms, "
            f"plan: {max(duraciones_plan):.1f} ms"
        ),
        max(duraciones_global) < 100.0 and max(duraciones_plan) < 100.0,
    )

    # ------------------------------------------------------------------
    # Resumen
    # ------------------------------------------------------------------
    aprobados = sum(1 for _, _, _, paso in resultados if paso)
    print()
    print("=" * 70)
    print(f"RESUMEN: {aprobados}/{len(resultados)} escenarios PASARON")
    print("=" * 70)
    return 0 if aprobados == len(resultados) else 1


if __name__ == "__main__":
    sys.exit(main())
