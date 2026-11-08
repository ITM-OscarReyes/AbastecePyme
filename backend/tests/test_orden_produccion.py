"""RF-F3-01 a RF-F3-10 · Orden de producción, ciclos y plan de entrega (F3).

Cubre AC-F3-01 a AC-F3-14 según el contrato actualizado de `api-contract.md` §3.7 y §3.8
y `acceptance-criteria.md` §8.

Los datos de prueba respetan la matriz de tipos vigente:
  ('PROVEEDOR', 'INSUMO')
  ('INSUMO', 'PROCESO')
  ('PROCESO', 'INSUMO')
  ('PROCESO', 'PRODUCTO')

Conjunto A — base acíclica:
  PROV-ACERO -> INS-BARRA -> PROC-CORTE -> PROD-PANEL
  PROV-ACERO -> INS-TORNILLO -> PROC-CORTE -> PROD-BANCO
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
from app.dominio.tipo_elemento import TipoElemento  # noqa: E402

ELEMENTOS_PRUEBA: tuple[tuple[str, str, str], ...] = (
    ("PROV-ACERO", "PROVEEDOR", "Proveedor de acero"),
    ("INS-BARRA", "INSUMO", "Barra de acero"),
    ("INS-TORNILLO", "INSUMO", "Tornillo hexagonal M6"),
    ("PROC-CORTE", "PROCESO", "Corte de panel"),
    ("PROD-PANEL", "PRODUCTO", "Panel de montaje"),
    ("PROD-BANCO", "PRODUCTO", "Banco de montaje"),
)

DEPENDENCIAS_PRUEBA: tuple[tuple[str, str], ...] = (
    ("PROV-ACERO", "INS-BARRA"),
    ("PROV-ACERO", "INS-TORNILLO"),
    ("INS-BARRA", "PROC-CORTE"),
    ("INS-TORNILLO", "PROC-CORTE"),
    ("PROC-CORTE", "PROD-PANEL"),
    ("PROC-CORTE", "PROD-BANCO"),
)

# Conjunto B — acero cíclico: A más PROC-CORTE -> INS-BARRA (ciclo de 2 nodos).
DEPENDENCIAS_CICLICAS: tuple[tuple[str, str], ...] = DEPENDENCIAS_PRUEBA + (
    ("PROC-CORTE", "INS-BARRA"),
)


def _cliente_con_datos(
    dependencias: tuple[tuple[str, str], ...] = DEPENDENCIAS_PRUEBA,
) -> TestClient:
    catalogo = Catalogo()
    for id_valor, tipo, nombre in ELEMENTOS_PRUEBA:
        catalogo.registrar_elemento(Elemento.crear(id_valor, tipo, nombre))
    for origen, destino in dependencias:
        catalogo.registrar_dependencia(origen, destino)
    return TestClient(crear_aplicacion(catalogo))


def _cliente_vacio() -> TestClient:
    return TestClient(crear_aplicacion(Catalogo()))


# ---------------------------------------------------------------------------
# Diagnóstico global de planta (GET /api/v1/orden-produccion)
# ---------------------------------------------------------------------------

def test_ac_f3_01_diagnostico_global_dag() -> None:
    cliente = _cliente_con_datos()
    respuesta = cliente.get("/api/v1/orden-produccion")

    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    assert cuerpo["esDag"] is True
    assert cuerpo["totalPasos"] == 6
    assert [p["id"] for p in cuerpo["orden"]] == [
        "PROV-ACERO",
        "INS-BARRA",
        "INS-TORNILLO",
        "PROC-CORTE",
        "PROD-BANCO",
        "PROD-PANEL",
    ]
    assert cuerpo["ciclos"] == []
    assert cuerpo["elementosBloqueados"] == []
    assert cuerpo["productosBloqueados"] == []
    assert cuerpo["productosPlanificables"] == ["PROD-BANCO", "PROD-PANEL"]


def test_ac_f3_01b_diagnostico_global_grafo_vacio() -> None:
    cliente = _cliente_vacio()
    respuesta = cliente.get("/api/v1/orden-produccion")

    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    assert cuerpo["esDag"] is True
    assert cuerpo["orden"] == []
    assert cuerpo["totalPasos"] == 0
    assert cuerpo["ciclos"] == []
    assert cuerpo["elementosBloqueados"] == []
    assert cuerpo["productosBloqueados"] == []
    assert cuerpo["productosPlanificables"] == []


def test_ac_f3_01c_elementos_aislados_quedan_incompletos() -> None:
    """Un producto sin proceso no puede planificarse y se reporta aparte."""
    catalogo = Catalogo()
    for id_valor in ("PROD-A", "PROD-B", "PROD-C"):
        catalogo.registrar_elemento(Elemento.crear(id_valor, "PRODUCTO", f"Prod {id_valor}"))
    cliente = TestClient(crear_aplicacion(catalogo))
    respuesta = cliente.get("/api/v1/orden-produccion")

    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    assert cuerpo["esDag"] is True
    assert cuerpo["totalPasos"] == 0
    assert cuerpo["orden"] == []
    assert cuerpo["productosPlanificables"] == []
    assert cuerpo["elementosIncompletos"] == ["PROD-A", "PROD-B", "PROD-C"]
    assert cuerpo["productosIncompletos"] == ["PROD-A", "PROD-B", "PROD-C"]


def test_ac_f3_02_determinismo_estricto_diez_llamadas() -> None:
    cliente = _cliente_con_datos()
    respuestas = [cliente.get("/api/v1/orden-produccion").json() for _ in range(10)]
    primera = respuestas[0]
    for r in respuestas[1:]:
        assert r == primera


def test_ac_f3_03_diagnostico_global_con_ciclo_responde_200() -> None:
    cliente = _cliente_con_datos(dependencias=DEPENDENCIAS_CICLICAS)
    respuesta = cliente.get("/api/v1/orden-produccion")

    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    assert cuerpo["esDag"] is False
    assert cuerpo["orden"] == []
    assert cuerpo["totalPasos"] == 0
    assert cuerpo["ciclos"] == [{"secuencia": ["INS-BARRA", "PROC-CORTE", "INS-BARRA"]}]
    assert cuerpo["elementosBloqueados"] == ["INS-BARRA", "PROC-CORTE", "PROD-BANCO", "PROD-PANEL"]
    assert cuerpo["productosBloqueados"] == ["PROD-BANCO", "PROD-PANEL"]
    assert cuerpo["productosPlanificables"] == []


def test_ac_f3_04_dos_ciclos_independientes_un_ciclo_por_scc() -> None:
    catalogo = Catalogo()
    for id_val, tipo, nom in ELEMENTOS_PRUEBA:
        catalogo.registrar_elemento(Elemento.crear(id_val, tipo, nom))
    for o, d in DEPENDENCIAS_CICLICAS:
        catalogo.registrar_dependencia(o, d)

    # Rama de madera cíclica
    catalogo.registrar_elemento(Elemento.crear("PROV-MADERA", "PROVEEDOR", "Madera"))
    catalogo.registrar_elemento(Elemento.crear("INS-TABLERO", "INSUMO", "Tablero"))
    catalogo.registrar_elemento(Elemento.crear("PROC-ENSAMBLE", "PROCESO", "Ensamble"))
    catalogo.registrar_elemento(Elemento.crear("PROD-ESCRITORIO", "PRODUCTO", "Escritorio"))

    catalogo.registrar_dependencia("PROV-MADERA", "INS-TABLERO")
    catalogo.registrar_dependencia("INS-TABLERO", "PROC-ENSAMBLE")
    catalogo.registrar_dependencia("PROC-ENSAMBLE", "INS-TABLERO")
    catalogo.registrar_dependencia("PROC-ENSAMBLE", "PROD-ESCRITORIO")

    cliente = TestClient(crear_aplicacion(catalogo))
    respuesta = cliente.get("/api/v1/orden-produccion")

    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    assert cuerpo["esDag"] is False
    # Un ciclo por SCC, ordenados por menor id: INS-BARRA antes de INS-TABLERO
    assert len(cuerpo["ciclos"]) == 2
    assert cuerpo["ciclos"][0]["secuencia"] == ["INS-BARRA", "PROC-CORTE", "INS-BARRA"]
    assert cuerpo["ciclos"][1]["secuencia"] == ["INS-TABLERO", "PROC-ENSAMBLE", "INS-TABLERO"]
    assert cuerpo["productosBloqueados"] == ["PROD-BANCO", "PROD-ESCRITORIO", "PROD-PANEL"]
    assert cuerpo["productosPlanificables"] == []


# ---------------------------------------------------------------------------
# Plan de entrega por producto (GET /api/v1/plan-entrega)
# ---------------------------------------------------------------------------

def test_ac_f3_05_plan_entrega_producto_planificable() -> None:
    cliente = _cliente_con_datos()
    respuesta = cliente.get("/api/v1/plan-entrega?productos=PROD-PANEL")

    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    assert cuerpo["esPlanificable"] is True
    assert cuerpo["productos"] == [
        {
            "id": "PROD-PANEL",
            "tipo": "PRODUCTO",
            "nombre": "Panel de montaje",
            "descripcion": None,
            "estado": "PLANIFICABLE",
        }
    ]
    assert [p["id"] for p in cuerpo["pasos"]] == [
        "PROV-ACERO",
        "INS-BARRA",
        "INS-TORNILLO",
        "PROC-CORTE",
        "PROD-PANEL",
    ]
    assert cuerpo["totalPasos"] == 5
    assert cuerpo["ciclos"] == []
    assert cuerpo["elementosBloqueados"] == []


def test_ac_f3_05b_plan_entrega_producto_aislado_queda_incompleto() -> None:
    catalogo = Catalogo()
    catalogo.registrar_elemento(Elemento.crear("PROD-SOLO", "PRODUCTO", "Producto Solo"))
    cliente = TestClient(crear_aplicacion(catalogo))
    respuesta = cliente.get("/api/v1/plan-entrega?productos=PROD-SOLO")

    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    assert cuerpo["esPlanificable"] is False
    assert cuerpo["totalPasos"] == 0
    assert cuerpo["pasos"] == []
    assert cuerpo["productos"][0]["estado"] == "INCOMPLETO"
    assert cuerpo["productosIncompletos"] == ["PROD-SOLO"]
    assert cuerpo["elementosIncompletos"] == ["PROD-SOLO"]


def test_ac_f3_05c_plan_entrega_multiples_productos() -> None:
    cliente = _cliente_con_datos()
    respuesta = cliente.get("/api/v1/plan-entrega?productos=PROD-PANEL,PROD-BANCO")

    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    assert cuerpo["esPlanificable"] is True
    assert len(cuerpo["productos"]) == 2
    assert cuerpo["totalPasos"] == 6
    assert [p["id"] for p in cuerpo["pasos"]] == [
        "PROV-ACERO",
        "INS-BARRA",
        "INS-TORNILLO",
        "PROC-CORTE",
        "PROD-BANCO",
        "PROD-PANEL",
    ]


def test_ac_f3_06_plan_entrega_producto_bloqueado() -> None:
    cliente = _cliente_con_datos(dependencias=DEPENDENCIAS_CICLICAS)
    respuesta = cliente.get("/api/v1/plan-entrega?productos=PROD-PANEL")

    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    assert cuerpo["esPlanificable"] is False
    assert cuerpo["productos"] == [
        {
            "id": "PROD-PANEL",
            "tipo": "PRODUCTO",
            "nombre": "Panel de montaje",
            "descripcion": None,
            "estado": "BLOQUEADO",
        }
    ]
    assert cuerpo["pasos"] == []
    assert cuerpo["totalPasos"] == 0
    assert cuerpo["ciclos"] == [{"secuencia": ["INS-BARRA", "PROC-CORTE", "INS-BARRA"]}]
    assert cuerpo["elementosBloqueados"] == ["INS-BARRA", "PROC-CORTE", "PROD-PANEL"]


def test_ac_f3_06b_plan_entrega_mezcla_planificable_y_bloqueado() -> None:
    catalogo = Catalogo()
    for id_val, tipo, nom in ELEMENTOS_PRUEBA:
        catalogo.registrar_elemento(Elemento.crear(id_val, tipo, nom))
    for o, d in DEPENDENCIAS_CICLICAS:
        catalogo.registrar_dependencia(o, d)

    # Añadir madera acíclica
    catalogo.registrar_elemento(Elemento.crear("PROV-MADERA", "PROVEEDOR", "Madera"))
    catalogo.registrar_elemento(Elemento.crear("INS-TABLERO", "INSUMO", "Tablero"))
    catalogo.registrar_elemento(Elemento.crear("PROC-ENSAMBLE", "PROCESO", "Ensamble"))
    catalogo.registrar_elemento(Elemento.crear("PROD-ESCRITORIO", "PRODUCTO", "Escritorio"))

    catalogo.registrar_dependencia("PROV-MADERA", "INS-TABLERO")
    catalogo.registrar_dependencia("INS-TABLERO", "PROC-ENSAMBLE")
    catalogo.registrar_dependencia("PROC-ENSAMBLE", "PROD-ESCRITORIO")

    cliente = TestClient(crear_aplicacion(catalogo))
    respuesta = cliente.get("/api/v1/plan-entrega?productos=PROD-PANEL,PROD-ESCRITORIO")

    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    assert cuerpo["esPlanificable"] is False
    estados = {p["id"]: p["estado"] for p in cuerpo["productos"]}
    assert estados["PROD-PANEL"] == "BLOQUEADO"
    assert estados["PROD-ESCRITORIO"] == "PLANIFICABLE"

    # Solo pasos de la rama planificable
    assert [p["id"] for p in cuerpo["pasos"]] == [
        "PROV-MADERA",
        "INS-TABLERO",
        "PROC-ENSAMBLE",
        "PROD-ESCRITORIO",
    ]
    assert cuerpo["ciclos"] == [{"secuencia": ["INS-BARRA", "PROC-CORTE", "INS-BARRA"]}]
    assert cuerpo["elementosBloqueados"] == ["INS-BARRA", "PROC-CORTE", "PROD-PANEL"]


def test_ac_f3_07_ciclo_en_rama_ajena_no_bloquea_producto() -> None:
    catalogo = Catalogo()
    for id_val, tipo, nom in ELEMENTOS_PRUEBA:
        catalogo.registrar_elemento(Elemento.crear(id_val, tipo, nom))
    for o, d in DEPENDENCIAS_PRUEBA:  # Acero acíclico
        catalogo.registrar_dependencia(o, d)

    # Añadir madera cíclica
    catalogo.registrar_elemento(Elemento.crear("PROV-MADERA", "PROVEEDOR", "Madera"))
    catalogo.registrar_elemento(Elemento.crear("INS-TABLERO", "INSUMO", "Tablero"))
    catalogo.registrar_elemento(Elemento.crear("PROC-ENSAMBLE", "PROCESO", "Ensamble"))
    catalogo.registrar_elemento(Elemento.crear("PROD-ESCRITORIO", "PRODUCTO", "Escritorio"))

    catalogo.registrar_dependencia("PROV-MADERA", "INS-TABLERO")
    catalogo.registrar_dependencia("INS-TABLERO", "PROC-ENSAMBLE")
    catalogo.registrar_dependencia("PROC-ENSAMBLE", "INS-TABLERO")
    catalogo.registrar_dependencia("PROC-ENSAMBLE", "PROD-ESCRITORIO")

    cliente = TestClient(crear_aplicacion(catalogo))
    respuesta = cliente.get("/api/v1/plan-entrega?productos=PROD-PANEL")

    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    assert cuerpo["esPlanificable"] is True
    assert cuerpo["productos"][0]["estado"] == "PLANIFICABLE"
    assert cuerpo["ciclos"] == []
    assert cuerpo["elementosBloqueados"] == []


def test_ac_f3_08_validaciones_de_seleccion_en_plan_entrega() -> None:
    cliente = _cliente_con_datos()

    # Inexistente -> 404 ERR-02
    r_inex = cliente.get("/api/v1/plan-entrega?productos=PROD-INEXISTENTE")
    assert r_inex.status_code == 404
    assert r_inex.json()["error"]["codigo"] == "ELEMENTO_NO_ENCONTRADO"

    # No es producto -> 422 ERR-04
    r_no_prod = cliente.get("/api/v1/plan-entrega?productos=INS-BARRA")
    assert r_no_prod.status_code == 422
    assert r_no_prod.json()["error"]["codigo"] == "VALIDACION_FALLIDA"

    # Vacío -> 422 ERR-04
    r_vacio = cliente.get("/api/v1/plan-entrega?productos=")
    assert r_vacio.status_code == 422
    assert r_vacio.json()["error"]["codigo"] == "VALIDACION_FALLIDA"

    # Mal formado -> 422 ERR-05
    r_mal = cliente.get("/api/v1/plan-entrega?productos=xx")
    assert r_mal.status_code == 422
    assert r_mal.json()["error"]["codigo"] == "IDENTIFICADOR_INVALIDO"

    # Mezcla válido e inválido -> falla completa sin plan parcial
    r_mezcla = cliente.get("/api/v1/plan-entrega?productos=PROD-PANEL,INS-BARRA")
    assert r_mezcla.status_code == 422
    assert r_mezcla.json()["error"]["codigo"] == "VALIDACION_FALLIDA"


# ---------------------------------------------------------------------------
# RNF: Algoritmos propios, sin NetworkX y determinismo
# ---------------------------------------------------------------------------

def test_ac_f3_11_sin_networkx() -> None:
    modulos: set[str] = set()
    for ruta in (RAIZ_BACKEND / "app").rglob("*.py"):
        arbol = ast.parse(ruta.read_text(encoding="utf-8"))
        for nodo in ast.walk(arbol):
            if isinstance(nodo, ast.Import):
                modulos.update(a.name.split(".")[0] for a in nodo.names)
            elif isinstance(nodo, ast.ImportFrom) and nodo.module and nodo.level == 0:
                modulos.add(nodo.module.split(".")[0])
    assert "networkx" not in modulos


def test_ac_f3_12_rendimiento_grafo_grande() -> None:
    catalogo = Catalogo()
    proveedores = [f"PROV-{i:04d}" for i in range(100)]
    insumos = [f"INS-{i:04d}" for i in range(100)]
    for p in proveedores:
        catalogo.registrar_elemento(Elemento.crear(p, "PROVEEDOR", f"Proveedor {p}"))
    for ins in insumos:
        catalogo.registrar_elemento(Elemento.crear(ins, "INSUMO", f"Insumo {ins}"))

    registrados = 0
    for i in range(100):
        for offset in range(5):
            p = proveedores[(i * 5 + offset) % 100]
            catalogo.registrar_dependencia(p, insumos[i])
            registrados += 1
    assert registrados == 500

    cliente = TestClient(crear_aplicacion(catalogo))
    t0 = time.perf_counter()
    resp = cliente.get("/api/v1/orden-produccion")
    duracion = (time.perf_counter() - t0) * 1000
    assert resp.status_code == 200
    assert duracion < 100.0


def test_ac_f3_13_determinismo_byte_a_byte() -> None:
    c_aciclico = _cliente_con_datos()
    c_ciclico = _cliente_con_datos(dependencias=DEPENDENCIAS_CICLICAS)

    r_aciclicas = [c_aciclico.get("/api/v1/orden-produccion").content for _ in range(10)]
    r_ciclicas = [c_ciclico.get("/api/v1/orden-produccion").content for _ in range(10)]
    r_plan = [c_aciclico.get("/api/v1/plan-entrega?productos=PROD-PANEL").content for _ in range(10)]

    assert all(r == r_aciclicas[0] for r in r_aciclicas)
    assert all(r == r_ciclicas[0] for r in r_ciclicas)
    assert all(r == r_plan[0] for r in r_plan)
