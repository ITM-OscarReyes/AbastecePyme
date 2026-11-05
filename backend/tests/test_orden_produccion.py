"""RF-F3-01 a RF-F3-07 · Orden de producción y ciclos (F3).

Cubre AC-F3-01 a AC-F3-06, RNF-F3-01 a RNF-F3-04 y casos límite de la
sección 8 de acceptance-criteria.md.

Los datos de prueba respetan las reglas de dependencia entre tipos vigentes
(F1/F2), de modo que todas las dependencias se registran por la API real
sin saltarse validaciones de dominio. Un insumo que se enlaza a un proceso
o producto debe estar asociado previamente a un proveedor o proceso.

Conjunto acíclico de prueba:
  PROV-ACERO -> INS-BARRA -> PROC-CORTE -> PROD-PANEL
  PROV-ACERO -> INS-TORNILLO -> PROD-PANEL
  (PROD-BANCO aislado)
Orden Kahn esperado (desempate alfabético por id):
  1. PROD-BANCO      (in-degree 0, aislado)
  2. PROV-ACERO      (in-degree 0)
  3. INS-BARRA       (habilitado tras PROV-ACERO)
  4. INS-TORNILLO    (habilitado tras PROV-ACERO)
  5. PROC-CORTE      (habilitado tras INS-BARRA)
  6. PROD-PANEL      (habilitado tras PROC-CORTE e INS-TORNILLO)
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

# Conjunto acíclico válido según las reglas de tipo.
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
    ("PROC-CORTE", "PROD-PANEL"),
    ("INS-TORNILLO", "PROD-PANEL"),
)

# Conjunto cíclico: el anterior más PROC-CORTE -> INS-BARRA (ciclo de 2 nodos válido).
DEPENDENCIAS_CICLICAS: tuple[tuple[str, str], ...] = DEPENDENCIAS_PRUEBA + (
    ("PROC-CORTE", "INS-BARRA"),
)


def _cliente_con_datos(
    dependencias: tuple[tuple[str, str], ...] = DEPENDENCIAS_PRUEBA,
) -> TestClient:
    """Crea un cliente de prueba con el catálogo poblado por la API real."""
    catalogo = Catalogo()
    for id_valor, tipo, nombre in ELEMENTOS_PRUEBA:
        catalogo.registrar_elemento(Elemento.crear(id_valor, tipo, nombre))
    for origen, destino in dependencias:
        catalogo.registrar_dependencia(origen, destino)
    return TestClient(crear_aplicacion(catalogo))


def _cliente_vacio() -> TestClient:
    """Cliente con catálogo vacío (AC-F3-06)."""
    return TestClient(crear_aplicacion(Catalogo()))


# ---------------------------------------------------------------------------
# RF-F3-01 / RF-F3-02 · Orden de producción válido en grafo acíclico (DAG)
# ---------------------------------------------------------------------------

def test_ac_f3_01_caso_aciclico_respeta_precedencias_y_total_pasos() -> None:
    """AC-F3-01: grafo acíclico -> 200, esDag true, orden válido y totalPasos = |V|."""
    cliente = _cliente_con_datos()
    respuesta = cliente.get("/api/v1/orden-produccion")

    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    assert cuerpo["esDag"] is True
    assert cuerpo["totalPasos"] == 6

    orden = cuerpo["orden"]
    pasos_por_id = {paso["id"]: paso["paso"] for paso in orden}
    ids_ordenados = [paso["id"] for paso in orden]

    # Todos los elementos aparecen exactamente once, con pasos secuenciales desde 1.
    assert set(ids_ordenados) == {e[0] for e in ELEMENTOS_PRUEBA}
    assert [paso["paso"] for paso in orden] == list(range(1, 7))

    # Para cada arista origen -> destino, el paso del origen es estrictamente menor.
    for origen, destino in DEPENDENCIAS_PRUEBA:
        assert pasos_por_id[origen] < pasos_por_id[
            destino
        ], f"Precedencia violada: {origen} (paso {pasos_por_id[origen]}) -> {destino} (paso {pasos_por_id[destino]})"

    # Desempate determinista por id ascendente: PROD-BANCO, PROV-ACERO inician sin requisitos.
    assert ids_ordenados[0] == "PROD-BANCO"
    assert ids_ordenados[1] == "PROV-ACERO"


def test_ac_f3_02_determinismo_estricto_kahn() -> None:
    """AC-F3-02: dos llamadas sucesivas sobre el mismo estado -> misma secuencia."""
    cliente = _cliente_con_datos()
    r1 = cliente.get("/api/v1/orden-produccion")
    r2 = cliente.get("/api/v1/orden-produccion")
    assert r1.status_code == r2.status_code == 200
    assert r1.json() == r2.json()

    ids = [paso["id"] for paso in r1.json()["orden"]]
    disponible_inicial = {"PROD-BANCO", "PROV-ACERO"}
    assert set(ids[:2]) == disponible_inicial
    # Desempate alfabético: PROD-BANCO antes que PROV-ACERO.
    assert ids.index("PROD-BANCO") < ids.index("PROV-ACERO")


# ---------------------------------------------------------------------------
# RF-F3-03 / RF-F3-04 / RF-F3-05 · Detección y reporte útil de ciclos
# ---------------------------------------------------------------------------

def test_ac_f3_03_caso_ciclico_responde_409_configuracion_ciclica() -> None:
    """AC-F3-03: ciclo -> 409 CONFIGURACION_CICLICA, ciclo cerrado y elementos bloqueados."""
    cliente = _cliente_con_datos(dependencias=DEPENDENCIAS_CICLICAS)
    respuesta = cliente.get("/api/v1/orden-produccion")

    assert respuesta.status_code == 409
    cuerpo = respuesta.json()
    error = cuerpo["error"]
    assert error["codigo"] == "CONFIGURACION_CICLICA"
    assert "dependencias circulares" in error["mensaje"].lower()

    campos = {detalle["campo"]: detalle["mensaje"] for detalle in error["detalles"]}
    assert "ciclo" in campos
    assert "elementosBloqueados" in campos

    # El ciclo está cerrado: primero y último coinciden.
    ciclo = [c.strip() for c in campos["ciclo"].split(" -> ")]
    assert ciclo[0] == ciclo[-1]
    assert len(ciclo) >= 3  # al menos A -> B -> A

    # No se emite orden ni totalPasos en la respuesta de error (RF-F3-05).
    assert "orden" not in cuerpo
    assert "totalPasos" not in cuerpo
    assert "esDag" not in cuerpo


def test_ac_f3_04_subgrafo_con_ciclo_y_nodo_desconectado_sin_orden_parcial() -> None:
    """AC-F3-04: ciclo en subgrafo + nodo aislado -> 409, ciclo identificado, no orden parcial."""
    catalogo = Catalogo()
    for id_valor, tipo in (
        ("PROC-A", "PROCESO"),
        ("INS-B", "INSUMO"),
        ("PROV-OTRO", "PROVEEDOR"),
    ):
        catalogo.registrar_elemento(Elemento.crear(id_valor, tipo, f"Item {id_valor}"))
    # Ciclo PROC-A -> INS-B -> PROC-A (ambas direcciones permitidas entre PROCESO e INSUMO)
    catalogo.registrar_dependencia("PROC-A", "INS-B")
    catalogo.registrar_dependencia("INS-B", "PROC-A")
    # Nodo desconectado PROV-OTRO (in-degree 0, ordenable por sí solo)

    cliente = TestClient(crear_aplicacion(catalogo))
    respuesta = cliente.get("/api/v1/orden-produccion")

    assert respuesta.status_code == 409
    cuerpo = respuesta.json()
    error = cuerpo["error"]
    assert error["codigo"] == "CONFIGURACION_CICLICA"

    campos = {detalle["campo"]: detalle["mensaje"] for detalle in error["detalles"]}
    ciclo = [c.strip() for c in campos["ciclo"].split(" -> ")]
    assert ciclo[0] == ciclo[-1]
    assert {"PROC-A", "INS-B"}.issubset(set(ciclo))

    # PROV-OTRO no está bloqueado (se podía ordenar), pero no se emite orden parcial.
    elementos_bloqueados = [e.strip() for e in campos["elementosBloqueados"].split(", ")]
    assert "PROV-OTRO" not in elementos_bloqueados
    assert {"PROC-A", "INS-B"}.issubset(set(elementos_bloqueados))
    assert "orden" not in cuerpo


def test_ac_f3_05_prohibicion_de_orden_falso_con_ciclo() -> None:
    """AC-F3-05: con ciclo nunca hay 200 con orden truncado o que viole precedencias."""
    for id_consulta in ("PROC-CORTE", "INS-BARRA", "PROV-ACERO", "PROD-PANEL"):
        catalogo = Catalogo()
        for id_valor, tipo, nombre in ELEMENTOS_PRUEBA:
            catalogo.registrar_elemento(Elemento.crear(id_valor, tipo, nombre))
        # Asociación previa obligatoria del insumo + ciclo de dos direcciones.
        catalogo.registrar_dependencia("PROV-ACERO", "INS-BARRA")
        catalogo.registrar_dependencia("PROC-CORTE", "INS-BARRA")
        catalogo.registrar_dependencia("INS-BARRA", "PROC-CORTE")
        c = TestClient(crear_aplicacion(catalogo))
        r = c.get("/api/v1/orden-produccion")
        assert r.status_code == 409, f"Entrada {id_consulta}: se esperaba 409, se obtuvo {r.status_code}"
        assert r.json()["error"]["codigo"] == "CONFIGURACION_CICLICA"


# ---------------------------------------------------------------------------
# RF-F3-06 · Casos límite estructurales
# ---------------------------------------------------------------------------

def test_ac_f3_06_grafo_vacio_responde_200_orden_vacio_sin_ciclo() -> None:
    """AC-F3-06: V = ∅, E = ∅ -> 200, esDag true, orden [], totalPasos 0."""
    cliente = _cliente_vacio()
    respuesta = cliente.get("/api/v1/orden-produccion")

    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    assert cuerpo["esDag"] is True
    assert cuerpo["orden"] == []
    assert cuerpo["totalPasos"] == 0


def test_ac_f3_06b_elementos_aislados_orden_alfabetico() -> None:
    """AC-F3-06b: 3 elementos sin dependencias -> orden alfabético por id."""
    catalogo = Catalogo()
    for id_valor, tipo in (
        ("PROD-C", "PRODUCTO"),
        ("PROD-A", "PRODUCTO"),
        ("PROD-B", "PRODUCTO"),
    ):
        catalogo.registrar_elemento(Elemento.crear(id_valor, tipo, f"Producto {id_valor}"))

    cliente = TestClient(crear_aplicacion(catalogo))
    respuesta = cliente.get("/api/v1/orden-produccion")

    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    assert cuerpo["esDag"] is True
    assert cuerpo["totalPasos"] == 3
    assert [paso["id"] for paso in cuerpo["orden"]] == ["PROD-A", "PROD-B", "PROD-C"]
    assert [paso["paso"] for paso in cuerpo["orden"]] == [1, 2, 3]


def test_ac_f3_06c_grafos_desconectados_aciclicos_orden_unificado() -> None:
    """AC-F3-06c: dos cadenas independientes -> orden válido, desempate por id."""
    catalogo = Catalogo()
    for id_valor, tipo in (
        ("PROV-CAD1", "PROVEEDOR"),
        ("CAD1-INS", "INSUMO"),
        ("CAD1-PROD", "PRODUCTO"),
        ("PROV-CAD2", "PROVEEDOR"),
        ("CAD2-INS", "INSUMO"),
        ("CAD2-PROD", "PRODUCTO"),
    ):
        catalogo.registrar_elemento(Elemento.crear(id_valor, tipo, f"Item {id_valor}"))
    # Cada insumo debe asociarse a un proveedor antes de enlazarse a su producto.
    catalogo.registrar_dependencia("PROV-CAD1", "CAD1-INS")
    catalogo.registrar_dependencia("PROV-CAD2", "CAD2-INS")
    catalogo.registrar_dependencia("CAD1-INS", "CAD1-PROD")
    catalogo.registrar_dependencia("CAD2-INS", "CAD2-PROD")

    cliente = TestClient(crear_aplicacion(catalogo))
    respuesta = cliente.get("/api/v1/orden-produccion")

    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    assert cuerpo["esDag"] is True
    assert cuerpo["totalPasos"] == 6
    pasos = {paso["id"]: paso["paso"] for paso in cuerpo["orden"]}
    # Cada insumo precede a su producto.
    assert pasos["CAD1-INS"] < pasos["CAD1-PROD"]
    assert pasos["CAD2-INS"] < pasos["CAD2-PROD"]
    # Desempate alfabético entre in-degree 0: PROV-CAD1, PROV-CAD2.
    ids = [paso["id"] for paso in cuerpo["orden"]]
    assert ids.index("PROV-CAD1") < ids.index("PROV-CAD2")


# ---------------------------------------------------------------------------
# RNF-F3-01 · Sin NetworkX para algoritmos de F3 (AC-F3-08)
# ---------------------------------------------------------------------------

def test_ac_f3_08_orden_y_ciclos_sin_networkx() -> None:
    """AC-F3-08: revisión estática confirma que no se usa NetworkX para orden ni ciclos."""
    modulos_importados: set[str] = set()
    for ruta in (RAIZ_BACKEND / "app").rglob("*.py"):
        arbol = ast.parse(ruta.read_text(encoding="utf-8"))
        for nodo in ast.walk(arbol):
            if isinstance(nodo, ast.Import):
                modulos_importados.update(alias.name.split(".")[0] for alias in nodo.names)
            elif isinstance(nodo, ast.ImportFrom) and nodo.module and nodo.level == 0:
                modulos_importados.add(nodo.module.split(".")[0])

    assert "networkx" not in modulos_importados


# ---------------------------------------------------------------------------
# RNF-F3-02 · Complejidad lineal (AC-F3-09)
# ---------------------------------------------------------------------------

def test_ac_f3_09_rendimiento_grafo_grande_menos_de_100_ms() -> None:
    """AC-F3-09: 200 elementos y 500 dependencias -> respuesta en < 100 ms."""
    catalogo = Catalogo()
    proveedores = [f"PROV-{i:04d}" for i in range(100)]
    insumos = [f"INS-{i:04d}" for i in range(100)]
    for id_valor in proveedores:
        catalogo.registrar_elemento(Elemento.crear(id_valor, "PROVEEDOR", f"Proveedor {id_valor}"))
    for id_valor in insumos:
        catalogo.registrar_elemento(Elemento.crear(id_valor, "INSUMO", f"Insumo {id_valor}"))

    registrados = 0
    for indice_insumo in range(100):
        for desplazamiento in range(5):
            proveedor = proveedores[(indice_insumo * 5 + desplazamiento) % 100]
            catalogo.registrar_dependencia(proveedor, insumos[indice_insumo])
            registrados += 1
    assert registrados == 500

    cliente = TestClient(crear_aplicacion(catalogo))
    t0 = time.perf_counter()
    respuesta = cliente.get("/api/v1/orden-produccion")
    t1 = time.perf_counter()
    duracion_ms = (t1 - t0) * 1000

    assert respuesta.status_code == 200
    assert duracion_ms < 100.0, f"Orden de producción tardó {duracion_ms:.2f} ms (esperado < 100ms)"


# ---------------------------------------------------------------------------
# RNF-F3-03 · Determinismo absoluto (AC-F3-10)
# ---------------------------------------------------------------------------

def test_ac_f3_10_determinismo_byte_a_byte_diez_ejecuciones() -> None:
    """AC-F3-10: diez ejecuciones consecutivas -> mismo contenido JSON byte a byte."""
    cliente_aciclico = _cliente_con_datos()
    cliente_ciclico = _cliente_con_datos(dependencias=DEPENDENCIAS_CICLICAS)

    respuestas_aciclicas = [
        cliente_aciclico.get("/api/v1/orden-produccion").content
        for _ in range(10)
    ]
    respuestas_ciclicas = [
        cliente_ciclico.get("/api/v1/orden-produccion").content
        for _ in range(10)
    ]

    assert all(r == respuestas_aciclicas[0] for r in respuestas_aciclicas)
    assert all(r == respuestas_ciclicas[0] for r in respuestas_ciclicas)
    assert respuestas_aciclicas[0] != respuestas_ciclicas[0]


# ---------------------------------------------------------------------------
# Casos límite adicionales de la tabla de acceptance-criteria.md
# ---------------------------------------------------------------------------

def test_limite_ciclo_simple_dos_nodos() -> None:
    """Ciclo PROC-A -> INS-B -> PROC-A: reporte de ciclo cerrado de 2 nodos."""
    catalogo = Catalogo()
    catalogo.registrar_elemento(Elemento.crear("PROV-X", "PROVEEDOR", "Proveedor X"))
    catalogo.registrar_elemento(Elemento.crear("PROC-A", "PROCESO", "Proceso A"))
    catalogo.registrar_elemento(Elemento.crear("INS-B", "INSUMO", "Insumo B"))
    # Asociar INS-B a un proveedor antes de enlazarlo a PROC-A.
    catalogo.registrar_dependencia("PROV-X", "INS-B")
    catalogo.registrar_dependencia("PROC-A", "INS-B")
    catalogo.registrar_dependencia("INS-B", "PROC-A")

    cliente = TestClient(crear_aplicacion(catalogo))
    respuesta = cliente.get("/api/v1/orden-produccion")

    assert respuesta.status_code == 409
    cuerpo = respuesta.json()
    campos = {detalle["campo"]: detalle["mensaje"] for detalle in cuerpo["error"]["detalles"]}
    ciclo = [c.strip() for c in campos["ciclo"].split(" -> ")]
    assert ciclo == ["INS-B", "PROC-A", "INS-B"] or ciclo == ["PROC-A", "INS-B", "PROC-A"]
    assert set(campos["elementosBloqueados"].split(", ")) == {"PROC-A", "INS-B"}


def test_limite_elemento_inexistente_no_afecta_orden_produccion() -> None:
    """El orden de producción se calcula sobre el catálogo real; no hay parámetro de consulta."""
    cliente = _cliente_con_datos()
    respuesta = cliente.get("/api/v1/orden-produccion")
    assert respuesta.status_code == 200
    assert respuesta.json()["totalPasos"] == 6


def test_limite_todos_los_elementos_tienen_tipo_y_nombre_en_orden() -> None:
    """Cada paso del orden incluye id, tipo y nombre (AMB-F3-01)."""
    cliente = _cliente_con_datos()
    respuesta = cliente.get("/api/v1/orden-produccion")
    cuerpo = respuesta.json()
    for paso in cuerpo["orden"]:
        assert set(paso.keys()) == {"paso", "id", "tipo", "nombre"}
        assert isinstance(paso["paso"], int)
        assert paso["tipo"] in TipoElemento.valores_admitidos()
        assert isinstance(paso["nombre"], str) and len(paso["nombre"]) >= 3
