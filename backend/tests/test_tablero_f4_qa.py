"""QA independiente de F4 — Tablero de abastecimiento demostrable.

Verifica contra la API real montada sobre ``crear_aplicacion`` los criterios
AC-F4-01 a AC-F4-15 de ``docs/acceptance-criteria.md`` §11 y el contrato de
``docs/api-contract.md`` §10 que F4 añade o condiciona:

- Perfiles de demostración (AC-F4-07).
- Ciclo de vida de la sesión y validación del perfil (AC-F4-07b, AC-F4-07c).
- Sesión en memoria que se pierde al reiniciar (AC-F4-07d).
- Extracción del token ``Authorization: Bearer`` y sus bordes.
- Autorización de las seis rutas de escritura (AC-F4-08, 08b, 08c, 08d).
- Lecturas abiertas sin sesión y con ambos perfiles (AC-F4-08e).
- Catálogo intacto tras una petición denegada (AC-F4-08f).
- Datos reales que el tablero compone: resumen, impacto, plan y diagnóstico
  (AC-F4-02, 03, 04, 04b, 04c, 05, 05b, 05c).
- Rendimiento de la composición sobre el catálogo de demostración (AC-F4-14).
- Autorización aplicada en el backend (AC-F4-15).

Alcance
-------
Esta suite no modifica ni sustituye las pruebas de F1, F2 o F3. Es
autocontenida: cada prueba crea su propia aplicación con el catálogo que
necesita y no depende del orden de ejecución.

Contradicciones documentadas
----------------------------
AC-F4-05c exige que el Conjunto E (``PROD-SOLO``, producto sin requisitos)
muestre un plan de un único paso. La implementación de F3 marca los productos
aislados como ``INCOMPLETO`` y no devuelve pasos (contradicción AC-F3-01c /
AC-F3-05b ya registrada). El caso se codifica con ``xfail(strict=True)`` para
dejar evidencia sin declararlo PASS; la decisión es del ``analyst``.
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
from app.infraestructura.datos_demostracion import (  # noqa: E402
    poblar_catalogo_demostracion,
)

ElementoPrueba = tuple[str, str, str]
DependenciaPrueba = tuple[str, str]

#: Conjunto A — base acíclica (§8.1 / §11.1).
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

#: Elemento auxiliar para escenarios de escritura (par válido y no existente).
ELEMENTO_CABLE: ElementoPrueba = ("INS-CABLE", "INSUMO", "Cable de conexión")

#: Catálogo usado por la matriz de autorización: A más un insumo libre.
ELEMENTOS_ESCRITURA: tuple[ElementoPrueba, ...] = ELEMENTOS_A + (ELEMENTO_CABLE,)


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
    elementos: tuple[ElementoPrueba, ...] = ELEMENTOS_A,
    dependencias: tuple[DependenciaPrueba, ...] = DEPENDENCIAS_A,
) -> TestClient:
    return TestClient(crear_aplicacion(_catalogo(elementos, dependencias)))


def _cliente_conjunto_a() -> TestClient:
    return _cliente(ELEMENTOS_A, DEPENDENCIAS_A)


def _cliente_escritura() -> TestClient:
    return _cliente(ELEMENTOS_ESCRITURA, DEPENDENCIAS_A)


def _abrir_sesion(cliente: TestClient, perfil: str) -> str:
    respuesta = cliente.post("/api/v1/sesion", json={"perfil": perfil})
    assert respuesta.status_code == 201, respuesta.text
    return respuesta.json()["token"]


def _cabecera(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _codigo_error(respuesta) -> str | None:
    cuerpo = respuesta.json()
    return cuerpo.get("error", {}).get("codigo") if isinstance(cuerpo, dict) else None


def _ids(pasos: list[dict]) -> list[str]:
    return [paso["id"] for paso in pasos]


def _totales_grafo(cliente: TestClient) -> tuple[int, int]:
    resumen = cliente.get("/api/v1/grafo").json()["resumen"]
    return resumen["totalElementos"], resumen["totalDependencias"]


# ---------------------------------------------------------------------------
# AC-F4-07 — Perfiles de demostración
# ---------------------------------------------------------------------------


def test_qa_ac_f4_07_perfiles_dos_y_su_capacidad_de_escritura() -> None:
    respuesta = _cliente_conjunto_a().get("/api/v1/perfiles")

    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    assert cuerpo["total"] == 2
    assert cuerpo["perfiles"] == [
        {
            "id": "COMPRAS",
            "nombre": "Responsable de compras",
            "puedeEscribir": True,
        },
        {
            "id": "PRODUCCION",
            "nombre": "Coordinador de producción",
            "puedeEscribir": False,
        },
    ]


def test_qa_ac_f4_07_perfiles_no_requiere_sesion() -> None:
    """La lista de perfiles se consulta sin cabecera de sesión."""
    cliente = _cliente_conjunto_a()
    sin_sesion = cliente.get("/api/v1/perfiles")

    assert sin_sesion.status_code == 200


# ---------------------------------------------------------------------------
# AC-F4-07b — Ciclo de vida de la sesión
# ---------------------------------------------------------------------------


def test_qa_ac_f4_07b_crear_consultar_y_cerrar_sesion() -> None:
    cliente = _cliente_conjunto_a()

    creacion = cliente.post("/api/v1/sesion", json={"perfil": "COMPRAS"})
    assert creacion.status_code == 201
    cuerpo_creacion = creacion.json()
    token = cuerpo_creacion["token"]
    assert isinstance(token, str) and token
    assert cuerpo_creacion["perfil"] == {
        "id": "COMPRAS",
        "nombre": "Responsable de compras",
        "puedeEscribir": True,
    }

    consulta = cliente.get("/api/v1/sesion", headers=_cabecera(token))
    assert consulta.status_code == 200
    assert consulta.json() == cuerpo_creacion

    cierre = cliente.delete("/api/v1/sesion", headers=_cabecera(token))
    assert cierre.status_code == 204

    invalido = cliente.get("/api/v1/sesion", headers=_cabecera(token))
    assert invalido.status_code == 401
    assert _codigo_error(invalido) == "SESION_REQUERIDA"


def test_qa_ac_f4_07b_sesion_produccion_sin_permiso_de_escritura() -> None:
    cliente = _cliente_conjunto_a()
    token = _abrir_sesion(cliente, "PRODUCCION")

    consulta = cliente.get("/api/v1/sesion", headers=_cabecera(token))
    assert consulta.status_code == 200
    assert consulta.json()["perfil"] == {
        "id": "PRODUCCION",
        "nombre": "Coordinador de producción",
        "puedeEscribir": False,
    }


def test_qa_ac_f4_07b_cerrar_sesion_repetido_o_sin_token_falla() -> None:
    cliente = _cliente_conjunto_a()
    token = _abrir_sesion(cliente, "COMPRAS")

    assert cliente.delete("/api/v1/sesion", headers=_cabecera(token)).status_code == 204
    segundo = cliente.delete("/api/v1/sesion", headers=_cabecera(token))
    assert segundo.status_code == 401
    assert _codigo_error(segundo) == "SESION_REQUERIDA"

    sin_token = cliente.delete("/api/v1/sesion")
    assert sin_token.status_code == 401
    assert _codigo_error(sin_token) == "SESION_REQUERIDA"


# ---------------------------------------------------------------------------
# AC-F4-07c — Validación del perfil
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "cuerpo",
    [
        {"perfil": "NOEXISTE"},
        {"perfil": "compras"},
        {"perfil": 123},
        {"perfil": None},
        {},
    ],
    ids=["desconocido", "minusculas", "numero", "nulo", "ausente"],
)
def test_qa_ac_f4_07c_perfil_invalido_responde_422_sin_crear_sesion(cuerpo: dict) -> None:
    cliente = _cliente_conjunto_a()
    respuesta = cliente.post("/api/v1/sesion", json=cuerpo)

    assert respuesta.status_code == 422
    assert _codigo_error(respuesta) == "VALIDACION_FALLIDA"
    assert "token" not in respuesta.json()


def test_qa_ac_f4_07c_perfil_invalido_no_queda_autenticado() -> None:
    cliente = _cliente_conjunto_a()
    assert cliente.post("/api/v1/sesion", json={"perfil": "NOEXISTE"}).status_code == 422

    assert cliente.get("/api/v1/sesion").status_code == 401


# ---------------------------------------------------------------------------
# AC-F4-07d — Sesión en memoria (se pierde al reiniciar)
# ---------------------------------------------------------------------------


def test_qa_ac_f4_07d_token_deja_de_ser_valido_tras_reiniciar_el_backend() -> None:
    catalogo = _catalogo(ELEMENTOS_A, DEPENDENCIAS_A)
    primera = TestClient(crear_aplicacion(catalogo))
    token = _abrir_sesion(primera, "COMPRAS")

    reiniciada = TestClient(crear_aplicacion(catalogo))
    respuesta = reiniciada.get("/api/v1/sesion", headers=_cabecera(token))

    assert respuesta.status_code == 401
    assert _codigo_error(respuesta) == "SESION_REQUERIDA"


# ---------------------------------------------------------------------------
# Extracción del token — bordes de Authorization
# ---------------------------------------------------------------------------


def test_qa_extraccion_token_esquema_case_insensitive() -> None:
    cliente = _cliente_conjunto_a()
    token = _abrir_sesion(cliente, "COMPRAS")

    for esquema in ("Bearer", "bearer", "BEARER"):
        respuesta = cliente.get(
            "/api/v1/sesion", headers={"Authorization": f"{esquema} {token}"}
        )
        assert respuesta.status_code == 200, esquema


def test_qa_extraccion_token_tolera_espacios_extra() -> None:
    cliente = _cliente_conjunto_a()
    token = _abrir_sesion(cliente, "COMPRAS")

    respuesta = cliente.get(
        "/api/v1/sesion", headers={"Authorization": f"Bearer   {token}  "}
    )
    assert respuesta.status_code == 200


@pytest.mark.parametrize(
    "cabecera",
    [
        "Basic abc",
        "Bearer",
        "Bearer ",
        "Bearer a b",
        "token-suelto",
        "",
    ],
    ids=["otro-esquema", "sin-token", "vacio", "tres-partes", "sin-esquema", "cadena-vacia"],
)
def test_qa_extraccion_token_cabecera_invalida_responde_401(cabecera: str) -> None:
    cliente = _cliente_conjunto_a()
    respuesta = cliente.get("/api/v1/sesion", headers={"Authorization": cabecera})

    assert respuesta.status_code == 401
    assert _codigo_error(respuesta) == "SESION_REQUERIDA"


# ---------------------------------------------------------------------------
# AC-F4-08 / 08b / 08c / 08d — Autorización de escrituras
# ---------------------------------------------------------------------------

#: (nombre, petición, estado esperado con COMPRAS)
RUTAS_ESCRITURA = (
    (
        "POST /elementos",
        lambda cliente, cabecera: cliente.post(
            "/api/v1/elementos",
            json={"id": "INS-NUEVO", "tipo": "INSUMO", "nombre": "Insumo nuevo"},
            headers=cabecera,
        ),
        201,
    ),
    (
        "PUT /elementos/{id}",
        lambda cliente, cabecera: cliente.put(
            "/api/v1/elementos/PROV-ACERO",
            json={"nombre": "Proveedor de acero actualizado"},
            headers=cabecera,
        ),
        200,
    ),
    (
        "DELETE /elementos/{id}",
        lambda cliente, cabecera: cliente.delete(
            "/api/v1/elementos/PROD-BANCO", headers=cabecera
        ),
        204,
    ),
    (
        "POST /dependencias",
        lambda cliente, cabecera: cliente.post(
            "/api/v1/dependencias",
            json={"origen": "PROV-ACERO", "destino": "INS-CABLE"},
            headers=cabecera,
        ),
        201,
    ),
    (
        "PUT /dependencias/{origen}/{destino}",
        lambda cliente, cabecera: cliente.put(
            "/api/v1/dependencias/PROV-ACERO/INS-BARRA",
            json={"origen": "PROV-ACERO", "destino": "INS-CABLE"},
            headers=cabecera,
        ),
        200,
    ),
    (
        "DELETE /dependencias/{origen}/{destino}",
        lambda cliente, cabecera: cliente.delete(
            "/api/v1/dependencias/PROV-ACERO/INS-BARRA", headers=cabecera
        ),
        204,
    ),
)


IDS_ESCRITURA = tuple(nombre for nombre, _peticion, _estado in RUTAS_ESCRITURA)


@pytest.mark.parametrize("nombre, peticion, _estado", RUTAS_ESCRITURA, ids=IDS_ESCRITURA)
def test_qa_ac_f4_08_sin_sesion_responde_401(nombre, peticion, _estado) -> None:
    respuesta = peticion(_cliente_escritura(), None)

    assert respuesta.status_code == 401, nombre
    assert _codigo_error(respuesta) == "SESION_REQUERIDA", nombre


@pytest.mark.parametrize("nombre, peticion, _estado", RUTAS_ESCRITURA, ids=IDS_ESCRITURA)
def test_qa_ac_f4_08b_con_produccion_responde_403(nombre, peticion, _estado) -> None:
    cliente = _cliente_escritura()
    token = _abrir_sesion(cliente, "PRODUCCION")
    respuesta = peticion(cliente, _cabecera(token))

    assert respuesta.status_code == 403, nombre
    assert _codigo_error(respuesta) == "PERMISO_DENEGADO", nombre


@pytest.mark.parametrize("nombre, peticion, estado", RUTAS_ESCRITURA, ids=IDS_ESCRITURA)
def test_qa_ac_f4_08c_con_compras_escribe(nombre, peticion, estado) -> None:
    cliente = _cliente_escritura()
    token = _abrir_sesion(cliente, "COMPRAS")
    respuesta = peticion(cliente, _cabecera(token))

    assert respuesta.status_code == estado, f"{nombre}: {respuesta.text}"


def test_qa_ac_f4_08d_token_desconocido_responde_401_en_toda_escritura() -> None:
    for nombre, peticion, _estado in RUTAS_ESCRITURA:
        respuesta = peticion(_cliente_escritura(), _cabecera("token-inexistente"))
        assert respuesta.status_code == 401, nombre
        assert _codigo_error(respuesta) == "SESION_REQUERIDA", nombre


# ---------------------------------------------------------------------------
# AC-F4-08e — Lecturas abiertas con cualquier sesión
# ---------------------------------------------------------------------------

RUTAS_LECTURA = (
    "/api/v1/elementos",
    "/api/v1/elementos/PROV-ACERO",
    "/api/v1/dependencias",
    "/api/v1/grafo",
    "/api/v1/reglas-dependencia",
    "/api/v1/impacto/INS-BARRA",
    "/api/v1/plan-entrega?productos=PROD-PANEL",
    "/api/v1/orden-produccion",
)


@pytest.mark.parametrize("ruta", RUTAS_LECTURA)
@pytest.mark.parametrize("perfil", [None, "COMPRAS", "PRODUCCION"])
def test_qa_ac_f4_08e_lecturas_abiertas(ruta: str, perfil: str | None) -> None:
    cliente = _cliente_conjunto_a()
    cabecera = _cabecera(_abrir_sesion(cliente, perfil)) if perfil else None

    respuesta = cliente.get(ruta, headers=cabecera)

    assert respuesta.status_code == 200, f"{perfil} {ruta}: {respuesta.text}"


# ---------------------------------------------------------------------------
# AC-F4-08f — El catálogo no cambia tras una denegación
# ---------------------------------------------------------------------------


def test_qa_ac_f4_08f_catalogo_intacto_tras_denegar_escrituras() -> None:
    cliente = _cliente_escritura()
    token_produccion = _abrir_sesion(cliente, "PRODUCCION")
    antes = _totales_grafo(cliente)

    for _nombre, peticion, _estado in RUTAS_ESCRITURA:
        assert peticion(cliente, None).status_code == 401
        assert peticion(cliente, _cabecera(token_produccion)).status_code == 403

    assert _totales_grafo(cliente) == antes


def test_qa_ac_f4_08f_denegacion_no_crea_elemento_ni_relacion() -> None:
    cliente = _cliente_escritura()
    token = _abrir_sesion(cliente, "PRODUCCION")

    cliente.post(
        "/api/v1/elementos",
        json={"id": "INS-X", "tipo": "INSUMO", "nombre": "Insumo X"},
        headers=_cabecera(token),
    )
    cliente.post(
        "/api/v1/dependencias",
        json={"origen": "PROV-ACERO", "destino": "INS-CABLE"},
        headers=_cabecera(token),
    )

    assert cliente.get("/api/v1/elementos/INS-X").status_code == 404
    assert cliente.get("/api/v1/dependencias?origen=PROV-ACERO&destino=INS-CABLE").json()[
        "total"
    ] == 0


# ---------------------------------------------------------------------------
# Observación — orden de comprobación Content-Type vs autorización
# ---------------------------------------------------------------------------


def test_observacion_content_type_se_valida_antes_que_la_autorizacion() -> None:
    """Observación QA (no es criterio de aceptación).

    En las rutas con cuerpo, ``_verificar_content_type_json`` se ejecuta antes
    de ``_autorizar_escritura``. Por eso una petición sin ``Content-Type`` y sin
    sesión responde 400 ``ERR-03`` en lugar de 401 ``ERR-11``. Se registra para
    el reporte de F4; no contradice AC-F4-08, que describe peticiones bien
    formadas.
    """
    cliente = _cliente_escritura()
    respuesta = cliente.post(
        "/api/v1/elementos",
        content=b'{"id": "INS-Z", "tipo": "INSUMO", "nombre": "Insumo Z"}',
        headers={"Content-Type": "text/plain"},
    )

    assert respuesta.status_code == 400
    assert _codigo_error(respuesta) == "PETICION_MAL_FORMADA"


# ---------------------------------------------------------------------------
# AC-F4-02 / 03 / 04 / 04b / 04c / 05 / 05b — Datos reales que el tablero compone
# ---------------------------------------------------------------------------


def test_qa_ac_f4_02_el_tablero_compone_grafo_impacto_plan_y_diagnostico() -> None:
    """Las cuatro consultas del tablero responden 200 con datos coherentes."""
    cliente = _cliente_conjunto_a()

    grafo = cliente.get("/api/v1/grafo")
    impacto = cliente.get("/api/v1/impacto/INS-BARRA")
    plan = cliente.get("/api/v1/plan-entrega?productos=PROD-PANEL")
    diagnostico = cliente.get("/api/v1/orden-produccion")

    for respuesta in (grafo, impacto, plan, diagnostico):
        assert respuesta.status_code == 200

    resumen = grafo.json()["resumen"]
    assert resumen == {"totalElementos": 6, "totalDependencias": 6}


def test_qa_ac_f4_02_catalogo_de_demostracion_totales_documentados() -> None:
    cliente = TestClient(crear_aplicacion(poblar_catalogo_demostracion(Catalogo())))
    resumen = cliente.get("/api/v1/grafo").json()["resumen"]

    assert resumen == {"totalElementos": 27, "totalDependencias": 37}


def test_qa_ac_f4_03_resumen_clasifica_productos_planificables() -> None:
    cliente = _cliente_conjunto_a()

    diagnostico = cliente.get("/api/v1/orden-produccion").json()

    assert diagnostico["esDag"] is True
    assert diagnostico["productosPlanificables"] == ["PROD-BANCO", "PROD-PANEL"]
    assert diagnostico["productosBloqueados"] == []


def test_qa_ac_f4_04_impacto_de_ins_barra_coincide_con_la_api() -> None:
    respuesta = _cliente_conjunto_a().get("/api/v1/impacto/INS-BARRA")

    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    assert _ids(cuerpo["afectados"]) == ["PROC-CORTE", "PROD-BANCO", "PROD-PANEL"]
    assert cuerpo["total"] == 3


def test_qa_ac_f4_04b_producto_terminal_sin_afectados() -> None:
    respuesta = _cliente_conjunto_a().get("/api/v1/impacto/PROD-PANEL")

    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    assert cuerpo["afectados"] == []
    assert cuerpo["total"] == 0


def test_qa_ac_f4_04c_impacto_de_elemento_inexistente_falla() -> None:
    respuesta = _cliente_conjunto_a().get("/api/v1/impacto/PROD-NOEXISTE")

    assert respuesta.status_code == 404
    assert _codigo_error(respuesta) == "ELEMENTO_NO_ENCONTRADO"
    assert "afectados" not in respuesta.json()


def test_qa_ac_f4_05_plan_y_diagnostico_del_conjunto_a() -> None:
    cliente = _cliente_conjunto_a()

    plan = cliente.get("/api/v1/plan-entrega?productos=PROD-PANEL").json()
    diagnostico = cliente.get("/api/v1/orden-produccion").json()

    assert _ids(plan["pasos"]) == [
        "PROV-ACERO",
        "INS-BARRA",
        "INS-TORNILLO",
        "PROC-CORTE",
        "PROD-PANEL",
    ]
    assert plan["totalPasos"] == 5
    assert diagnostico["esDag"] is True
    assert _ids(diagnostico["orden"]) == [
        "PROV-ACERO",
        "INS-BARRA",
        "INS-TORNILLO",
        "PROC-CORTE",
        "PROD-BANCO",
        "PROD-PANEL",
    ]


def test_qa_ac_f4_05b_conjunto_b_alerta_de_ciclo_sin_orden_falso() -> None:
    cliente = _cliente(ELEMENTOS_A, DEPENDENCIAS_B)

    diagnostico = cliente.get("/api/v1/orden-produccion")
    assert diagnostico.status_code == 200
    cuerpo = diagnostico.json()
    assert cuerpo["esDag"] is False
    assert cuerpo["orden"] == []
    assert cuerpo["ciclos"], "debe reportar al menos un ciclo"
    assert cuerpo["productosBloqueados"] == ["PROD-BANCO", "PROD-PANEL"]

    plan = cliente.get("/api/v1/plan-entrega?productos=PROD-PANEL").json()
    assert plan["esPlanificable"] is False
    assert plan["pasos"] == []
    assert plan["productos"][0]["estado"] == "BLOQUEADO"


@pytest.mark.xfail(
    strict=True,
    reason=(
        "Contradicción AC-F4-05c / AC-F3-05b: la documentación exige un plan de "
        "un único paso para PROD-SOLO, pero la implementación lo marca INCOMPLETO "
        "con pasos []."
    ),
)
def test_qa_ac_f4_05c_conjunto_e_producto_sin_requisitos_un_paso() -> None:
    cliente = _cliente((("PROD-SOLO", "PRODUCTO", "Producto solo"),), ())

    plan = cliente.get("/api/v1/plan-entrega?productos=PROD-SOLO").json()
    assert plan["esPlanificable"] is True
    assert _ids(plan["pasos"]) == ["PROD-SOLO"]
    assert plan["totalPasos"] == 1


def test_observacion_ac_f4_05c_estado_actual_producto_aislado() -> None:
    """Observación QA: comportamiento actual del Conjunto E (no es AC)."""
    cliente = _cliente((("PROD-SOLO", "PRODUCTO", "Producto solo"),), ())

    plan = cliente.get("/api/v1/plan-entrega?productos=PROD-SOLO").json()
    assert plan["productos"][0]["estado"] == "INCOMPLETO"
    assert plan["pasos"] == []


# ---------------------------------------------------------------------------
# AC-F4-14 — Rendimiento de la composición sobre el catálogo de demostración
# ---------------------------------------------------------------------------


def test_qa_ac_f4_14_composicion_del_tablero_en_menos_de_2s() -> None:
    cliente = TestClient(crear_aplicacion(poblar_catalogo_demostracion(Catalogo())))

    inicio = time.perf_counter()
    respuestas = (
        cliente.get("/api/v1/grafo"),
        cliente.get("/api/v1/impacto/INS-TORNILLO"),
        cliente.get("/api/v1/plan-entrega?productos=PROD-MESA-TRABAJO"),
        cliente.get("/api/v1/orden-produccion"),
    )
    duracion_ms = (time.perf_counter() - inicio) * 1000

    for respuesta in respuestas:
        assert respuesta.status_code == 200
    assert duracion_ms < 2000.0, f"composición: {duracion_ms:.1f} ms"


# ---------------------------------------------------------------------------
# AC-F4-15 — La autorización se aplica en el backend
# ---------------------------------------------------------------------------


def test_qa_ac_f4_15_las_seis_rutas_de_escritura_autorizan() -> None:
    fuente = (RAIZ_BACKEND / "app" / "api" / "rutas.py").read_text(encoding="utf-8")

    assert fuente.count("_autorizar_escritura(peticion)") == 6


def test_qa_ac_f4_15_la_logica_de_sesion_no_vive_en_la_capa_http() -> None:
    fuente = (RAIZ_BACKEND / "app" / "api" / "rutas.py").read_text(encoding="utf-8")
    arbol = ast.parse(fuente)

    importaciones = set()
    for nodo in ast.walk(arbol):
        if isinstance(nodo, ast.ImportFrom) and nodo.module:
            importaciones.add(nodo.module)

    # La capa HTTP delega la decisión de autorización en la capa de aplicación.
    assert "app.aplicacion.casos_de_uso" in importaciones
    assert "app.dominio.sesion" not in importaciones
