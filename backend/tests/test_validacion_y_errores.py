"""RF-F1-11/12/13 Â· ValidaciÃ³n de entrada, errores explÃ­citos y estados vacÃ­os.

Cubre AC-F1-11, AC-F1-11b, AC-F1-11c, AC-F1-11d, AC-F1-12, AC-F1-12b,
AC-F1-13, AC-F1-13b, AC-F1-13c.
"""

from fastapi.testclient import TestClient

from .conftest import registrar_dependencia, registrar_elemento

RUTAS_ESCRITURA = ("/api/v1/elementos", "/api/v1/dependencias")


def _instantanea(cliente: TestClient) -> tuple[int, int]:
    grafo = cliente.get("/api/v1/grafo").json()
    return grafo["resumen"]["totalElementos"], grafo["resumen"]["totalDependencias"]


def test_ac_f1_11_campos_invalidos_responden_422_err04_con_el_campo(cliente_vacio: TestClient) -> None:
    casos: list[tuple[dict, str]] = [
        ({"tipo": "INSUMO", "nombre": "Barra de acero"}, "id"),
        ({"id": "INS-X1", "nombre": "Barra de acero"}, "tipo"),
        ({"id": "INS-X1", "tipo": "INSUMO"}, "nombre"),
        ({"id": "INS-X1", "tipo": "MATERIAL", "nombre": "Barra de acero"}, "tipo"),
        ({"id": "AB", "tipo": "INSUMO", "nombre": "Barra de acero"}, "id"),
        ({"id": "INS X1", "tipo": "INSUMO", "nombre": "Barra de acero"}, "id"),
        ({"id": "INS.X1", "tipo": "INSUMO", "nombre": "Barra de acero"}, "id"),
        ({"id": "INS-X1", "tipo": "INSUMO", "nombre": "ab"}, "nombre"),
        ({"id": "INS-X1", "tipo": "INSUMO", "nombre": "   "}, "nombre"),
        (
            {"id": "INS-X1", "tipo": "INSUMO", "nombre": "Barra de acero", "descripcion": "d" * 301},
            "descripcion",
        ),
        ({"id": 42, "tipo": "INSUMO", "nombre": "Barra de acero"}, "id"),
        ({"id": "INS-X1", "tipo": ["INSUMO"], "nombre": "Barra de acero"}, "tipo"),
    ]

    for cuerpo, campo in casos:
        respuesta = cliente_vacio.post("/api/v1/elementos", json=cuerpo)

        assert respuesta.status_code == 422, cuerpo
        error = respuesta.json()["error"]
        assert error["codigo"] == "VALIDACION_FALLIDA", cuerpo
        assert [d["campo"] for d in error["detalles"]] == [campo], cuerpo
        assert _instantanea(cliente_vacio) == (0, 0), cuerpo


def test_ac_f1_11_nombre_ymas_de_80_caracteres_se_rechaza(cliente_vacio: TestClient) -> None:
    respuesta = cliente_vacio.post(
        "/api/v1/elementos",
        json={"id": "INS-X1", "tipo": "INSUMO", "nombre": "n" * 81},
    )

    assert respuesta.status_code == 422
    assert [d["campo"] for d in respuesta.json()["error"]["detalles"]] == ["nombre"]


def test_ac_f1_11_descripcion_de_300_caracteres_se_acepta(cliente_vacio: TestClient) -> None:
    respuesta = cliente_vacio.post(
        "/api/v1/elementos",
        json={
            "id": "INS-X1",
            "tipo": "INSUMO",
            "nombre": "Barra de acero",
            "descripcion": "d" * 300,
        },
    )

    assert respuesta.status_code == 201
    assert len(respuesta.json()["descripcion"]) == 300


def test_ac_f1_11_id_y_nombre_en_limites_se_aceptan(cliente_vacio: TestClient) -> None:
    respuesta = cliente_vacio.post(
        "/api/v1/elementos",
        json={"id": "A" + "B" * 39, "tipo": "INSUMO", "nombre": "n" * 80},
    )

    assert respuesta.status_code == 201
    assert respuesta.json()["id"] == "A" + "B" * 39


def test_ac_f1_11_dependencias_invalidas_responden_422_err04_con_el_campo(cliente: TestClient) -> None:
    casos: list[tuple[dict, str]] = [
        ({"destino": "PROD-PANEL"}, "origen"),
        ({"origen": "INS-TORNILLO"}, "destino"),
        ({"origen": "x", "destino": "PROD-PANEL"}, "origen"),
        ({"origen": "INS-TORNILLO", "destino": "x"}, "destino"),
        ({"origen": 1, "destino": "PROD-PANEL"}, "origen"),
        ({"origen": ["INS-TORNILLO"], "destino": "PROD-PANEL"}, "origen"),
    ]

    for cuerpo, campo in casos:
        respuesta = cliente.post("/api/v1/dependencias", json=cuerpo)

        assert respuesta.status_code == 422, cuerpo
        error = respuesta.json()["error"]
        assert error["codigo"] == "VALIDACION_FALLIDA", cuerpo
        assert [d["campo"] for d in error["detalles"]] == [campo], cuerpo


def test_ac_f1_11b_cuerpo_no_json_responde_400_err03(cliente_vacio: TestClient) -> None:
    for ruta in RUTAS_ESCRITURA:
        respuesta = cliente_vacio.post(
            ruta, content="{esto no es json", headers={"Content-Type": "application/json"}
        )

        assert respuesta.status_code == 400, ruta
        assert respuesta.json()["error"]["codigo"] == "PETICION_MAL_FORMADA", ruta


def test_ac_f1_11b_cuerpo_json_no_objeto_responde_400_err03(cliente_vacio: TestClient) -> None:
    respuesta = cliente_vacio.post(
        "/api/v1/elementos", content="[]", headers={"Content-Type": "application/json"}
    )

    assert respuesta.status_code == 400
    assert respuesta.json()["error"]["codigo"] == "PETICION_MAL_FORMADA"


def test_ac_f1_11b_cuerpo_ausente_responde_400_err03(cliente_vacio: TestClient) -> None:
    respuesta = cliente_vacio.post("/api/v1/elementos")

    assert respuesta.status_code == 400
    assert respuesta.json()["error"]["codigo"] == "PETICION_MAL_FORMADA"


def test_ac_f1_11b_content_type_no_json_responde_400_err03(cliente_vacio: TestClient) -> None:
    respuesta = cliente_vacio.post(
        "/api/v1/elementos",
        content='{"id":"INS-X1","tipo":"INSUMO","nombre":"Barra de acero"}',
        headers={"Content-Type": "text/plain"},
    )

    assert respuesta.status_code == 400
    assert respuesta.json()["error"]["codigo"] == "PETICION_MAL_FORMADA"


def test_ac_f1_11c_campo_desconocido_responde_422_err06_con_su_nombre(
    cliente_vacio: TestClient,
) -> None:
    respuesta = cliente_vacio.post(
        "/api/v1/elementos",
        json={"id": "INS-X1", "tipo": "INSUMO", "nombre": "Barra de acero", "color": "azul"},
    )

    assert respuesta.status_code == 422
    error = respuesta.json()["error"]
    assert error["codigo"] == "CAMPO_NO_PERMITIDO"
    assert [d["campo"] for d in error["detalles"]] == ["color"]


def test_ac_f1_11c_campos_de_pesos_y_cantidades_se_rechazan_por_amb_f1_01(
    cliente_vacio: TestClient,
) -> None:
    """AMB-F1-01: F1 no define pesos ni cantidades; no se ignoran."""
    for campo in ("peso", "cantidad", "cantidadKg"):
        cuerpo = {
            "id": "INS-X1",
            "tipo": "INSUMO",
            "nombre": "Barra de acero",
            campo: 5,
        }
        respuesta = cliente_vacio.post("/api/v1/elementos", json=cuerpo)

        assert respuesta.status_code == 422, campo
        error = respuesta.json()["error"]
        assert error["codigo"] == "CAMPO_NO_PERMITIDO", campo
        assert [d["campo"] for d in error["detalles"]] == [campo], campo
        assert _instantanea(cliente_vacio) == (0, 0), campo


def test_ac_f1_11c_campo_desconocido_en_dependencia_responde_422_err06(cliente: TestClient) -> None:
    respuesta = cliente.post(
        "/api/v1/dependencias",
        json={"origen": "INS-TORNILLO", "destino": "PROD-PANEL", "peso": 3},
    )

    assert respuesta.status_code == 422
    error = respuesta.json()["error"]
    assert error["codigo"] == "CAMPO_NO_PERMITIDO"
    assert [d["campo"] for d in error["detalles"]] == ["peso"]


def test_ac_f1_11d_el_catalogo_queda_intacto_tras_cualquier_rechazo(cliente: TestClient) -> None:
    antes = cliente.get("/api/v1/grafo").json()
    rechazos: list[object] = [
        (cliente.post("/api/v1/elementos", json={"id": "INS-TORNILLO", "tipo": "PRODUCTO", "nombre": "Duplicado"})),
        (cliente.post("/api/v1/elementos", json={"id": "AB", "tipo": "INSUMO", "nombre": "Corto"})),
        (cliente.post("/api/v1/elementos", json={"tipo": "INSUMO", "nombre": "Sin id"})),
        (cliente.post("/api/v1/elementos", json={"id": "INS-X1", "tipo": "INSUMO", "nombre": "Barra", "extra": 1})),
        (cliente.post("/api/v1/dependencias", json={"origen": "FANTASMA", "destino": "PROD-PANEL"})),
        (cliente.post("/api/v1/dependencias", json={"origen": "INS-TORNILLO", "destino": "INS-TORNILLO"})),
        (cliente.post("/api/v1/dependencias", json={"origen": "INS-TORNILLO", "destino": "PROD-PANEL"})),
        (cliente.post("/api/v1/elementos", content="no-json", headers={"Content-Type": "application/json"})),
    ]

    assert all(respuesta.status_code >= 400 for respuesta in rechazos)
    assert cliente.get("/api/v1/grafo").json() == antes


def test_ac_f1_12_toda_respuesta_de_error_tiene_el_sobre_uniforme(cliente: TestClient) -> None:
    casos = [
        cliente.post("/api/v1/elementos", json={"id": "INS-TORNILLO", "tipo": "PRODUCTO", "nombre": "Nombre duplicado"}),
        cliente.get("/api/v1/elementos/INS-INEXISTENTE"),
        cliente.post("/api/v1/elementos", content="{", headers={"Content-Type": "application/json"}),
        cliente.post("/api/v1/elementos", json={"id": "AB", "tipo": "INSUMO", "nombre": "Nombre"}),
        cliente.get("/api/v1/elementos/xx"),
        cliente.post("/api/v1/elementos", json={"id": "INS-X1", "tipo": "INSUMO", "nombre": "Nombre valido", "z": 1}),
        cliente.post("/api/v1/dependencias", json={"origen": "INS-TORNILLO", "destino": "INS-TORNILLO"}),
        cliente.post("/api/v1/dependencias", json={"origen": "INS-TORNILLO", "destino": "PROD-PANEL"}),
        cliente.get("/api/v1/ruta/inexistente"),
    ]

    for respuesta in casos:
        cuerpo = respuesta.json()
        assert set(cuerpo) == {"error"}, respuesta.request.url
        error = cuerpo["error"]
        assert {"codigo", "mensaje", "detalles"} <= set(error)
        assert isinstance(error["codigo"], str) and error["codigo"]
        assert isinstance(error["mensaje"], str) and error["mensaje"]
        for detalle in error["detalles"]:
            assert set(detalle) == {"campo", "mensaje"}


def test_ac_f1_12_ninguna_respuesta_de_error_contiene_datos_de_negocio(cliente: TestClient) -> None:
    casos = [
        cliente.post("/api/v1/elementos", json={"id": "INS-TORNILLO", "tipo": "PRODUCTO", "nombre": "Nombre duplicado"}),
        cliente.get("/api/v1/elementos/INS-INEXISTENTE"),
        cliente.get("/api/v1/elementos/xx"),
        cliente.get("/api/v1/ruta/inexistente"),
        cliente.post("/api/v1/dependencias", json={"origen": "INS-TORNILLO", "destino": "INS-TORNILLO"}),
    ]

    for respuesta in casos:
        cuerpo = respuesta.json()
        assert "elementos" not in cuerpo, respuesta.request.url
        assert "dependencias" not in cuerpo, respuesta.request.url
        assert "total" not in cuerpo, respuesta.request.url
        assert "resumen" not in cuerpo, respuesta.request.url


def test_ac_f1_12b_los_codigos_de_error_son_estables(cliente: TestClient) -> None:
    """El mismo tipo de fallo produce siempre el mismo cÃ³digo."""
    respuestas = [
        cliente.post("/api/v1/elementos", json={"id": "AB", "tipo": "INSUMO", "nombre": "Nombre"}),
        cliente.post("/api/v1/elementos", json={"id": "x", "tipo": "NOPE", "nombre": "no"}),
        cliente.get("/api/v1/elementos/xx"),
        cliente.get("/api/v1/elementos/yy"),
        cliente.get("/api/v1/dependencias?origen=zz"),
    ]
    codigos = [r.json()["error"]["codigo"] for r in respuestas]

    assert codigos == [
        "VALIDACION_FALLIDA",
        "VALIDACION_FALLIDA",
        "IDENTIFICADOR_INVALIDO",
        "IDENTIFICADOR_INVALIDO",
        "IDENTIFICADOR_INVALIDO",
    ]


def test_ac_f1_12b_cada_codigo_del_contrato_produce_su_http(cliente: TestClient) -> None:
    esperado = {
        "ELEMENTO_DUPLICADO": 409,
        "ELEMENTO_NO_ENCONTRADO": 404,
        "PETICION_MAL_FORMADA": 400,
        "VALIDACION_FALLIDA": 422,
        "IDENTIFICADOR_INVALIDO": 422,
        "CAMPO_NO_PERMITIDO": 422,
        "DEPENDENCIA_INVALIDA": 422,
        "DEPENDENCIA_DUPLICADA": 409,
        "TIPO_NO_ENCONTRADO": 404,
    }
    peticiones: dict[str, object] = {
        "ELEMENTO_DUPLICADO": lambda: cliente.post(
            "/api/v1/elementos",
            json={"id": "INS-TORNILLO", "tipo": "PRODUCTO", "nombre": "Nombre valido"},
        ),
        "ELEMENTO_NO_ENCONTRADO": lambda: cliente.get("/api/v1/elementos/NO-EXISTE"),
        "PETICION_MAL_FORMADA": lambda: cliente.post(
            "/api/v1/elementos", content="{", headers={"Content-Type": "application/json"}
        ),
        "VALIDACION_FALLIDA": lambda: cliente.post(
            "/api/v1/elementos", json={"id": "AB", "tipo": "INSUMO", "nombre": "Nombre"}
        ),
        "IDENTIFICADOR_INVALIDO": lambda: cliente.get("/api/v1/elementos/xx"),
        "CAMPO_NO_PERMITIDO": lambda: cliente.post(
            "/api/v1/elementos",
            json={"id": "INS-X1", "tipo": "INSUMO", "nombre": "Nombre valido", "z": 1},
        ),
        "DEPENDENCIA_INVALIDA": lambda: registrar_dependencia(
            cliente, "INS-TORNILLO", "INS-TORNILLO"
        ),
        "DEPENDENCIA_DUPLICADA": lambda: registrar_dependencia(
            cliente, "INS-TORNILLO", "PROD-PANEL"
        ),
        "TIPO_NO_ENCONTRADO": lambda: cliente.get("/api/v1/ruta/inexistente"),
    }

    for codigo, http in esperado.items():
        respuesta = peticiones[codigo]()
        assert respuesta.status_code == http, codigo
        assert respuesta.json()["error"]["codigo"] == codigo


def test_ac_f1_13_catalogo_vacio_responde_200_con_totales_en_cero(cliente_vacio: TestClient) -> None:
    elementos = cliente_vacio.get("/api/v1/elementos")
    dependencias = cliente_vacio.get("/api/v1/dependencias")
    grafo = cliente_vacio.get("/api/v1/grafo")

    assert elementos.status_code == 200
    assert elementos.json() == {"elementos": [], "total": 0}
    assert dependencias.status_code == 200
    assert dependencias.json() == {"dependencias": [], "total": 0}
    assert grafo.status_code == 200
    assert grafo.json() == {
        "elementos": [],
        "dependencias": [],
        "resumen": {"totalElementos": 0, "totalDependencias": 0},
    }


def test_ac_f1_13b_elemento_sin_dependencias_es_valido_y_consultable(cliente_vacio: TestClient) -> None:
    respuesta = registrar_elemento(cliente_vacio, "INS-SOLO", "INSUMO", "Insumo aislado")

    assert respuesta.status_code == 201
    assert cliente_vacio.get("/api/v1/elementos/INS-SOLO").status_code == 200
    assert cliente_vacio.get("/api/v1/dependencias").json() == {"dependencias": [], "total": 0}
    grafo = cliente_vacio.get("/api/v1/grafo").json()
    assert grafo["elementos"] == [
        {"id": "INS-SOLO", "tipo": "INSUMO", "nombre": "Insumo aislado", "descripcion": None}
    ]
    assert grafo["resumen"]["totalDependencias"] == 0


def test_ac_f1_13c_filtro_sin_coincidencias_es_200_con_coleccion_vacia(cliente: TestClient) -> None:
    por_tipo = cliente.get("/api/v1/dependencias?origen=PROD-BANCO")
    por_destino = cliente.get("/api/v1/dependencias?destino=PROV-ACERO")
    ambos = cliente.get("/api/v1/dependencias?origen=PROV-ACERO&destino=PROD-PANEL")

    assert por_tipo.status_code == 200
    assert por_tipo.json() == {"dependencias": [], "total": 0}
    assert por_destino.status_code == 200
    assert por_destino.json() == {"dependencias": [], "total": 0}
    assert ambos.status_code == 200
    assert ambos.json() == {"dependencias": [], "total": 0}
