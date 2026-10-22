"""RF-F1-10/15/16 · Representación del grafo, grafo propio y ausencia de ciclos en F1.

Cubre AC-F1-10, AC-F1-10b, AC-F1-10c, AC-F1-15 (verificable en ejecución),
AC-F1-16, AC-F1-16b.
"""

import ast
from pathlib import Path

from fastapi.testclient import TestClient

from .conftest import registrar_dependencia, registrar_elemento

RAIZ_BACKEND = Path(__file__).resolve().parents[1]

#: Bibliotecas de grafos prohibidas por AGENTS.md y RNF-F1-03.
BIBLIOTECAS_DE_GRAFOS_PROHIBIDAS = {
    "networkx",
    "igraph",
    "graph_tool",
    "pygraphviz",
    "pydot",
    "graphviz",
}


def test_ac_f1_10_grafo_refleja_elementos_y_dependencias_del_catalogo(cliente: TestClient) -> None:
    grafo = cliente.get("/api/v1/grafo")

    assert grafo.status_code == 200
    cuerpo = grafo.json()
    elementos = cliente.get("/api/v1/elementos").json()
    dependencias = cliente.get("/api/v1/dependencias").json()

    assert cuerpo["elementos"] == elementos["elementos"]
    assert cuerpo["dependencias"] == dependencias["dependencias"]
    assert cuerpo["resumen"]["totalElementos"] == len(cuerpo["elementos"]) == 6
    assert cuerpo["resumen"]["totalDependencias"] == len(cuerpo["dependencias"]) == 6


def test_ac_f1_10_grafo_refleja_el_catalogo_tras_cada_alta(cliente_vacio: TestClient) -> None:
    registrar_elemento(cliente_vacio, "INS-A1", "INSUMO", "Insumo A")
    registrar_elemento(cliente_vacio, "PROD-B1", "PRODUCTO", "Producto B")
    registrar_dependencia(cliente_vacio, "INS-A1", "PROD-B1")

    grafo = cliente_vacio.get("/api/v1/grafo").json()

    assert grafo["resumen"] == {"totalElementos": 2, "totalDependencias": 1}
    assert [e["id"] for e in grafo["elementos"]] == ["INS-A1", "PROD-B1"]


def test_ac_f1_10b_no_hay_nodos_derivados_de_dependencias(cliente_vacio: TestClient) -> None:
    registrar_dependencia(cliente_vacio, "INS-FANTASMA", "PROD-TAMBIEN-NO")

    grafo = cliente_vacio.get("/api/v1/grafo").json()

    assert grafo["elementos"] == []
    assert grafo["dependencias"] == []
    ids_listado = {e["id"] for e in cliente_vacio.get("/api/v1/elementos").json()["elementos"]}
    assert ids_listado == {e["id"] for e in grafo["elementos"]}


def test_ac_f1_10b_toda_dependencia_referencia_elementos_presentes(cliente: TestClient) -> None:
    grafo = cliente.get("/api/v1/grafo").json()
    ids = {e["id"] for e in grafo["elementos"]}

    assert grafo["dependencias"]
    for dependencia in grafo["dependencias"]:
        assert dependencia["origen"] in ids
        assert dependencia["destino"] in ids
        assert dependencia["origen"] != dependencia["destino"]


def test_ac_f1_10c_el_grafo_no_incluye_recorridos_niveles_ciclos_ni_ordenes(cliente: TestClient) -> None:
    cuerpo = cliente.get("/api/v1/grafo").json()

    assert set(cuerpo) == {"elementos", "dependencias", "resumen"}
    assert set(cuerpo["resumen"]) == {"totalElementos", "totalDependencias"}
    claves_prohibidas = {
        "impacto",
        "alcance",
        "niveles",
        "nivel",
        "ciclos",
        "ciclo",
        "orden",
        "ordenProduccion",
        "recorridos",
        "advertencias",
        "advertencia",
        "tieneCiclo",
    }
    assert claves_prohibidas.isdisjoint(cuerpo)
    assert claves_prohibidas.isdisjoint(cuerpo["resumen"])
    for dependencia in cuerpo["dependencias"]:
        assert set(dependencia) == {"origen", "destino", "tipoRelacion"}


def test_ac_f1_16_un_ciclo_se_registra_integralmente_sin_error(cliente_vacio: TestClient) -> None:
    for id_valor, tipo in (
        ("INS-C1", "INSUMO"),
        ("PROC-C2", "PROCESO"),
        ("PROD-C3", "PRODUCTO"),
    ):
        assert registrar_elemento(cliente_vacio, id_valor, tipo, f"Elemento {id_valor}").status_code == 201

    respuestas = [
        registrar_dependencia(cliente_vacio, "INS-C1", "PROC-C2"),
        registrar_dependencia(cliente_vacio, "PROC-C2", "PROD-C3"),
        registrar_dependencia(cliente_vacio, "PROD-C3", "INS-C1"),
    ]

    assert [respuesta.status_code for respuesta in respuestas] == [201, 201, 201]

    grafo = cliente_vacio.get("/api/v1/grafo").json()
    pares = {(d["origen"], d["destino"]) for d in grafo["dependencias"]}
    assert pares == {("INS-C1", "PROC-C2"), ("PROC-C2", "PROD-C3"), ("PROD-C3", "INS-C1")}
    assert grafo["resumen"]["totalDependencias"] == 3


def test_ac_f1_16b_el_grafo_con_ciclo_no_lleva_advertencias_ni_veredictos(
    cliente_vacio: TestClient,
) -> None:
    for id_valor in ("INS-C1", "PROD-C2"):
        registrar_elemento(cliente_vacio, id_valor, "INSUMO", f"Elemento {id_valor}")
    registrar_dependencia(cliente_vacio, "INS-C1", "PROD-C2")
    registrar_dependencia(cliente_vacio, "PROD-C2", "INS-C1")

    grafo = cliente_vacio.get("/api/v1/grafo").json()
    listado = cliente_vacio.get("/api/v1/dependencias").json()

    for respuesta in (grafo, listado):
        assert "advertencias" not in respuesta
        assert "errores" not in respuesta
        assert "ciclo" not in str(respuesta).lower()
    assert grafo["resumen"] == {"totalElementos": 2, "totalDependencias": 2}


def test_ac_f1_15_el_grafo_se_implementa_sin_biblioteca_de_grafos() -> None:
    """AC-F1-15 / RNF-F1-03: sin NetworkX ni otra biblioteca de grafos."""
    modulos_importados: set[str] = set()
    for ruta in (RAIZ_BACKEND / "app").rglob("*.py"):
        arbol = ast.parse(ruta.read_text(encoding="utf-8"))
        for nodo in ast.walk(arbol):
            if isinstance(nodo, ast.Import):
                modulos_importados.update(alias.name.split(".")[0] for alias in nodo.names)
            elif isinstance(nodo, ast.ImportFrom) and nodo.module and nodo.level == 0:
                modulos_importados.add(nodo.module.split(".")[0])

    assert modulos_importados.isdisjoint(BIBLIOTECAS_DE_GRAFOS_PROHIBIDAS)


def test_ac_f1_15_la_representacion_del_grafo_vive_en_el_dominio() -> None:
    """La estructura de adyacencias está en la capa de dominio."""
    catalogo = (RAIZ_BACKEND / "app" / "dominio" / "catalogo.py").read_text(encoding="utf-8")

    assert "class Catalogo" in catalogo
    assert "_adyacencia_salida" in catalogo
    assert "_adyacencia_entrada" in catalogo


def test_ac_f1_15b_el_dominio_no_importa_el_framework_http_ni_la_persistencia() -> None:
    """AC-F1-15b / RNF-Q-01: el dominio no depende de fuera."""
    prohibidos = {
        "fastapi",
        "starlette",
        "pydantic",
        "uvicorn",
        "httpx",
        "requests",
        "sqlalchemy",
        "sqlite3",
    }
    for ruta in (RAIZ_BACKEND / "app" / "dominio").rglob("*.py"):
        arbol = ast.parse(ruta.read_text(encoding="utf-8"))
        for nodo in ast.walk(arbol):
            if isinstance(nodo, ast.Import):
                importados = {alias.name.split(".")[0] for alias in nodo.names}
                assert importados.isdisjoint(prohibidos), f"{ruta.name}: {importados & prohibidos}"
            elif isinstance(nodo, ast.ImportFrom) and nodo.module and nodo.level == 0:
                assert nodo.module.split(".")[0] not in prohibidos, f"{ruta.name}: {nodo.module}"
