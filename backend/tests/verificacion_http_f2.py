"""Verificación de extremo a extremo de F2 (Análisis de impacto) contra servidor HTTP real.

Comprueba el contrato de F2 contra el servidor levantado con ``uvicorn app.main:app``,
que es el proceso que consume el frontend (C-02, AC-F1-24). Uso:

    python tests/verificacion_http_f2.py [http://127.0.0.1:8000]

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
    # 1. AC-F2-01: Impacto de PROV-ACERO devuelve 5 afectados
    estado, cuerpo = llamar("GET", "/api/v1/impacto/PROV-ACERO")
    comprobar(
        "AC-F2-01 GET /impacto/PROV-ACERO responde 200",
        "200",
        str(estado),
        estado == 200,
    )
    afectados_ids = [e["id"] for e in cuerpo.get("afectados", [])]
    comprobar(
        "AC-F2-01 PROV-ACERO afecta a sus dos suministros, al proceso y a los dos productos",
        "5 afectados: INS-BARRA, INS-TORNILLO, PROC-CORTE, PROD-BANCO, PROD-PANEL",
        f"{cuerpo.get('total')} afectados: {afectados_ids}",
        cuerpo.get("total") == 5
        and afectados_ids
        == ["INS-BARRA", "INS-TORNILLO", "PROC-CORTE", "PROD-BANCO", "PROD-PANEL"],
    )

    # 2. AC-F2-01b: un producto es terminal y no afecta a otros elementos
    estado, cuerpo = llamar("GET", "/api/v1/impacto/PROD-PANEL")
    afectados_panel = [e["id"] for e in cuerpo.get("afectados", [])]
    comprobar(
        "AC-F2-01b PROD-PANEL es terminal y no invierte el grafo",
        "0 afectados (sin PROC-CORTE ni INS-BARRA ni PROV-ACERO)",
        f"{cuerpo.get('total')} afectados: {afectados_panel}",
        estado == 200
        and cuerpo.get("total") == 0
        and afectados_panel == []
        and "PROC-CORTE" not in afectados_panel
        and "INS-BARRA" not in afectados_panel
        and "PROV-ACERO" not in afectados_panel,
    )

    # 3. AC-F2-02: Todos los tipos alcanzados son afectados
    estado, cuerpo = llamar("GET", "/api/v1/impacto/PROV-ACERO")
    tipos_afectados = {e["tipo"] for e in cuerpo.get("afectados", [])}
    comprobar(
        "AC-F2-02 alcanzar no filtra por tipo: incluye INSUMO, PROCESO y PRODUCTO",
        "{'INSUMO', 'PROCESO', 'PRODUCTO'}",
        str(tipos_afectados),
        tipos_afectados == {"INSUMO", "PROCESO", "PRODUCTO"},
    )

    # 4. AC-F2-03: Elemento inexistente con formato válido -> 404 ERR-02
    estado, cuerpo = llamar("GET", "/api/v1/impacto/INS-INEXISTENTE")
    comprobar(
        "AC-F2-03 elemento inexistente responde 404 ERR-02",
        "404 con error.codigo ELEMENTO_NO_ENCONTRADO",
        f"{estado} con {cuerpo.get('error', {}).get('codigo')}",
        estado == 404 and cuerpo.get("error", {}).get("codigo") == "ELEMENTO_NO_ENCONTRADO",
    )
    comprobar(
        "AC-F2-03 respuesta de error 404 no incluye datos de negocio",
        "sin elemento, sin afectados, sin total",
        f"claves: {list(cuerpo.keys())}",
        "elemento" not in cuerpo and "afectados" not in cuerpo and "total" not in cuerpo,
    )

    # 5. AC-F2-04: PROD-BANCO existe y no habilita a nadie -> 200, total 0
    estado, cuerpo = llamar("GET", "/api/v1/impacto/PROD-BANCO")
    comprobar(
        "AC-F2-04 elemento existente sin dependencias responde 200 con total 0",
        "200 con elemento PROD-BANCO, total: 0 y afectados: []",
        f"{estado} con total {cuerpo.get('total')} y afectados {cuerpo.get('afectados')}",
        estado == 200
        and cuerpo.get("elemento", {}).get("id") == "PROD-BANCO"
        and cuerpo.get("total") == 0
        and cuerpo.get("afectados") == [],
    )

    # 6. AC-F2-05: INS-BARRA afecta directa e indirectamente
    estado, cuerpo = llamar("GET", "/api/v1/impacto/INS-BARRA")
    afectados_barra = [e["id"] for e in cuerpo.get("afectados", [])]
    comprobar(
        "AC-F2-05 INS-BARRA afecta PROC-CORTE (directo) y PROD-PANEL, PROD-BANCO (indirectos)",
        "total 3 con PROC-CORTE, PROD-BANCO, PROD-PANEL",
        f"{cuerpo.get('total')} con {afectados_barra}",
        estado == 200
        and cuerpo.get("total") == 3
        and set(afectados_barra) == {"PROC-CORTE", "PROD-PANEL", "PROD-BANCO"},
    )

    # 7. AC-F2-05b: Múltiples caminos sin duplicados
    estado, cuerpo = llamar("GET", "/api/v1/impacto/INS-TORNILLO")
    afectados_tornillo = [e["id"] for e in cuerpo.get("afectados", [])]
    comprobar(
        "AC-F2-05b elemento alcanzable por múltiples caminos aparece una sola vez",
        "total 3 y PROD-BANCO aparece exactamente una vez",
        f"total {cuerpo.get('total')} con repeticiones {afectados_tornillo.count('PROD-BANCO')}",
        estado == 200
        and cuerpo.get("total") == 3
        and afectados_tornillo.count("PROD-BANCO") == 1
        and set(afectados_tornillo) == {"PROC-CORTE", "PROD-PANEL", "PROD-BANCO"},
    )

    # 8. AC-F2-11: Identificador mal formado responde 422 ERR-05
    estado, cuerpo = llamar("GET", "/api/v1/impacto/xx")
    comprobar(
        "AC-F2-11 id mal formado en la ruta responde 422 ERR-05 nunca 404",
        "422 con error.codigo IDENTIFICADOR_INVALIDO",
        f"{estado} con {cuerpo.get('error', {}).get('codigo')}",
        estado == 422 and cuerpo.get("error", {}).get("codigo") == "IDENTIFICADOR_INVALIDO",
    )

    # 9. AC-F2-13: Determinismo y orden ascendente por id
    e1, c1 = llamar("GET", "/api/v1/impacto/INS-BARRA")
    e2, c2 = llamar("GET", "/api/v1/impacto/INS-BARRA")
    afectados_c1 = [e["id"] for e in c1.get("afectados", [])]
    comprobar(
        "AC-F2-13 dos consultas idénticas devuelven misma respuesta en orden id ascendente",
        "respuestas idénticas y orden ordenado ascendente",
        f"iguales: {c1 == c2}, ordenado: {afectados_c1 == sorted(afectados_c1)}",
        c1 == c2 and afectados_c1 == sorted(afectados_c1),
    )

    # 10. AC-F2-14: Sin información de ciclos ni de orden
    texto_respuesta = json.dumps(c1).lower()
    claves_prohibidas = [
        "ciclos", "ciclo", "tieneciclo", "orden", "ordenproduccion", "nivel", "niveles"
    ]
    encontradas = [k for k in claves_prohibidas if f'"{k}"' in texto_respuesta]
    comprobar(
        "AC-F2-14 la respuesta no incluye campos de ciclo ni de orden",
        "sin campos prohibidos",
        f"encontradas: {encontradas}" if encontradas else "sin campos prohibidos",
        not encontradas,
    )

    # 11. Normalización de id en minúsculas en la ruta
    estado, cuerpo = llamar("GET", "/api/v1/impacto/prov-acero")
    comprobar(
        "Normalización de id en minúsculas responde 200 con elemento PROV-ACERO",
        "200 con elemento.id PROV-ACERO",
        f"{estado} con elemento.id {cuerpo.get('elemento', {}).get('id')}",
        estado == 200 and cuerpo.get("elemento", {}).get("id") == "PROV-ACERO",
    )

    # 12. AC-F2-05c: con ciclo, el recorrido termina sin duplicados
    # Un proceso puede generar un suministro y ese suministro alimentar al proceso.
    estado_dep, _ = llamar(
        "POST", "/api/v1/dependencias", {"origen": "PROC-CORTE", "destino": "INS-BARRA"}
    )
    comprobar(
        "AC-F2-05c el sistema admite una relación cíclica proceso ↔ suministro",
        "201",
        str(estado_dep),
        estado_dep == 201,
    )

    estado_ciclo, cuerpo_ciclo = llamar("GET", "/api/v1/impacto/INS-BARRA")
    afectados_ciclo = [e["id"] for e in cuerpo_ciclo.get("afectados", [])]
    comprobar(
        "AC-F2-05c con ciclo el recorrido termina y devuelve alcanzables sin duplicar",
        "total 3 con PROC-CORTE, PROD-BANCO, PROD-PANEL (sin duplicados)",
        f"total {cuerpo_ciclo.get('total')} con {afectados_ciclo}",
        estado_ciclo == 200
        and len(afectados_ciclo) == len(set(afectados_ciclo))
        and set(afectados_ciclo) == {"PROC-CORTE", "PROD-PANEL", "PROD-BANCO"},
    )

    # 13. AC-F2-15: README documenta qué significa alcanzar
    raiz_proyecto = Path(__file__).resolve().parents[2]
    readme = (raiz_proyecto / "README.md").read_text(encoding="utf-8").lower()
    comprobar(
        "AC-F2-15 README.md explica qué significa 'alcanzar' en este negocio",
        "explicación con camino dirigido, origen habilita destino y ejemplo sintético",
        "presente en README.md",
        "alcanzar" in readme and "camino dirigido" in readme and "prov-acero" in readme,
    )

    # Resumen
    print("\n" + "=" * 70)
    print("VERIFICACIÓN DE CRITERIOS DE ACEPTACIÓN — F2 (ANÁLISIS DE IMPACTO)")
    print("=" * 70)
    for escenario, esperado, obtenido, condicion in resultados:
        marca = "PASÓ" if condicion else "FALLÓ"
        print(f"[{marca}] {escenario}")
        print(f"        esperado: {esperado}")
        print(f"        obtenido: {obtenido}")

    fallos = [r for r in resultados if not r[3]]
    print("\n" + "-" * 70)
    print(f"Total escenarios F2: {len(resultados)} · PASÓ: {len(resultados) - len(fallos)} · FALLÓ: {len(fallos)}")
    print("-" * 70)
    return 1 if fallos else 0


if __name__ == "__main__":
    raise SystemExit(main())
