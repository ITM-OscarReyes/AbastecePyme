"""RF-F1-04/05 · Consulta del catálogo de elementos.

Cubre AC-F1-04, AC-F1-04b, AC-F1-04c, AC-F1-04d, AC-F1-05, AC-F1-05b, AC-F1-05c.
"""

from fastapi.testclient import TestClient

from .conftest import registrar_elemento


def test_ac_f1_04_listado_devuelve_todos_con_total_coincidente(cliente: TestClient) -> None:
    respuesta = cliente.get("/api/v1/elementos")

    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    assert cuerpo["total"] == len(cuerpo["elementos"]) == 6
    assert {e["id"] for e in cuerpo["elementos"]} == {
        "PROV-ACERO",
        "INS-BARRA",
        "INS-TORNILLO",
        "PROC-CORTE",
        "PROD-PANEL",
        "PROD-BANCO",
    }


def test_ac_f1_04b_listado_ordenado_por_id_ascendente(cliente: TestClient) -> None:
    ids = [e["id"] for e in cliente.get("/api/v1/elementos").json()["elementos"]]

    assert ids == sorted(ids)


def test_ac_f1_04b_dos_lecturas_consecutivas_son_identicas(cliente: TestClient) -> None:
    primera = cliente.get("/api/v1/elementos")
    segunda = cliente.get("/api/v1/elementos")

    assert primera.json() == segunda.json()


def test_ac_f1_04b_orden_estable_aunque_el_alta_llegue_en_otro_orden(cliente_vacio: TestClient) -> None:
    for id_valor in ("PROD-Z9", "INS-A1", "PROC-M5", "PROV-B7"):
        registrar_elemento(cliente_vacio, id_valor, "INSUMO", f"Elemento {id_valor}")

    ids = [e["id"] for e in cliente_vacio.get("/api/v1/elementos").json()["elementos"]]

    assert ids == sorted(ids)


def test_ac_f1_04c_filtro_por_tipo_devuelve_solo_ese_tipo(cliente: TestClient) -> None:
    respuesta = cliente.get("/api/v1/elementos?tipo=INSUMO")

    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    assert cuerpo["total"] == 2 == len(cuerpo["elementos"])
    assert {e["id"] for e in cuerpo["elementos"]} == {"INS-BARRA", "INS-TORNILLO"}
    assert {e["tipo"] for e in cuerpo["elementos"]} == {"INSUMO"}


def test_ac_f1_04c_filtro_por_tipo_se_normaliza_a_mayusculas(cliente: TestClient) -> None:
    respuesta = cliente.get("/api/v1/elementos?tipo=insumo")

    assert respuesta.status_code == 200
    assert respuesta.json()["total"] == 2


def test_ac_f1_04d_tipo_desconocido_en_filtro_responde_422_err04(cliente: TestClient) -> None:
    respuesta = cliente.get("/api/v1/elementos?tipo=DESCONOCIDO")

    assert respuesta.status_code == 422
    assert respuesta.json()["error"]["codigo"] == "VALIDACION_FALLIDA"
    assert [d["campo"] for d in respuesta.json()["error"]["detalles"]] == ["tipo"]


def test_ac_f1_05_consulta_de_elemento_existente(cliente: TestClient) -> None:
    respuesta = cliente.get("/api/v1/elementos/INS-TORNILLO")

    assert respuesta.status_code == 200
    assert respuesta.json() == {
        "id": "INS-TORNILLO",
        "tipo": "INSUMO",
        "nombre": "Tornillo hexagonal M6",
        "descripcion": None,
    }


def test_ac_f1_05_consulta_normaliza_el_id_a_mayusculas(cliente: TestClient) -> None:
    respuesta = cliente.get("/api/v1/elementos/ins-tornillo")

    assert respuesta.status_code == 200
    assert respuesta.json()["id"] == "INS-TORNILLO"


def test_ac_f1_05b_elemento_inexistente_responde_404_err02_con_el_id(cliente: TestClient) -> None:
    respuesta = cliente.get("/api/v1/elementos/INS-INEXISTENTE")

    assert respuesta.status_code == 404
    error = respuesta.json()["error"]
    assert error["codigo"] == "ELEMENTO_NO_ENCONTRADO"
    assert "INS-INEXISTENTE" in error["mensaje"]


def test_ac_f1_05c_id_mal_formado_responde_422_err05_y_nunca_404(cliente: TestClient) -> None:
    for id_mal_formado in ("xx", "AB", "con espacio", "con.punto", "Ñnnnn", "x" * 41):
        respuesta = cliente.get(f"/api/v1/elementos/{id_mal_formado}")

        assert respuesta.status_code == 422, id_mal_formado
        assert respuesta.json()["error"]["codigo"] == "IDENTIFICADOR_INVALIDO", id_mal_formado


def test_ac_f1_05c_id_mal_formado_es_422_aunque_no_exista(cliente_vacio: TestClient) -> None:
    respuesta = cliente_vacio.get("/api/v1/elementos/xx")

    assert respuesta.status_code == 422
    assert respuesta.json()["error"]["codigo"] == "IDENTIFICADOR_INVALIDO"
