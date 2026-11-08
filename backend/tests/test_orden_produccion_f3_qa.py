"""QA independiente de F3 — Orden de producción, ciclos y plan de entrega.

Verifica contra la API real montada sobre ``crear_aplicacion`` los criterios
AC-F3-01 a AC-F3-14 de ``docs/acceptance-criteria.md`` §8 y el contrato de
``docs/api-contract.md`` §3.7 y §3.8:

- Diagnóstico global en DAG con precedencias válidas y determinismo.
- Diagnóstico global ante ciclos respondiendo 200 con reporte estructurado.
- Plan de entrega por producto (planificables, bloqueados, mezclas, aislamiento).
- Validación de la selección, estado por producto y rendimiento.
- Algoritmos propios sin NetworkX y separación de capas.

Los conjuntos sintéticos A, B, C, D, E, F y G son los de
``acceptance-criteria.md`` §8.1.

Contradicciones documentadas
----------------------------
Los criterios AC-F3-01c, AC-F3-05b y AC-F3-05d exigen que un producto aislado
(``PRODUCTO`` sin aristas) se pueda ordenar y que su plan tenga un único paso.
La implementación actual lo marca como ``INCOMPLETO`` y lo excluye del orden.
Esos casos se codifican con ``xfail(strict=True)`` para dejar evidencia de la
contradicción sin declararlos PASS. La decisión pendiente es del ``analyst``.
"""

import ast
import sys
import time
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

RAIZ_BACKEND = Path(__file__).resolve().parents[1]
if str(RAIZ_BACKEND) not in sys.path:
    sys.path.insert(0, str(RAIZ_BACKEND))

from app.api.aplicacion import crear_aplicacion  # noqa: E402
from app.dominio.catalogo import Catalogo  # noqa: E402
from app.dominio.elemento import Elemento  # noqa: E402

ElementoPrueba = tuple[str, str, str]
DependenciaPrueba = tuple[str, str]

#: Conjunto A — base acíclica.
ELEMENTOS_A: tuple[ElementoPrueba, ...] = (
    ("PROV-ACERO", "PROVEEDOR", "Proveedor de acero"),
    ("INS-BARRA", "INSUMO", "Barra de acero"),
    ("INS-TORNILLO", "INSUMO", "Tornillo hexagonal M6"),
    ("PROC-CORTE", "PROCESO", "Corte de panel"),
    ("PROD-PANEL", "PRODUCTO", "Panel de montaje"),
    ("PROD-BANCO", "PRODUCTO", "Banco de montaje"),
)

DEPENDENCIAS_A: tuple[DependenciaPrueba, ...] = (
    ("PROV-ACERO", "INS-BARRA"),
    ("PROV-ACERO", "INS-TORNILLO"),
    ("INS-BARRA", "PROC-CORTE"),
    ("INS-TORNILLO", "PROC-CORTE"),
    ("PROC-CORTE", "PROD-PANEL"),
    ("PROC-CORTE", "PROD-BANCO"),
)

#: Conjunto B — A más el ciclo de acero.
DEPENDENCIAS_B: tuple[DependenciaPrueba, ...] = DEPENDENCIAS_A + (
    ("PROC-CORTE", "INS-BARRA"),
)

#: Rama de madera acíclica y cíclica (Conjuntos C y D).
ELEMENTOS_MADERA: tuple[ElementoPrueba, ...] = (
    ("PROV-MADERA", "PROVEEDOR", "Proveedor de madera"),
    ("INS-TABLERO", "INSUMO", "Tablero de madera"),
    ("PROC-ENSAMBLE", "PROCESO", "Ensamble de escritorio"),
    ("PROD-ESCRITORIO", "PRODUCTO", "Escritorio de madera"),
)

DEPENDENCIAS_MADERA_ACICLICA: tuple[DependenciaPrueba, ...] = (
    ("PROV-MADERA", "INS-TABLERO"),
    ("INS-TABLERO", "PROC-ENSAMBLE"),
    ("PROC-ENSAMBLE", "PROD-ESCRITORIO"),
)

DEPENDENCIAS_MADERA_CICLICA: tuple[DependenciaPrueba, ...] = (
    ("PROV-MADERA", "INS-TABLERO"),
    ("INS-TABLERO", "PROC-ENSAMBLE"),
    ("PROC-ENSAMBLE", "INS-TABLERO"),
    ("PROC-ENSAMBLE", "PROD-ESCRITORIO"),
)

#: Conjunto G — B más la rama de madera acíclica.
DEPENDENCIAS_G: tuple[DependenciaPrueba, ...] = DEPENDENCIAS_B + DEPENDENCIAS_MADERA_ACICLICA


def _catalogo(
    elementos: tuple[ElementoPrueba, ...],
    dependencias: tuple[DependenciaPrueba, ...] = (),
) -> Catalogo:
    catalogo = Catalogo()
    for id_valor, tipo, nombre in elementos:
        catalogo.registrar_elemento(Elemento.crear(id_valor, tipo, nombre))
    for origen, destino in dependencias:
        catalogo.registrar_dependencia(origen, destino)
    return catalogo


def _cliente(
    elementos: tuple[ElementoPrueba, ...],
    dependencias: tuple[DependenciaPrueba, ...] = (),
) -> TestClient:
    return TestClient(crear_aplicacion(_catalogo(elementos, dependencias)))


def _cliente_conjunto_a() -> TestClient:
    return _cliente(ELEMENTOS_A, DEPENDENCIAS_A)


def _ids(pasos: list[dict]) -> list[str]:
    return [paso["id"] for paso in pasos]


def _ids_productos(cuerpo: dict) -> list[str]:
    return [producto["id"] for producto in cuerpo["productos"]]


# ---------------------------------------------------------------------------
# AC-F3-01 / 01b / 01d / 02 — Diagnóstico global en DAG
# ---------------------------------------------------------------------------


def test_qa_ac_f3_01_diagnostico_global_dag_conjunto_a() -> None:
    respuesta = _cliente_conjunto_a().get("/api/v1/orden-produccion")

    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    assert cuerpo["esDag"] is True
    assert _ids(cuerpo["orden"]) == [
        "PROV-ACERO",
        "INS-BARRA",
        "INS-TORNILLO",
        "PROC-CORTE",
        "PROD-BANCO",
        "PROD-PANEL",
    ]
    assert cuerpo["totalPasos"] == 6
    assert cuerpo["ciclos"] == []
    assert cuerpo["elementosBloqueados"] == []
    assert cuerpo["productosBloqueados"] == []
    assert cuerpo["productosPlanificables"] == ["PROD-BANCO", "PROD-PANEL"]


def test_qa_ac_f3_01_precedencias_origen_antes_que_destino() -> None:
    cuerpo = _cliente_conjunto_a().get("/api/v1/orden-produccion").json()
    posicion = {paso["id"]: indice for indice, paso in enumerate(cuerpo["orden"])}

    for origen, destino in DEPENDENCIAS_A:
        assert posicion[origen] < posicion[destino], (origen, destino)


def test_qa_ac_f3_01b_catalogo_vacio_es_dag_trivial() -> None:
    respuesta = TestClient(crear_aplicacion(Catalogo())).get("/api/v1/orden-produccion")

    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    assert cuerpo["esDag"] is True
    assert cuerpo["orden"] == []
    assert cuerpo["totalPasos"] == 0
    assert cuerpo["ciclos"] == []
    assert cuerpo["elementosBloqueados"] == []
    assert cuerpo["productosBloqueados"] == []
    assert cuerpo["productosPlanificables"] == []


def test_qa_ac_f3_01d_conjunto_c_intercala_listos_por_id() -> None:
    cliente = _cliente(
        ELEMENTOS_A + ELEMENTOS_MADERA,
        DEPENDENCIAS_A + DEPENDENCIAS_MADERA_ACICLICA,
    )
    cuerpo = cliente.get("/api/v1/orden-produccion").json()

    assert cuerpo["esDag"] is True
    assert _ids(cuerpo["orden"]) == [
        "PROV-ACERO",
        "INS-BARRA",
        "INS-TORNILLO",
        "PROC-CORTE",
        "PROD-BANCO",
        "PROD-PANEL",
        "PROV-MADERA",
        "INS-TABLERO",
        "PROC-ENSAMBLE",
        "PROD-ESCRITORIO",
    ]
    assert cuerpo["totalPasos"] == 10


def test_qa_ac_f3_02_diez_llamadas_y_orden_de_registro_no_alteran_el_orden() -> None:
    cliente = _cliente_conjunto_a()
    respuestas = [cliente.get("/api/v1/orden-produccion").json() for _ in range(10)]
    for respuesta in respuestas[1:]:
        assert respuesta == respuestas[0]

    # Mismo conjunto de aristas registradas en otro orden válido.
    orden_alterno: tuple[DependenciaPrueba, ...] = (
        ("PROV-ACERO", "INS-TORNILLO"),
        ("PROV-ACERO", "INS-BARRA"),
        ("INS-TORNILLO", "PROC-CORTE"),
        ("INS-BARRA", "PROC-CORTE"),
        ("PROC-CORTE", "PROD-BANCO"),
        ("PROC-CORTE", "PROD-PANEL"),
    )
    alterno = _cliente(ELEMENTOS_A, orden_alterno).get("/api/v1/orden-produccion").json()

    assert alterno == respuestas[0]


# ---------------------------------------------------------------------------
# AC-F3-03 / 03b / 04 / 04b — Diagnóstico global con ciclos
# ---------------------------------------------------------------------------


def test_qa_ac_f3_03_conjunto_b_responde_200_sin_orden_parcial() -> None:
    respuesta = _cliente(ELEMENTOS_A, DEPENDENCIAS_B).get("/api/v1/orden-produccion")

    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    assert cuerpo["esDag"] is False
    assert cuerpo["orden"] == []
    assert cuerpo["totalPasos"] == 0
    assert cuerpo["ciclos"] == [{"secuencia": ["INS-BARRA", "PROC-CORTE", "INS-BARRA"]}]
    assert cuerpo["elementosBloqueados"] == [
        "INS-BARRA",
        "PROC-CORTE",
        "PROD-BANCO",
        "PROD-PANEL",
    ]
    assert cuerpo["productosBloqueados"] == ["PROD-BANCO", "PROD-PANEL"]
    assert cuerpo["productosPlanificables"] == []


def test_qa_ac_f3_03b_requisitos_previos_del_ciclo_no_quedan_bloqueados() -> None:
    cuerpo = _cliente(ELEMENTOS_A, DEPENDENCIAS_B).get("/api/v1/orden-produccion").json()

    assert "PROV-ACERO" not in cuerpo["elementosBloqueados"]
    assert "INS-TORNILLO" not in cuerpo["elementosBloqueados"]
    assert "PROD-BANCO" in cuerpo["elementosBloqueados"]
    assert "PROD-PANEL" in cuerpo["elementosBloqueados"]


def test_qa_ac_f3_04_dos_ciclos_independientes_un_ciclo_por_scc() -> None:
    cliente = _cliente(
        ELEMENTOS_A + ELEMENTOS_MADERA,
        DEPENDENCIAS_B + DEPENDENCIAS_MADERA_CICLICA,
    )
    cuerpo = cliente.get("/api/v1/orden-produccion").json()

    assert cuerpo["esDag"] is False
    assert cuerpo["ciclos"] == [
        {"secuencia": ["INS-BARRA", "PROC-CORTE", "INS-BARRA"]},
        {"secuencia": ["INS-TABLERO", "PROC-ENSAMBLE", "INS-TABLERO"]},
    ]
    assert cuerpo["productosBloqueados"] == [
        "PROD-BANCO",
        "PROD-ESCRITORIO",
        "PROD-PANEL",
    ]
    assert cuerpo["productosPlanificables"] == []


def test_qa_ac_f3_04b_conjunto_d_bloquea_solo_la_rama_ciclica() -> None:
    cliente = _cliente(
        ELEMENTOS_A + ELEMENTOS_MADERA,
        DEPENDENCIAS_A + DEPENDENCIAS_MADERA_CICLICA,
    )
    cuerpo = cliente.get("/api/v1/orden-produccion").json()

    assert cuerpo["esDag"] is False
    assert cuerpo["orden"] == []
    assert cuerpo["totalPasos"] == 0
    assert cuerpo["ciclos"] == [
        {"secuencia": ["INS-TABLERO", "PROC-ENSAMBLE", "INS-TABLERO"]}
    ]
    assert cuerpo["elementosBloqueados"] == [
        "INS-TABLERO",
        "PROC-ENSAMBLE",
        "PROD-ESCRITORIO",
    ]
    assert "PROV-MADERA" not in cuerpo["elementosBloqueados"]
    assert cuerpo["productosBloqueados"] == ["PROD-ESCRITORIO"]
    assert cuerpo["productosPlanificables"] == ["PROD-BANCO", "PROD-PANEL"]


# ---------------------------------------------------------------------------
# AC-F3-05 / 05c / 05e / 06 / 06b / 07 — Plan de entrega
# ---------------------------------------------------------------------------


def test_qa_ac_f3_05_plan_entrega_producto_planificable() -> None:
    respuesta = _cliente_conjunto_a().get("/api/v1/plan-entrega?productos=PROD-PANEL")

    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    assert cuerpo["productos"] == [
        {
            "id": "PROD-PANEL",
            "tipo": "PRODUCTO",
            "nombre": "Panel de montaje",
            "descripcion": None,
            "estado": "PLANIFICABLE",
        }
    ]
    assert cuerpo["esPlanificable"] is True
    assert _ids(cuerpo["pasos"]) == [
        "PROV-ACERO",
        "INS-BARRA",
        "INS-TORNILLO",
        "PROC-CORTE",
        "PROD-PANEL",
    ]
    assert [paso["paso"] for paso in cuerpo["pasos"]] == [1, 2, 3, 4, 5]
    assert cuerpo["totalPasos"] == 5
    assert cuerpo["ciclos"] == []
    assert cuerpo["elementosBloqueados"] == []


def test_qa_ac_f3_05c_plan_entrega_multiproducto_deduplica_y_respeta_orden_global() -> None:
    cuerpo = (
        _cliente_conjunto_a()
        .get("/api/v1/plan-entrega?productos=PROD-PANEL,PROD-BANCO")
        .json()
    )

    assert cuerpo["esPlanificable"] is True
    assert _ids_productos(cuerpo) == ["PROD-BANCO", "PROD-PANEL"]
    assert _ids(cuerpo["pasos"]) == [
        "PROV-ACERO",
        "INS-BARRA",
        "INS-TORNILLO",
        "PROC-CORTE",
        "PROD-BANCO",
        "PROD-PANEL",
    ]
    assert len(_ids(cuerpo["pasos"])) == len(set(_ids(cuerpo["pasos"])))
    assert cuerpo["totalPasos"] == 6


def test_qa_ac_f3_05e_el_orden_de_la_seleccion_no_altera_el_plan() -> None:
    cliente = _cliente_conjunto_a()
    directo = cliente.get("/api/v1/plan-entrega?productos=PROD-PANEL,PROD-BANCO")
    invertido = cliente.get("/api/v1/plan-entrega?productos=PROD-BANCO,PROD-PANEL")

    assert directo.status_code == invertido.status_code == 200
    assert directo.content == invertido.content


def test_qa_ac_f3_06_producto_bloqueado_responde_200_sin_pasos() -> None:
    respuesta = _cliente(ELEMENTOS_A, DEPENDENCIAS_B).get(
        "/api/v1/plan-entrega?productos=PROD-PANEL"
    )

    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    assert cuerpo["esPlanificable"] is False
    assert cuerpo["productos"][0]["estado"] == "BLOQUEADO"
    assert cuerpo["pasos"] == []
    assert cuerpo["totalPasos"] == 0
    assert cuerpo["ciclos"] == [{"secuencia": ["INS-BARRA", "PROC-CORTE", "INS-BARRA"]}]
    assert cuerpo["elementosBloqueados"] == ["INS-BARRA", "PROC-CORTE", "PROD-PANEL"]


def test_qa_ac_f3_06b_mezcla_bloqueado_y_planificable_solo_devuelve_rama_planificable() -> None:
    cliente = _cliente(
        ELEMENTOS_A + ELEMENTOS_MADERA,
        DEPENDENCIAS_G,
    )
    cuerpo = cliente.get(
        "/api/v1/plan-entrega?productos=PROD-PANEL,PROD-ESCRITORIO"
    ).json()

    assert cuerpo["esPlanificable"] is False
    estados = {producto["id"]: producto["estado"] for producto in cuerpo["productos"]}
    assert estados == {"PROD-ESCRITORIO": "PLANIFICABLE", "PROD-PANEL": "BLOQUEADO"}
    assert _ids(cuerpo["pasos"]) == [
        "PROV-MADERA",
        "INS-TABLERO",
        "PROC-ENSAMBLE",
        "PROD-ESCRITORIO",
    ]
    assert cuerpo["ciclos"] == [{"secuencia": ["INS-BARRA", "PROC-CORTE", "INS-BARRA"]}]
    assert cuerpo["elementosBloqueados"] == ["INS-BARRA", "PROC-CORTE", "PROD-PANEL"]


def test_qa_ac_f3_07_ciclo_en_rama_ajena_no_contamina_el_plan() -> None:
    cliente = _cliente(
        ELEMENTOS_A + ELEMENTOS_MADERA,
        DEPENDENCIAS_A + DEPENDENCIAS_MADERA_CICLICA,
    )
    cuerpo = cliente.get("/api/v1/plan-entrega?productos=PROD-PANEL").json()

    assert cuerpo["esPlanificable"] is True
    assert cuerpo["productos"][0]["estado"] == "PLANIFICABLE"
    assert _ids(cuerpo["pasos"]) == [
        "PROV-ACERO",
        "INS-BARRA",
        "INS-TORNILLO",
        "PROC-CORTE",
        "PROD-PANEL",
    ]
    assert cuerpo["ciclos"] == []
    assert cuerpo["elementosBloqueados"] == []


# ---------------------------------------------------------------------------
# AC-F3-08 / 08b / 08c / 08d / 08e / 08f — Validación de la selección
# ---------------------------------------------------------------------------


def test_qa_ac_f3_08_seleccion_invalida_falla_completa_sin_plan_parcial() -> None:
    cliente = _cliente_conjunto_a()

    inexistente = cliente.get("/api/v1/plan-entrega?productos=PROD-NOEXISTE")
    assert inexistente.status_code == 404
    assert inexistente.json()["error"]["codigo"] == "ELEMENTO_NO_ENCONTRADO"

    no_producto = cliente.get("/api/v1/plan-entrega?productos=INS-BARRA")
    assert no_producto.status_code == 422
    assert no_producto.json()["error"]["codigo"] == "VALIDACION_FALLIDA"

    vacio = cliente.get("/api/v1/plan-entrega?productos=")
    assert vacio.status_code == 422
    assert vacio.json()["error"]["codigo"] == "VALIDACION_FALLIDA"

    ausente = cliente.get("/api/v1/plan-entrega")
    assert ausente.status_code == 422
    assert ausente.json()["error"]["codigo"] == "VALIDACION_FALLIDA"

    mal_formado = cliente.get("/api/v1/plan-entrega?productos=xx")
    assert mal_formado.status_code == 422
    assert mal_formado.json()["error"]["codigo"] == "IDENTIFICADOR_INVALIDO"

    mezcla = cliente.get("/api/v1/plan-entrega?productos=PROD-PANEL,INS-BARRA")
    assert mezcla.status_code == 422
    assert mezcla.json()["error"]["codigo"] == "VALIDACION_FALLIDA"
    assert "pasos" not in mezcla.json()


def test_qa_ac_f3_08e_normaliza_mayusculas_y_deduplica_la_seleccion() -> None:
    cliente = _cliente_conjunto_a()
    normalizado = cliente.get(
        "/api/v1/plan-entrega?productos=prod-panel,PROD-PANEL"
    )

    assert normalizado.status_code == 200
    cuerpo = normalizado.json()
    assert _ids_productos(cuerpo) == ["PROD-PANEL"]
    assert cuerpo["totalPasos"] == 5
    assert normalizado.content == cliente.get(
        "/api/v1/plan-entrega?productos=PROD-PANEL"
    ).content


# ---------------------------------------------------------------------------
# AC-F3-09 — Estado por producto
# ---------------------------------------------------------------------------


def test_qa_ac_f3_09_cada_producto_aparece_una_vez_con_su_estado() -> None:
    cliente = _cliente(
        ELEMENTOS_A + ELEMENTOS_MADERA,
        DEPENDENCIAS_G,
    )
    cuerpo = cliente.get(
        "/api/v1/plan-entrega?productos=PROD-PANEL,PROD-ESCRITORIO,PROD-PANEL"
    ).json()

    assert _ids_productos(cuerpo) == ["PROD-ESCRITORIO", "PROD-PANEL"]
    assert len(cuerpo["productos"]) == 2
    for producto in cuerpo["productos"]:
        assert producto["tipo"] == "PRODUCTO"
        assert producto["nombre"]
        assert producto["estado"] in {"PLANIFICABLE", "BLOQUEADO"}
    assert cuerpo["esPlanificable"] is False


def test_qa_ac_f3_09_es_planificable_solo_si_todos_lo_son() -> None:
    cuerpo = (
        _cliente_conjunto_a()
        .get("/api/v1/plan-entrega?productos=PROD-PANEL,PROD-BANCO")
        .json()
    )
    assert cuerpo["esPlanificable"] is True
    assert {producto["estado"] for producto in cuerpo["productos"]} == {"PLANIFICABLE"}


# ---------------------------------------------------------------------------
# AC-F3-12 / 13 — Rendimiento y determinismo
# ---------------------------------------------------------------------------


def _catalogo_grande() -> Catalogo:
    """200 elementos y 500 dependencias con cadenas completas."""
    catalogo = Catalogo()
    proveedores = [f"PROV-{indice:04d}" for indice in range(50)]
    insumos = [f"INS-{indice:04d}" for indice in range(50)]
    procesos = [f"PROC-{indice:04d}" for indice in range(50)]
    productos = [f"PROD-{indice:04d}" for indice in range(50)]

    for proveedor in proveedores:
        catalogo.registrar_elemento(Elemento.crear(proveedor, "PROVEEDOR", proveedor))
    for insumo in insumos:
        catalogo.registrar_elemento(Elemento.crear(insumo, "INSUMO", insumo))
    for proceso in procesos:
        catalogo.registrar_elemento(Elemento.crear(proceso, "PROCESO", proceso))
    for producto in productos:
        catalogo.registrar_elemento(Elemento.crear(producto, "PRODUCTO", producto))

    # 50 aristas proveedor -> insumo propio.
    for indice in range(50):
        catalogo.registrar_dependencia(proveedores[indice], insumos[indice])
    # 350 aristas proveedor -> otros insumos (cada insumo sigue teniendo origen).
    for indice in range(50):
        for salto in range(1, 8):
            catalogo.registrar_dependencia(
                proveedores[indice], insumos[(indice + salto) % 50]
            )
    # 50 aristas insumo -> proceso y 50 proceso -> producto.
    for indice in range(50):
        catalogo.registrar_dependencia(insumos[indice], procesos[indice])
        catalogo.registrar_dependencia(procesos[indice], productos[indice])

    assert catalogo.total_elementos() == 200
    assert catalogo.total_dependencias() == 500
    return catalogo


def test_qa_ac_f3_12_diagnostico_y_plan_en_menos_de_100_ms() -> None:
    cliente = TestClient(crear_aplicacion(_catalogo_grande()))
    productos = ",".join(f"PROD-{indice:04d}" for indice in range(50))

    inicio = time.perf_counter()
    global_respuesta = cliente.get("/api/v1/orden-produccion")
    duracion_global = (time.perf_counter() - inicio) * 1000

    inicio = time.perf_counter()
    plan_respuesta = cliente.get(f"/api/v1/plan-entrega?productos={productos}")
    duracion_plan = (time.perf_counter() - inicio) * 1000

    assert global_respuesta.status_code == 200
    assert global_respuesta.json()["totalPasos"] == 200
    assert plan_respuesta.status_code == 200
    assert plan_respuesta.json()["esPlanificable"] is True
    assert duracion_global < 100.0, f"diagnóstico: {duracion_global:.1f} ms"
    assert duracion_plan < 100.0, f"plan de entrega: {duracion_plan:.1f} ms"


def test_qa_ac_f3_13_determinismo_byte_a_byte_con_ciclo_y_plan() -> None:
    aciclico = _cliente_conjunto_a()
    ciclico = _cliente(ELEMENTOS_A, DEPENDENCIAS_B)

    globales_aciclicos = [
        aciclico.get("/api/v1/orden-produccion").content for _ in range(10)
    ]
    globales_ciclicos = [
        ciclico.get("/api/v1/orden-produccion").content for _ in range(10)
    ]
    planes = [
        aciclico.get("/api/v1/plan-entrega?productos=PROD-PANEL,PROD-BANCO").content
        for _ in range(10)
    ]

    assert all(cuerpo == globales_aciclicos[0] for cuerpo in globales_aciclicos)
    assert all(cuerpo == globales_ciclicos[0] for cuerpo in globales_ciclicos)
    assert all(cuerpo == planes[0] for cuerpo in planes)


# ---------------------------------------------------------------------------
# AC-F3-11 / 14 — Algoritmos propios y separación de capas
# ---------------------------------------------------------------------------


def test_qa_ac_f3_11_sin_networkx_ni_librerias_de_grafos() -> None:
    modulos: set[str] = set()
    for ruta in (RAIZ_BACKEND / "app").rglob("*.py"):
        arbol = ast.parse(ruta.read_text(encoding="utf-8"))
        for nodo in ast.walk(arbol):
            if isinstance(nodo, ast.Import):
                modulos.update(alias.name.split(".")[0] for alias in nodo.names)
            elif isinstance(nodo, ast.ImportFrom) and nodo.module and nodo.level == 0:
                modulos.add(nodo.module.split(".")[0])

    assert "networkx" not in modulos
    assert "graphlib" not in modulos


def test_qa_ac_f3_14_el_calculo_vive_en_el_dominio() -> None:
    tokens_algoritmo = ("tarjan", "kahn", "topolog", "networkx", "graphlib")

    def _contiene_algoritmo(directorio: Path) -> bool:
        for ruta in directorio.rglob("*.py"):
            contenido = ruta.read_text(encoding="utf-8").lower()
            if any(token in contenido for token in tokens_algoritmo):
                return True
        return False

    dominio = RAIZ_BACKEND / "app" / "dominio"
    api = RAIZ_BACKEND / "app" / "api"
    aplicacion = RAIZ_BACKEND / "app" / "aplicacion"

    assert _contiene_algoritmo(dominio) is True
    assert _contiene_algoritmo(api) is False
    assert _contiene_algoritmo(aplicacion) is False

    rutas = (api / "rutas.py").read_text(encoding="utf-8")
    assert "ObtenerOrdenProduccion" in rutas
    assert "ObtenerPlanEntrega" in rutas
    # La capa HTTP no importa el catálogo ni implementa el recorrido.
    assert "from app.dominio.catalogo import" not in rutas


# ---------------------------------------------------------------------------
# Contradicciones documentales pendientes de decisión del analyst
# ---------------------------------------------------------------------------


@pytest.mark.xfail(
    strict=True,
    reason=(
        "Contradicción AC-F3-01c: la documentación exige ordenar los productos "
        "aislados [PROD-A, PROD-B, PROD-C], pero la implementación los marca "
        "INCOMPLETO y devuelve orden []."
    ),
)
def test_qa_ac_f3_01c_conjunto_f_productos_aislados_se_ordenan() -> None:
    cliente = _cliente(
        (
            ("PROD-A", "PRODUCTO", "Producto A"),
            ("PROD-B", "PRODUCTO", "Producto B"),
            ("PROD-C", "PRODUCTO", "Producto C"),
        )
    )
    cuerpo = cliente.get("/api/v1/orden-produccion").json()

    assert cuerpo["esDag"] is True
    assert _ids(cuerpo["orden"]) == ["PROD-A", "PROD-B", "PROD-C"]
    assert cuerpo["totalPasos"] == 3


@pytest.mark.xfail(
    strict=True,
    reason=(
        "Contradicción AC-F3-05b/RF-F3-05: la documentación exige un plan de un "
        "único paso para PROD-SOLO, pero la implementación lo marca INCOMPLETO "
        "con pasos []."
    ),
)
def test_qa_ac_f3_05b_producto_sin_requisitos_tiene_un_unico_paso() -> None:
    cliente = _cliente((("PROD-SOLO", "PRODUCTO", "Producto solo"),))
    cuerpo = cliente.get("/api/v1/plan-entrega?productos=PROD-SOLO").json()

    assert cuerpo["esPlanificable"] is True
    assert _ids(cuerpo["pasos"]) == ["PROD-SOLO"]
    assert cuerpo["totalPasos"] == 1


@pytest.mark.xfail(
    strict=True,
    reason=(
        "Contradicción AC-F3-05d: la documentación exige un paso para PROD-B "
        "del Conjunto F, pero la implementación lo marca INCOMPLETO."
    ),
)
def test_qa_ac_f3_05d_conjunto_f_producto_aislado_tiene_un_paso() -> None:
    cliente = _cliente(
        (
            ("PROD-A", "PRODUCTO", "Producto A"),
            ("PROD-B", "PRODUCTO", "Producto B"),
            ("PROD-C", "PRODUCTO", "Producto C"),
        )
    )
    cuerpo = cliente.get("/api/v1/plan-entrega?productos=PROD-B").json()

    assert cuerpo["esPlanificable"] is True
    assert _ids(cuerpo["pasos"]) == ["PROD-B"]
    assert cuerpo["totalPasos"] == 1


def test_observacion_implementacion_reporta_incompletos_no_especificados() -> None:
    """Observación QA: estado ``INCOMPLETO`` sin respaldo en ``docs/``.

    No es un criterio de aceptación. Registra el comportamiento actual para el
    reporte de contradicciones: un producto aislado se excluye del orden y se
    reporta en ``elementosIncompletos``/``productosIncompletos``.
    """
    cliente = _cliente(
        (
            ("PROD-A", "PRODUCTO", "Producto A"),
            ("PROD-B", "PRODUCTO", "Producto B"),
        )
    )

    global_cuerpo = cliente.get("/api/v1/orden-produccion").json()
    assert global_cuerpo["orden"] == []
    assert global_cuerpo["elementosIncompletos"] == ["PROD-A", "PROD-B"]
    assert global_cuerpo["productosIncompletos"] == ["PROD-A", "PROD-B"]

    plan_cuerpo = cliente.get("/api/v1/plan-entrega?productos=PROD-A").json()
    assert plan_cuerpo["productos"][0]["estado"] == "INCOMPLETO"
    assert plan_cuerpo["productosIncompletos"] == ["PROD-A"]
    assert plan_cuerpo["elementosIncompletos"] == ["PROD-A"]
