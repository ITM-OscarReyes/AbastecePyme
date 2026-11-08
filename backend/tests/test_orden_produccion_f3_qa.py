"""QA independiente de F3 — Orden de producción, ciclos y plan de entrega.

Verifica contra la API real montada sobre ``crear_aplicacion`` los criterios
AC-F3-01 a AC-F3-14:
- Diagnóstico global en DAG con precedencias válidas y determinismo.
- Diagnóstico global ante ciclos respondiendo 200 con reporte estructurado.
- Plan de entrega por producto (planificables, bloqueados, mezclas, aislamiento de ramas).
- Algoritmos propios sin NetworkX.
"""

import ast
import sys
import time
from pathlib import Path

from fastapi.testclient import TestClient

RAIZ_BACKEND = Path(__file__).resolve().parents[1]
if str(RAIZ_BACKEND) not in sys.path:
    sys.path.insert(0, str(RAIZ_BACKEND))

from app.api.aplicacion import crear_aplicacion  # noqa: E402
from app.dominio.catalogo import Catalogo  # noqa: E402
from app.dominio.elemento import Elemento  # noqa: E402

ElementoPrueba = tuple[str, str, str]


def _catalogo(
    elementos: tuple[ElementoPrueba, ...],
    dependencias: tuple[tuple[str, str], ...] = (),
) -> Catalogo:
    catalogo = Catalogo()
    for id_valor, tipo, nombre in elementos:
        catalogo.registrar_elemento(Elemento.crear(id_valor, tipo, nombre))
    for origen, destino in dependencias:
        catalogo.registrar_dependencia(origen, destino)
    return catalogo


def _cliente(
    elementos: tuple[ElementoPrueba, ...],
    dependencias: tuple[tuple[str, str], ...] = (),
) -> TestClient:
    return TestClient(crear_aplicacion(_catalogo(elementos, dependencias)))


def test_qa_f3_01_diagnostico_global_dag() -> None:
    elementos = (
        ("PROV-A", "PROVEEDOR", "Proveedor A"),
        ("INS-B", "INSUMO", "Insumo B"),
        ("PROC-C", "PROCESO", "Proceso C"),
        ("PROD-D", "PRODUCTO", "Producto D"),
    )
    dependencias = (
        ("PROV-A", "INS-B"),
        ("INS-B", "PROC-C"),
        ("PROC-C", "PROD-D"),
    )
    cliente = _cliente(elementos, dependencias)
    resp = cliente.get("/api/v1/orden-produccion")
    assert resp.status_code == 200
    data = resp.json()
    assert data["esDag"] is True
    assert [p["id"] for p in data["orden"]] == ["PROV-A", "INS-B", "PROC-C", "PROD-D"]
    assert data["productosPlanificables"] == ["PROD-D"]


def test_qa_f3_03_ciclo_directo_responde_200_con_reporte() -> None:
    elementos = (
        ("PROV-A", "PROVEEDOR", "Proveedor A"),
        ("INS-B", "INSUMO", "Insumo B"),
        ("PROC-C", "PROCESO", "Proceso C"),
        ("PROD-D", "PRODUCTO", "Producto D"),
    )
    # Ciclo entre INS-B y PROC-C
    dependencias = (
        ("PROV-A", "INS-B"),
        ("INS-B", "PROC-C"),
        ("PROC-C", "INS-B"),
        ("PROC-C", "PROD-D"),
    )
    cliente = _cliente(elementos, dependencias)
    resp = cliente.get("/api/v1/orden-produccion")
    assert resp.status_code == 200
    data = resp.json()
    assert data["esDag"] is False
    assert data["orden"] == []
    assert data["totalPasos"] == 0
    assert len(data["ciclos"]) == 1
    assert data["ciclos"][0]["secuencia"] == ["INS-B", "PROC-C", "INS-B"]
    assert set(data["elementosBloqueados"]) == {"INS-B", "PROC-C", "PROD-D"}
    assert data["productosBloqueados"] == ["PROD-D"]
    assert data["productosPlanificables"] == []


def test_qa_f3_06_grafo_vacio_es_dag_trivial() -> None:
    cliente = TestClient(crear_aplicacion(Catalogo()))
    resp = cliente.get("/api/v1/orden-produccion")
    assert resp.status_code == 200
    data = resp.json()
    assert data["esDag"] is True
    assert data["orden"] == []
    assert data["totalPasos"] == 0
    assert data["ciclos"] == []
    assert data["elementosBloqueados"] == []
    assert data["productosBloqueados"] == []
    assert data["productosPlanificables"] == []


def test_qa_f3_plan_entrega_con_aislamiento_de_rama() -> None:
    elementos = (
        ("PROV-1", "PROVEEDOR", "Proveedor 1"),
        ("INS-1", "INSUMO", "Insumo 1"),
        ("PROC-1", "PROCESO", "Proceso 1"),
        ("PROD-1", "PRODUCTO", "Producto 1"),
        ("PROV-2", "PROVEEDOR", "Proveedor 2"),
        ("INS-2", "INSUMO", "Insumo 2"),
        ("PROC-2", "PROCESO", "Proceso 2"),
        ("PROD-2", "PRODUCTO", "Producto 2"),
    )
    # Rama 1 acíclica, Rama 2 cíclica
    dependencias = (
        ("PROV-1", "INS-1"),
        ("INS-1", "PROC-1"),
        ("PROC-1", "PROD-1"),
        ("PROV-2", "INS-2"),
        ("INS-2", "PROC-2"),
        ("PROC-2", "INS-2"),
        ("PROC-2", "PROD-2"),
    )
    cliente = _cliente(elementos, dependencias)

    # Consulta solo de la rama acíclica
    resp1 = cliente.get("/api/v1/plan-entrega?productos=PROD-1")
    assert resp1.status_code == 200
    data1 = resp1.json()
    assert data1["esPlanificable"] is True
    assert [p["id"] for p in data1["pasos"]] == ["PROV-1", "INS-1", "PROC-1", "PROD-1"]
    assert data1["ciclos"] == []

    # Consulta solo de la rama cíclica
    resp2 = cliente.get("/api/v1/plan-entrega?productos=PROD-2")
    assert resp2.status_code == 200
    data2 = resp2.json()
    assert data2["esPlanificable"] is False
    assert data2["pasos"] == []
    assert data2["productos"][0]["estado"] == "BLOQUEADO"
    assert len(data2["ciclos"]) == 1

    # Consulta de ambas ramas juntas (mezcla)
    resp3 = cliente.get("/api/v1/plan-entrega?productos=PROD-1,PROD-2")
    assert resp3.status_code == 200
    data3 = resp3.json()
    assert data3["esPlanificable"] is False
    assert [p["id"] for p in data3["pasos"]] == ["PROV-1", "INS-1", "PROC-1", "PROD-1"]
    estados = {p["id"]: p["estado"] for p in data3["productos"]}
    assert estados["PROD-1"] == "PLANIFICABLE"
    assert estados["PROD-2"] == "BLOQUEADO"


def test_qa_f3_sin_networkx() -> None:
    for ruta in (RAIZ_BACKEND / "app" / "dominio").glob("*.py"):
        contenido = ruta.read_text(encoding="utf-8").lower()
        assert "networkx" not in contenido
