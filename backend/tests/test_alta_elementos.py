"""RF-F1-01/02/03 · Alta de elementos del catálogo.

Cubre AC-F1-01, AC-F1-01b, AC-F1-01c, AC-F1-02, AC-F1-02b, AC-F1-03, AC-F1-03b.
"""

from fastapi.testclient import TestClient

from .conftest import registrar_elemento


def test_ac_f1_01_alta_devuelve_201_elemento_y_location(cliente_vacio: TestClient) -> None:
    respuesta = registrar_elemento(
        cliente_vacio, "INS-TORNILLO", "INSUMO", "Tornillo hexagonal M6"
    )

    assert respuesta.status_code == 201
    cuerpo = respuesta.json()
    assert cuerpo == {
        "id": "INS-TORNILLO",
        "tipo": "INSUMO",
        "nombre": "Tornillo hexagonal M6",
        "descripcion": None,
    }
    assert respuesta.headers["Location"] == "/api/v1/elementos/INS-TORNILLO"


def test_ac_f1_01_elemento_creado_es_visible_en_listado_y_grafo(cliente_vacio: TestClient) -> None:
    registrar_elemento(cliente_vacio, "INS-BARRA", "INSUMO", "Barra de acero")

    listado = cliente_vacio.get("/api/v1/elementos").json()
    grafo = cliente_vacio.get("/api/v1/grafo").json()

    assert [e["id"] for e in listado["elementos"]] == ["INS-BARRA"]
    assert [e["id"] for e in grafo["elementos"]] == ["INS-BARRA"]
    assert grafo["resumen"]["totalElementos"] == 1


def test_ac_f1_01b_id_y_tipo_en_minusculas_se_normalizan(cliente_vacio: TestClient) -> None:
    respuesta = registrar_elemento(cliente_vacio, "ins-tornillo", "insumo", "Tornillo hexagonal M6")

    assert respuesta.status_code == 201
    cuerpo = respuesta.json()
    assert cuerpo["id"] == "INS-TORNILLO"
    assert cuerpo["tipo"] == "INSUMO"

    consulta = cliente_vacio.get("/api/v1/elementos/INS-TORNILLO")
    assert consulta.status_code == 200
    assert consulta.json() == cuerpo


def test_ac_f1_01b_id_con_espacios_alrededor_se_normaliza(cliente_vacio: TestClient) -> None:
    respuesta = registrar_elemento(cliente_vacio, "  ins-barra  ", " Insumo ", "Barra de acero")

    assert respuesta.status_code == 201
    assert respuesta.json()["id"] == "INS-BARRA"
    assert respuesta.json()["tipo"] == "INSUMO"


def test_ac_f1_01c_descripcion_ausente_se_devuelve_null(cliente_vacio: TestClient) -> None:
    respuesta = cliente_vacio.post(
        "/api/v1/elementos",
        json={"id": "PROC-CORTE", "tipo": "PROCESO", "nombre": "Corte de panel"},
    )

    assert respuesta.status_code == 201
    assert respuesta.json()["descripcion"] is None
    assert cliente_vacio.get("/api/v1/elementos/PROC-CORTE").json()["descripcion"] is None


def test_ac_f1_02_id_repetido_responde_409_err01_sin_alterar_original(cliente: TestClient) -> None:
    original = cliente.get("/api/v1/elementos/INS-TORNILLO").json()

    respuesta = registrar_elemento(cliente, "INS-TORNILLO", "PRODUCTO", "Otro nombre")

    assert respuesta.status_code == 409
    assert respuesta.json()["error"]["codigo"] == "ELEMENTO_DUPLICADO"
    assert cliente.get("/api/v1/elementos/INS-TORNILLO").json() == original
    assert cliente.get("/api/v1/elementos?tipo=PRODUCTO").json()["total"] == 2
    assert cliente.get("/api/v1/elementos").json()["total"] == 6


def test_ac_f1_02_unicidad_es_de_todo_el_catalogo_no_por_tipo(cliente_vacio: TestClient) -> None:
    assert registrar_elemento(cliente_vacio, "INS-X1", "PROVEEDOR", "Proveedor X").status_code == 201

    repetido = registrar_elemento(cliente_vacio, "INS-X1", "PRODUCTO", "Producto X")

    assert repetido.status_code == 409
    assert repetido.json()["error"]["codigo"] == "ELEMENTO_DUPLICADO"
    restante = cliente_vacio.get("/api/v1/elementos").json()
    assert restante["total"] == 1
    assert restante["elementos"][0]["tipo"] == "PROVEEDOR"


def test_ac_f1_03_tipo_no_admitido_responde_422_err04_y_no_crea(cliente_vacio: TestClient) -> None:
    respuesta = registrar_elemento(cliente_vacio, "INS-X9", "MATERIAL", "Material X")

    assert respuesta.status_code == 422
    error = respuesta.json()["error"]
    assert error["codigo"] == "VALIDACION_FALLIDA"
    assert [d["campo"] for d in error["detalles"]] == ["tipo"]
    for admitido in ("PROVEEDOR", "INSUMO", "PRODUCTO", "PROCESO"):
        assert admitido in error["detalles"][0]["mensaje"]
    assert cliente_vacio.get("/api/v1/elementos").json() == {"elementos": [], "total": 0}


def test_ac_f1_03b_los_cuatro_tipos_se_aceptan_y_se_devuelven(cliente_vacio: TestClient) -> None:
    esperados = {
        "PROVEEDOR": "PROV-ACERO",
        "INSUMO": "INS-BARRA",
        "PRODUCTO": "PROD-PANEL",
        "PROCESO": "PROC-CORTE",
    }
    nombres = {
        "PROVEEDOR": "Proveedor de acero",
        "INSUMO": "Barra de acero",
        "PRODUCTO": "Panel de montaje",
        "PROCESO": "Corte de panel",
    }
    for tipo, id_valor in esperados.items():
        respuesta = registrar_elemento(cliente_vacio, id_valor, tipo, nombres[tipo])
        assert respuesta.status_code == 201
        assert respuesta.json()["tipo"] == tipo

    tipos_registrados = {e["tipo"] for e in cliente_vacio.get("/api/v1/elementos").json()["elementos"]}
    assert tipos_registrados == set(esperados)


def test_nombres_repetidos_con_distinto_id_son_validos(cliente_vacio: TestClient) -> None:
    """AMB-F1-03: solo el `id` es único; el nombre puede repetirse."""
    assert registrar_elemento(cliente_vacio, "INS-A01", "INSUMO", "Barra de acero").status_code == 201
    assert registrar_elemento(cliente_vacio, "INS-A02", "INSUMO", "Barra de acero").status_code == 201

    assert cliente_vacio.get("/api/v1/elementos").json()["total"] == 2
