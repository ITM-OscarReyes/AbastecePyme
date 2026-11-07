"""QA independiente de F3 — Orden de producción y ciclos.

Este archivo complementa ``test_orden_produccion.py`` y verifica, contra la API
real montada sobre ``crear_aplicacion``, los criterios AC-F3-01 a AC-F3-11 y
los casos límite solicitados para la revisión de QA:

- DAG con precedencias válidas, determinismo y desempate por ``id``.
- Ciclos directos (2 nodos), indirectos (4 nodos), múltiples ciclos y ciclos
  que comparten nodos.
- Nodos aislados, grafo vacío, un solo elemento y componentes disconexas.
- Prohibición absoluta de un orden parcial o falso.
- Sobre de error HTTP 409 exacto y ausencia de campos de orden.
- Integración F1/F2: alta por HTTP, consulta de grafo e impacto, alta y baja
  de la arista que crea el ciclo.
- Rendimiento O(|V| + |E|) y ausencia de NetworkX en el dominio.
- Contradicciones documentales detectadas (se prueban como evidencia, sin
  modificar el código de producción).

Los grafos se construyen respetando las reglas de dependencia por tipo de F1
(``docs/requirements.md`` §10.1). Por eso algunos ejemplos literales de los
criterios no son registrables por la API; esas contradicciones se documentan
en las pruebas cuyo nombre contiene ``documentacion``.
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

# ---------------------------------------------------------------------------
# Utilidades
# ---------------------------------------------------------------------------

ElementoPrueba = tuple[str, str, str]


def _catalogo(
    elementos: tuple[ElementoPrueba, ...],
    dependencias: tuple[tuple[str, str], ...] = (),
) -> Catalogo:
    """Construye un catálogo de dominio respetando las validaciones reales."""
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


def _obtener_orden(cliente: TestClient):
    return cliente.get("/api/v1/orden-produccion")


def _ids_orden(cuerpo: dict) -> list[str]:
    return [paso["id"] for paso in cuerpo["orden"]]


def _pasos_por_id(cuerpo: dict) -> dict[str, int]:
    return {paso["id"]: paso["paso"] for paso in cuerpo["orden"]}


def _detalles_por_campo(cuerpo: dict) -> dict[str, str]:
    return {
        detalle["campo"]: detalle["mensaje"]
        for detalle in cuerpo["error"]["detalles"]
    }


def _ciclo_como_lista(cuerpo: dict) -> list[str]:
    return [parte.strip() for parte in _detalles_por_campo(cuerpo)["ciclo"].split(" -> ")]


def _bloqueados_como_lista(cuerpo: dict) -> list[str]:
    return [
        parte.strip()
        for parte in _detalles_por_campo(cuerpo)["elementosBloqueados"].split(", ")
    ]


def _afirmar_sobre_error_ciclico(respuesta) -> dict:
    """Comprueba el contrato HTTP 409 de ERR-10 y devuelve el cuerpo."""
    assert respuesta.status_code == 409, respuesta.text
    assert respuesta.headers["content-type"].startswith("application/json")

    cuerpo = respuesta.json()
    assert set(cuerpo) == {"error"}
    error = cuerpo["error"]
    assert set(error) == {"codigo", "mensaje", "detalles"}
    assert error["codigo"] == "CONFIGURACION_CICLICA"
    assert "dependencias circulares" in error["mensaje"].lower()
    assert isinstance(error["detalles"], list) and error["detalles"]

    for detalle in error["detalles"]:
        assert set(detalle) == {"campo", "mensaje"}
        assert isinstance(detalle["campo"], str) and detalle["campo"]
        assert isinstance(detalle["mensaje"], str)

    campos = {detalle["campo"] for detalle in error["detalles"]}
    assert "ciclo" in campos
    assert "elementosBloqueados" in campos

    # RF-F3-05: el error no puede disfrazarse de una respuesta de orden.
    assert "orden" not in cuerpo
    assert "esDag" not in cuerpo
    assert "totalPasos" not in cuerpo
    return cuerpo


def _afirmar_ciclo_cerrado_y_existente(
    ciclo: list[str],
    dependencias: tuple[tuple[str, str], ...],
    ids_elementos: set[str],
) -> None:
    assert len(ciclo) >= 3, ciclo
    assert ciclo[0] == ciclo[-1], ciclo
    assert set(ciclo).issubset(ids_elementos)
    aristas = set(dependencias)
    for actual, siguiente in zip(ciclo, ciclo[1:]):
        assert (actual, siguiente) in aristas, (
            f"El ciclo reportado contiene una arista inexistente: {actual} -> {siguiente}"
        )


# Conjunto acíclico válido equivalente al escenario de AC-F3-01.
ELEMENTOS_DAG: tuple[ElementoPrueba, ...] = (
    ("PROV-ACERO", "PROVEEDOR", "Proveedor de acero"),
    ("INS-BARRA", "INSUMO", "Barra de acero"),
    ("INS-TORNILLO", "INSUMO", "Tornillo hexagonal M6"),
    ("PROC-CORTE", "PROCESO", "Corte de panel"),
    ("PROD-PANEL", "PRODUCTO", "Panel de montaje"),
    ("PROD-BANCO", "PRODUCTO", "Banco de montaje"),
)

DEPENDENCIAS_DAG: tuple[tuple[str, str], ...] = (
    ("PROV-ACERO", "INS-BARRA"),
    ("PROV-ACERO", "INS-TORNILLO"),
    ("INS-BARRA", "PROC-CORTE"),
    ("INS-TORNILLO", "PROC-CORTE"),
    ("PROC-CORTE", "PROD-PANEL"),
    ("PROC-CORTE", "PROD-BANCO"),
)

# Orden Kahn determinista para DEPENDENCIAS_DAG:
#   PROV-ACERO habilita a INS-BARRA e INS-TORNILLO; al completarse ambos,
#   PROC-CORTE queda disponible y habilita a PROD-BANCO y PROD-PANEL. Entre
#   estos dos, PROD-BANCO < PROD-PANEL.
ORDEN_ESPERADO_DAG: tuple[str, ...] = (
    "PROV-ACERO",
    "INS-BARRA",
    "INS-TORNILLO",
    "PROC-CORTE",
    "PROD-BANCO",
    "PROD-PANEL",
)


# ---------------------------------------------------------------------------
# AC-F3-01 / AC-F3-02 · DAG, precedencias y determinismo
# ---------------------------------------------------------------------------


def test_qa_f3_01_dag_valido_respeta_precedencias_y_total_pasos() -> None:
    """AC-F3-01 (intención): 200, esDag true, orden completo y precedencias."""
    cliente = _cliente(ELEMENTOS_DAG, DEPENDENCIAS_DAG)
    respuesta = _obtener_orden(cliente)

    assert respuesta.status_code == 200, respuesta.text
    cuerpo = respuesta.json()
    assert cuerpo["esDag"] is True
    assert cuerpo["totalPasos"] == len(ELEMENTOS_DAG) == 6
    assert _ids_orden(cuerpo) == list(ORDEN_ESPERADO_DAG)
    assert [paso["paso"] for paso in cuerpo["orden"]] == list(range(1, 7))

    pasos = _pasos_por_id(cuerpo)
    for origen, destino in DEPENDENCIAS_DAG:
        assert pasos[origen] < pasos[destino], (
            f"Precedencia violada: {origen} (paso {pasos[origen]}) -> "
            f"{destino} (paso {pasos[destino]})"
        )

    # El orden incluye exactamente una vez cada elemento, con sus metadatos.
    assert len(_ids_orden(cuerpo)) == len(set(_ids_orden(cuerpo)))
    for paso in cuerpo["orden"]:
        assert set(paso) == {"paso", "id", "tipo", "nombre"}
        assert paso["tipo"] in {"PROVEEDOR", "INSUMO", "PROCESO", "PRODUCTO"}
        assert paso["nombre"]


def test_qa_f3_02_desempate_ascendente_por_id_y_repeticion() -> None:
    """AC-F3-02: INS-TORNILLO < PROV-ACERO cuando ambos tienen in-degree 0."""
    cliente = _cliente(
        (
            ("PROV-ACERO", "PROVEEDOR", "Proveedor de acero"),
            ("INS-TORNILLO", "INSUMO", "Tornillo hexagonal M6"),
        )
    )

    primera = _obtener_orden(cliente)
    segunda = _obtener_orden(cliente)

    assert primera.status_code == segunda.status_code == 200
    assert primera.json() == segunda.json()
    assert _ids_orden(primera.json()) == ["INS-TORNILLO", "PROV-ACERO"]


def test_qa_f3_02_desempate_en_cada_nivel_del_dag() -> None:
    """AC-F3-02: el desempate por id se aplica en cada nivel, no solo al inicio."""
    cliente = _cliente(ELEMENTOS_DAG, DEPENDENCIAS_DAG)
    cuerpo = _obtener_orden(cliente).json()

    # Tras PROC-CORTE quedan disponibles PROD-BANCO y PROD-PANEL a la vez.
    ids = _ids_orden(cuerpo)
    assert ids.index("PROD-BANCO") < ids.index("PROD-PANEL")

    # El primer elemento disponible es único; después INS-BARRA < INS-TORNILLO.
    assert ids[0] == "PROV-ACERO"
    assert ids.index("INS-BARRA") < ids.index("INS-TORNILLO")


def test_qa_f3_01_documentacion_el_ejemplo_literal_no_es_registrable() -> None:
    """Evidencia: el Given literal de AC-F3-01 viola las reglas de F1.

    ``INS-TORNILLO -> PROD-PANEL`` exige que el insumo esté asociado antes a un
    proveedor o proceso, y ``PROD-PANEL -> PROD-BANCO`` es una relación
    PRODUCTO -> PRODUCTO, prohibida. El criterio no puede ejecutarse tal cual
    por la API real.
    """
    cliente = TestClient(crear_aplicacion(Catalogo()))
    for id_valor, tipo, nombre in ELEMENTOS_DAG:
        respuesta = cliente.post(
            "/api/v1/elementos",
            json={"id": id_valor, "tipo": tipo, "nombre": nombre},
        )
        assert respuesta.status_code == 201, respuesta.text

    assert (
        cliente.post(
            "/api/v1/dependencias",
            json={"origen": "PROV-ACERO", "destino": "INS-BARRA"},
        ).status_code
        == 201
    )
    assert (
        cliente.post(
            "/api/v1/dependencias",
            json={"origen": "INS-BARRA", "destino": "PROC-CORTE"},
        ).status_code
        == 201
    )
    assert (
        cliente.post(
            "/api/v1/dependencias",
            json={"origen": "PROC-CORTE", "destino": "PROD-PANEL"},
        ).status_code
        == 201
    )

    sin_asociacion = cliente.post(
        "/api/v1/dependencias",
        json={"origen": "INS-TORNILLO", "destino": "PROD-PANEL"},
    )
    assert sin_asociacion.status_code == 422, sin_asociacion.text
    assert sin_asociacion.json()["error"]["codigo"] == "DEPENDENCIA_INVALIDA"

    producto_a_producto = cliente.post(
        "/api/v1/dependencias",
        json={"origen": "PROD-PANEL", "destino": "PROD-BANCO"},
    )
    assert producto_a_producto.status_code == 422, producto_a_producto.text
    assert producto_a_producto.json()["error"]["codigo"] == "DEPENDENCIA_INVALIDA"


# ---------------------------------------------------------------------------
# AC-F3-03 / AC-F3-04 / AC-F3-05 · Ciclos y prohibición de orden falso
# ---------------------------------------------------------------------------


def test_qa_f3_03_ciclo_directo_responde_409_con_reporte_completo() -> None:
    """AC-F3-03: ciclo INS-BARRA <-> PROC-CORTE, 409 y reporte útil."""
    dependencias = (
        ("PROV-ACERO", "INS-BARRA"),
        ("INS-BARRA", "PROC-CORTE"),
        ("PROC-CORTE", "INS-BARRA"),
        ("PROC-CORTE", "PROD-PANEL"),
        ("PROC-CORTE", "PROD-BANCO"),
    )
    elementos = (
        ("PROV-ACERO", "PROVEEDOR", "Proveedor de acero"),
        ("INS-BARRA", "INSUMO", "Barra de acero"),
        ("PROC-CORTE", "PROCESO", "Corte de panel"),
        ("PROD-PANEL", "PRODUCTO", "Panel de montaje"),
        ("PROD-BANCO", "PRODUCTO", "Banco de montaje"),
    )
    cliente = _cliente(elementos, dependencias)
    respuesta = _obtener_orden(cliente)

    cuerpo = _afirmar_sobre_error_ciclico(respuesta)
    ciclo = _ciclo_como_lista(cuerpo)
    _afirmar_ciclo_cerrado_y_existente(
        ciclo, dependencias, {elemento[0] for elemento in elementos}
    )
    assert ciclo == ["INS-BARRA", "PROC-CORTE", "INS-BARRA"]

    bloqueados = _bloqueados_como_lista(cuerpo)
    assert bloqueados == sorted(bloqueados), "La lista de bloqueados debe ser determinista"
    assert set(bloqueados) == {"INS-BARRA", "PROC-CORTE", "PROD-BANCO", "PROD-PANEL"}
    # PROV-ACERO sí pudo ordenarse antes del ciclo: no está bloqueado.
    assert "PROV-ACERO" not in bloqueados


def test_qa_f3_04_ciclo_indirecto_de_cuatro_nodos_y_nodo_desconectado() -> None:
    """AC-F3-04 (intención): ciclo largo + nodo aislado, sin orden parcial."""
    elementos = (
        ("PROC-A", "PROCESO", "Proceso A"),
        ("INS-B", "INSUMO", "Insumo B"),
        ("PROC-C", "PROCESO", "Proceso C"),
        ("INS-D", "INSUMO", "Insumo D"),
        ("PROV-OTRO", "PROVEEDOR", "Proveedor desconectado"),
    )
    dependencias = (
        ("PROC-A", "INS-B"),
        ("INS-B", "PROC-C"),
        ("PROC-C", "INS-D"),
        ("INS-D", "PROC-A"),
    )
    cliente = _cliente(elementos, dependencias)
    respuesta = _obtener_orden(cliente)

    cuerpo = _afirmar_sobre_error_ciclico(respuesta)
    ciclo = _ciclo_como_lista(cuerpo)
    _afirmar_ciclo_cerrado_y_existente(
        ciclo, dependencias, {elemento[0] for elemento in elementos}
    )
    assert set(ciclo) == {"PROC-A", "INS-B", "PROC-C", "INS-D"}

    bloqueados = _bloqueados_como_lista(cuerpo)
    assert set(bloqueados) == {"PROC-A", "INS-B", "PROC-C", "INS-D"}
    assert "PROV-OTRO" not in bloqueados
    assert "orden" not in cuerpo


def test_qa_f3_04_documentacion_ciclo_de_tres_elementos_no_es_registrable() -> None:
    """Evidencia: un ciclo A -> B -> C -> A viola las reglas de tipo de F1.

    Con solo INSUMO y PROCESO como tipos capaces de formar ciclos (PROVEEDOR no
    admite entrantes y PRODUCTO es terminal), todo ciclo debe alternar tipos y
    por tanto tiene longitud par. Un ciclo de 3 exige una arista del mismo tipo.
    """
    cliente = TestClient(crear_aplicacion(Catalogo()))
    for id_valor, tipo, nombre in (
        ("PROC-A", "PROCESO", "Proceso A"),
        ("INS-B", "INSUMO", "Insumo B"),
        ("PROC-C", "PROCESO", "Proceso C"),
    ):
        assert (
            cliente.post(
                "/api/v1/elementos",
                json={"id": id_valor, "tipo": tipo, "nombre": nombre},
            ).status_code
            == 201
        )

    assert (
        cliente.post(
            "/api/v1/dependencias",
            json={"origen": "PROC-A", "destino": "INS-B"},
        ).status_code
        == 201
    )
    assert (
        cliente.post(
            "/api/v1/dependencias",
            json={"origen": "INS-B", "destino": "PROC-C"},
        ).status_code
        == 201
    )
    cierre = cliente.post(
        "/api/v1/dependencias",
        json={"origen": "PROC-C", "destino": "PROC-A"},
    )
    assert cierre.status_code == 422, cierre.text
    assert cierre.json()["error"]["codigo"] == "DEPENDENCIA_INVALIDA"


def test_qa_f3_05_multiples_escenarios_ciclicos_nunca_emiten_orden() -> None:
    """AC-F3-05: cualquier configuración con ciclo responde 409 sin orden."""
    escenarios: list[tuple[str, tuple[ElementoPrueba, ...], tuple[tuple[str, str], ...]]] = [
        (
            "ciclo de dos nodos con predecesor y sucesores",
            (
                ("PROV-A", "PROVEEDOR", "Proveedor A"),
                ("INS-B", "INSUMO", "Insumo B"),
                ("PROC-C", "PROCESO", "Proceso C"),
                ("PROD-D", "PRODUCTO", "Producto D"),
            ),
            (
                ("PROV-A", "INS-B"),
                ("INS-B", "PROC-C"),
                ("PROC-C", "INS-B"),
                ("PROC-C", "PROD-D"),
            ),
        ),
        (
            "ciclo indirecto de cuatro nodos",
            (
                ("PROC-A", "PROCESO", "Proceso A"),
                ("INS-B", "INSUMO", "Insumo B"),
                ("PROC-C", "PROCESO", "Proceso C"),
                ("INS-D", "INSUMO", "Insumo D"),
            ),
            (
                ("PROC-A", "INS-B"),
                ("INS-B", "PROC-C"),
                ("PROC-C", "INS-D"),
                ("INS-D", "PROC-A"),
            ),
        ),
        (
            "dos ciclos disjuntos",
            (
                ("PROV-X", "PROVEEDOR", "Proveedor X"),
                ("INS-B", "INSUMO", "Insumo B"),
                ("PROC-C", "PROCESO", "Proceso C"),
                ("INS-D", "INSUMO", "Insumo D"),
                ("PROC-E", "PROCESO", "Proceso E"),
            ),
            (
                ("PROV-X", "INS-B"),
                ("INS-B", "PROC-C"),
                ("PROC-C", "INS-B"),
                ("PROV-X", "INS-D"),
                ("INS-D", "PROC-E"),
                ("PROC-E", "INS-D"),
            ),
        ),
        (
            "ciclo con nodo aislado",
            (
                ("PROV-OTRO", "PROVEEDOR", "Proveedor aislado"),
                ("PROC-A", "PROCESO", "Proceso A"),
                ("INS-B", "INSUMO", "Insumo B"),
            ),
            (
                ("PROC-A", "INS-B"),
                ("INS-B", "PROC-A"),
            ),
        ),
    ]

    for nombre, elementos, dependencias in escenarios:
        cliente = _cliente(elementos, dependencias)
        respuesta = _obtener_orden(cliente)
        cuerpo = _afirmar_sobre_error_ciclico(respuesta)
        assert cuerpo["error"]["codigo"] == "CONFIGURACION_CICLICA", nombre
        assert "orden" not in cuerpo, nombre
        assert "totalPasos" not in cuerpo, nombre


def test_qa_f3_05_multiples_ciclos_reportan_el_primero_determinista() -> None:
    """AMB-F3-03: dos ciclos disjuntos -> primer ciclo elemental por id."""
    elementos = (
        ("PROV-X", "PROVEEDOR", "Proveedor X"),
        ("INS-B", "INSUMO", "Insumo B"),
        ("PROC-C", "PROCESO", "Proceso C"),
        ("INS-D", "INSUMO", "Insumo D"),
        ("PROC-E", "PROCESO", "Proceso E"),
    )
    dependencias = (
        ("PROV-X", "INS-B"),
        ("INS-B", "PROC-C"),
        ("PROC-C", "INS-B"),
        ("PROV-X", "INS-D"),
        ("INS-D", "PROC-E"),
        ("PROC-E", "INS-D"),
    )
    cliente = _cliente(elementos, dependencias)

    reportes = []
    for _ in range(5):
        cuerpo = _afirmar_sobre_error_ciclico(_obtener_orden(cliente))
        reportes.append(
            (_detalles_por_campo(cuerpo)["ciclo"], _detalles_por_campo(cuerpo)["elementosBloqueados"])
        )

    assert len(set(reportes)) == 1, "El reporte de ciclos debe ser determinista"
    ciclo, bloqueados = reportes[0]
    assert ciclo == "INS-B -> PROC-C -> INS-B"
    assert set(bloqueados.split(", ")) == {"INS-B", "INS-D", "PROC-C", "PROC-E"}
    assert "PROV-X" not in bloqueados


def test_qa_f3_04_ciclos_que_comparten_un_nodo() -> None:
    """Ciclos que comparten nodo: se reporta uno cerrado y se bloquean todos."""
    elementos = (
        ("PROV-X", "PROVEEDOR", "Proveedor X"),
        ("INS-B", "INSUMO", "Insumo B"),
        ("PROC-C", "PROCESO", "Proceso C"),
        ("PROC-E", "PROCESO", "Proceso E"),
    )
    dependencias = (
        ("PROV-X", "INS-B"),
        ("INS-B", "PROC-C"),
        ("PROC-C", "INS-B"),
        ("INS-B", "PROC-E"),
        ("PROC-E", "INS-B"),
    )
    cliente = _cliente(elementos, dependencias)

    cuerpo = _afirmar_sobre_error_ciclico(_obtener_orden(cliente))
    ciclo = _ciclo_como_lista(cuerpo)
    _afirmar_ciclo_cerrado_y_existente(
        ciclo, dependencias, {elemento[0] for elemento in elementos}
    )
    assert ciclo == ["INS-B", "PROC-C", "INS-B"]
    assert set(_bloqueados_como_lista(cuerpo)) == {"INS-B", "PROC-C", "PROC-E"}


# ---------------------------------------------------------------------------
# AC-F3-06 · Casos límite estructurales
# ---------------------------------------------------------------------------


def test_qa_f3_06_grafo_vacio_es_dag_trivial() -> None:
    """AC-F3-06: V = ∅, E = ∅ -> 200, esDag true, orden [] y total 0."""
    respuesta = _obtener_orden(TestClient(crear_aplicacion(Catalogo())))

    assert respuesta.status_code == 200, respuesta.text
    assert respuesta.json() == {"esDag": True, "orden": [], "totalPasos": 0}


def test_qa_f3_06b_elementos_aislados_en_orden_alfabetico() -> None:
    """AC-F3-06b: tres elementos sin aristas -> orden alfabético por id."""
    elementos = (
        ("PROD-C", "PRODUCTO", "Producto C"),
        ("PROD-A", "PRODUCTO", "Producto A"),
        ("PROD-B", "PRODUCTO", "Producto B"),
    )
    respuesta = _obtener_orden(_cliente(elementos))

    assert respuesta.status_code == 200, respuesta.text
    cuerpo = respuesta.json()
    assert cuerpo["esDag"] is True
    assert cuerpo["totalPasos"] == 3
    assert _ids_orden(cuerpo) == ["PROD-A", "PROD-B", "PROD-C"]
    assert [paso["paso"] for paso in cuerpo["orden"]] == [1, 2, 3]


def test_qa_f3_06c_dos_cadenas_independientes_orden_global() -> None:
    """AC-F3-06c (intención): dos cadenas acíclicas desconectadas -> orden único."""
    elementos = (
        ("PROV-CAD1", "PROVEEDOR", "Proveedor cadena 1"),
        ("CAD1-INS", "INSUMO", "Insumo cadena 1"),
        ("CAD1-PROD", "PRODUCTO", "Producto cadena 1"),
        ("PROV-CAD2", "PROVEEDOR", "Proveedor cadena 2"),
        ("CAD2-INS", "INSUMO", "Insumo cadena 2"),
        ("CAD2-PROD", "PRODUCTO", "Producto cadena 2"),
    )
    dependencias = (
        ("PROV-CAD1", "CAD1-INS"),
        ("CAD1-INS", "CAD1-PROD"),
        ("PROV-CAD2", "CAD2-INS"),
        ("CAD2-INS", "CAD2-PROD"),
    )
    respuesta = _obtener_orden(_cliente(elementos, dependencias))

    assert respuesta.status_code == 200, respuesta.text
    cuerpo = respuesta.json()
    assert cuerpo["esDag"] is True
    assert cuerpo["totalPasos"] == 6
    assert _ids_orden(cuerpo) == [
        "PROV-CAD1",
        "CAD1-INS",
        "CAD1-PROD",
        "PROV-CAD2",
        "CAD2-INS",
        "CAD2-PROD",
    ]
    pasos = _pasos_por_id(cuerpo)
    assert pasos["CAD1-INS"] < pasos["CAD1-PROD"]
    assert pasos["CAD2-INS"] < pasos["CAD2-PROD"]


def test_qa_f3_06c_documentacion_las_cadenas_literales_requieren_proveedor() -> None:
    """Evidencia: CAD1-INS -> CAD1-PROD literal no es registrable sin proveedor."""
    cliente = TestClient(crear_aplicacion(Catalogo()))
    for id_valor, tipo, nombre in (
        ("CAD1-INS", "INSUMO", "Insumo cadena 1"),
        ("CAD1-PROD", "PRODUCTO", "Producto cadena 1"),
    ):
        assert (
            cliente.post(
                "/api/v1/elementos",
                json={"id": id_valor, "tipo": tipo, "nombre": nombre},
            ).status_code
            == 201
        )

    respuesta = cliente.post(
        "/api/v1/dependencias",
        json={"origen": "CAD1-INS", "destino": "CAD1-PROD"},
    )
    assert respuesta.status_code == 422, respuesta.text
    assert respuesta.json()["error"]["codigo"] == "DEPENDENCIA_INVALIDA"


def test_qa_f3_06d_un_solo_elemento_sin_dependencias() -> None:
    """Caso límite adicional: |V| = 1 y |E| = 0 -> un único paso."""
    respuesta = _obtener_orden(
        _cliente((("PROD-SOLO", "PRODUCTO", "Producto único"),))
    )

    assert respuesta.status_code == 200, respuesta.text
    cuerpo = respuesta.json()
    assert cuerpo["esDag"] is True
    assert cuerpo["totalPasos"] == 1
    assert cuerpo["orden"] == [
        {
            "paso": 1,
            "id": "PROD-SOLO",
            "tipo": "PRODUCTO",
            "nombre": "Producto único",
        }
    ]


# ---------------------------------------------------------------------------
# Integración F1/F2 y ciclo dinámico
# ---------------------------------------------------------------------------


def _registrar_elemento_http(cliente: TestClient, id_valor: str, tipo: str, nombre: str) -> None:
    respuesta = cliente.post(
        "/api/v1/elementos",
        json={"id": id_valor, "tipo": tipo, "nombre": nombre},
    )
    assert respuesta.status_code == 201, respuesta.text


def _registrar_dependencia_http(cliente: TestClient, origen: str, destino: str) -> None:
    respuesta = cliente.post(
        "/api/v1/dependencias",
        json={"origen": origen, "destino": destino},
    )
    assert respuesta.status_code == 201, respuesta.text


def test_qa_f3_integracion_f1_f2_ciclo_dinamico_y_reversion() -> None:
    """F1 -> F3 -> F2: alta por HTTP, ciclo, 409, baja de arista y 200 de nuevo."""
    cliente = TestClient(crear_aplicacion(Catalogo()))
    _registrar_elemento_http(cliente, "PROV-QA", "PROVEEDOR", "Proveedor QA")
    _registrar_elemento_http(cliente, "INS-QA", "INSUMO", "Insumo QA")
    _registrar_elemento_http(cliente, "PROC-QA", "PROCESO", "Proceso QA")
    _registrar_elemento_http(cliente, "PROD-QA", "PRODUCTO", "Producto QA")
    _registrar_dependencia_http(cliente, "PROV-QA", "INS-QA")
    _registrar_dependencia_http(cliente, "INS-QA", "PROC-QA")
    _registrar_dependencia_http(cliente, "PROC-QA", "PROD-QA")

    orden_inicial = _obtener_orden(cliente)
    assert orden_inicial.status_code == 200, orden_inicial.text
    assert _ids_orden(orden_inicial.json()) == [
        "PROV-QA",
        "INS-QA",
        "PROC-QA",
        "PROD-QA",
    ]

    # F1 sigue exponiendo el grafo real que F3 acaba de ordenar.
    grafo = cliente.get("/api/v1/grafo")
    assert grafo.status_code == 200
    assert grafo.json()["resumen"] == {
        "totalElementos": 4,
        "totalDependencias": 3,
    }

    # F2 sigue calculando impacto con el mismo catálogo.
    impacto = cliente.get("/api/v1/impacto/PROV-QA")
    assert impacto.status_code == 200
    assert [elemento["id"] for elemento in impacto.json()["afectados"]] == [
        "INS-QA",
        "PROC-QA",
        "PROD-QA",
    ]

    # F1 permite ciclos: se añade PROC-QA -> INS-QA y F3 debe detectarlo.
    _registrar_dependencia_http(cliente, "PROC-QA", "INS-QA")
    ciclo = _afirmar_sobre_error_ciclico(_obtener_orden(cliente))
    assert set(_ciclo_como_lista(ciclo)) == {"INS-QA", "PROC-QA"}

    # F2 sigue respondiendo sin entrar en un ciclo infinito.
    impacto_con_ciclo = cliente.get("/api/v1/impacto/PROV-QA")
    assert impacto_con_ciclo.status_code == 200
    assert {elemento["id"] for elemento in impacto_con_ciclo.json()["afectados"]} >= {
        "INS-QA",
        "PROC-QA",
        "PROD-QA",
    }

    # Al eliminar la arista conflictiva, F3 vuelve a producir un orden válido.
    baja = cliente.delete("/api/v1/dependencias/PROC-QA/INS-QA")
    assert baja.status_code == 204, baja.text
    orden_restaurado = _obtener_orden(cliente)
    assert orden_restaurado.status_code == 200, orden_restaurado.text
    assert _ids_orden(orden_restaurado.json()) == [
        "PROV-QA",
        "INS-QA",
        "PROC-QA",
        "PROD-QA",
    ]


# ---------------------------------------------------------------------------
# AC-F3-08 · Sin NetworkX
# ---------------------------------------------------------------------------


def test_qa_f3_08_sin_networkx_y_con_algoritmos_propios() -> None:
    """AC-F3-08: el dominio no importa NetworkX ni usa sus algoritmos."""
    modulos_importados: set[str] = set()
    for ruta in (RAIZ_BACKEND / "app").rglob("*.py"):
        arbol = ast.parse(ruta.read_text(encoding="utf-8"))
        for nodo in ast.walk(arbol):
            if isinstance(nodo, ast.Import):
                modulos_importados.update(alias.name.split(".")[0] for alias in nodo.names)
            elif isinstance(nodo, ast.ImportFrom) and nodo.module and nodo.level == 0:
                modulos_importados.add(nodo.module.split(".")[0])

    assert "networkx" not in modulos_importados

    contenido_catalogo = (RAIZ_BACKEND / "app" / "dominio" / "catalogo.py").read_text(
        encoding="utf-8"
    )
    assert "def orden_produccion" in contenido_catalogo
    assert "def _detectar_ciclo" in contenido_catalogo
    for prohibido in ("topological_sort", "simple_cycles", "lexicographical_topological_sort"):
        assert prohibido not in contenido_catalogo


# ---------------------------------------------------------------------------
# AC-F3-09 · Complejidad lineal
# ---------------------------------------------------------------------------


def test_qa_f3_09_grafo_200_elementos_500_dependencias_bajo_100_ms() -> None:
    """AC-F3-09: 200 elementos y 500 dependencias en menos de 100 ms."""
    catalogo = Catalogo()
    proveedores = [f"PROV-{indice:04d}" for indice in range(100)]
    insumos = [f"INS-{indice:04d}" for indice in range(100)]
    for id_valor in proveedores:
        catalogo.registrar_elemento(
            Elemento.crear(id_valor, "PROVEEDOR", f"Proveedor {id_valor}")
        )
    for id_valor in insumos:
        catalogo.registrar_elemento(
            Elemento.crear(id_valor, "INSUMO", f"Insumo {id_valor}")
        )

    dependencias: list[tuple[str, str]] = []
    for indice_insumo in range(100):
        for desplazamiento in range(5):
            proveedor = proveedores[(indice_insumo * 5 + desplazamiento) % 100]
            dependencia = (proveedor, insumos[indice_insumo])
            catalogo.registrar_dependencia(*dependencia)
            dependencias.append(dependencia)
    assert len(dependencias) == 500

    cliente = TestClient(crear_aplicacion(catalogo))
    # Calentamiento para separar el costo del algoritmo del primer montaje HTTP.
    assert _obtener_orden(cliente).status_code == 200

    duraciones = []
    for _ in range(3):
        inicio = time.perf_counter()
        respuesta = _obtener_orden(cliente)
        duraciones.append((time.perf_counter() - inicio) * 1000)

    assert respuesta.status_code == 200, respuesta.text
    cuerpo = respuesta.json()
    assert cuerpo["totalPasos"] == 200
    assert len(cuerpo["orden"]) == 200

    pasos = _pasos_por_id(cuerpo)
    for origen, destino in dependencias:
        assert pasos[origen] < pasos[destino]

    mejor = min(duraciones)
    assert mejor < 100.0, (
        f"El orden de producción tardó {mejor:.2f} ms (esperado < 100 ms); "
        f"muestras: {[round(d, 2) for d in duraciones]}"
    )


# ---------------------------------------------------------------------------
# AC-F3-10 · Determinismo byte a byte
# ---------------------------------------------------------------------------


def test_qa_f3_10_diez_ejecuciones_byte_a_byte_en_dag_y_ciclo() -> None:
    """AC-F3-10: diez respuestas consecutivas idénticas en DAG y en ciclo."""
    cliente_dag = _cliente(ELEMENTOS_DAG, DEPENDENCIAS_DAG)
    cliente_ciclo = _cliente(
        ELEMENTOS_DAG,
        DEPENDENCIAS_DAG + (("PROC-CORTE", "INS-BARRA"),),
    )

    respuestas_dag = [_obtener_orden(cliente_dag).content for _ in range(10)]
    respuestas_ciclo = [_obtener_orden(cliente_ciclo).content for _ in range(10)]

    assert all(respuesta == respuestas_dag[0] for respuesta in respuestas_dag)
    assert all(respuesta == respuestas_ciclo[0] for respuesta in respuestas_ciclo)
    assert respuestas_dag[0] != respuestas_ciclo[0]
