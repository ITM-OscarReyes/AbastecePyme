"""RF-F1-06/07/08/09 - Dependencias: direccion, reflexividad, duplicados y listado.

Cubre AC-F1-06, AC-F1-06b, AC-F1-06c, AC-F1-06d, AC-F1-07, AC-F1-08, AC-F1-08b,
AC-F1-09, AC-F1-09b, AC-F1-09c.
"""

from fastapi.testclient import TestClient

from .conftest import registrar_dependencia


def test_ac_f1_06_registro_devuelve_201_con_tipo_relacion_habilita(
    cliente_solo_elementos: TestClient,
) -> None:
    respuesta = registrar_dependencia(cliente_solo_elementos, "INS-TORNILLO", "PROD-PANEL")

    assert respuesta.status_code == 201
    assert respuesta.json() == {
        "origen": "INS-TORNILLO",
        "destino": "PROD-PANEL",
        "tipoRelacion": "habilita",
    }
    assert respuesta.headers["Location"] == "/api/v1/dependencias/INS-TORNILLO/PROD-PANEL"


def test_ac_f1_06_dependencia_aparece_en_listado_y_en_grafo(cliente_vacio: TestClient) -> None:
    tipos = {"INS-TORNILLO": "INSUMO", "PROD-PANEL": "PRODUCTO"}
    for id_valor, tipo in tipos.items():
        cliente_vacio.post(
            "/api/v1/elementos",
            json={"id": id_valor, "tipo": tipo, "nombre": f"Elemento {id_valor}"},
        )

    assert registrar_dependencia(cliente_vacio, "INS-TORNILLO", "PROD-PANEL").status_code == 201

    listado = cliente_vacio.get("/api/v1/dependencias").json()
    grafo = cliente_vacio.get("/api/v1/grafo").json()
    esperada = {"origen": "INS-TORNILLO", "destino": "PROD-PANEL", "tipoRelacion": "habilita"}
    assert listado["dependencias"] == [esperada]
    assert grafo["dependencias"] == [esperada]
    assert grafo["resumen"]["totalDependencias"] == 1


def test_ac_f1_06b_direccion_es_origen_habilita_destino(cliente_vacio: TestClient) -> None:
    """`INS-TORNILLO -> PROD-PANEL` significa «para el panel necesito tornillos»."""
    tipos = {"INS-TORNILLO": "INSUMO", "PROD-PANEL": "PRODUCTO"}
    for id_valor, tipo in tipos.items():
        cliente_vacio.post(
            "/api/v1/elementos",
            json={"id": id_valor, "tipo": tipo, "nombre": f"Elemento {id_valor}"},
        )

    registrar_dependencia(cliente_vacio, "INS-TORNILLO", "PROD-PANEL")

    aristas = cliente_vacio.get("/api/v1/grafo").json()["dependencias"]
    assert len(aristas) == 1
    assert aristas[0]["origen"] == "INS-TORNILLO"
    assert aristas[0]["destino"] == "PROD-PANEL"
    assert aristas[0]["tipoRelacion"] == "habilita"


def test_ac_f1_06c_origen_inexistente_responde_404_err02_con_campo_origen(
    cliente: TestClient,
) -> None:
    antes = cliente.get("/api/v1/dependencias").json()

    respuesta = registrar_dependencia(cliente, "INS-FANTASMA", "PROD-PANEL")

    assert respuesta.status_code == 404
    error = respuesta.json()["error"]
    assert error["codigo"] == "ELEMENTO_NO_ENCONTRADO"
    assert [d["campo"] for d in error["detalles"]] == ["origen"]
    assert cliente.get("/api/v1/dependencias").json() == antes


def test_ac_f1_06c_destino_inexistente_responde_404_err02_con_campo_destino(
    cliente: TestClient,
) -> None:
    antes = cliente.get("/api/v1/dependencias").json()

    respuesta = registrar_dependencia(cliente, "INS-TORNILLO", "PROD-FANTASMA")

    assert respuesta.status_code == 404
    error = respuesta.json()["error"]
    assert error["codigo"] == "ELEMENTO_NO_ENCONTRADO"
    assert [d["campo"] for d in error["detalles"]] == ["destino"]
    assert cliente.get("/api/v1/dependencias").json() == antes


def test_ac_f1_06c_ambos_extremes_inexistentes_no_registra_nada(cliente_vacio: TestClient) -> None:
    respuesta = registrar_dependencia(cliente_vacio, "INS-A1", "PROD-A2")

    assert respuesta.status_code == 404
    assert respuesta.json()["error"]["codigo"] == "ELEMENTO_NO_ENCONTRADO"
    assert cliente_vacio.get("/api/v1/dependencias").json() == {"dependencias": [], "total": 0}
    assert cliente_vacio.get("/api/v1/grafo").json()["elementos"] == []


def test_ac_f1_06d_dependencias_inversas_son_relaciones_distintas(
    cliente_solo_elementos: TestClient,
) -> None:
    total_inicial = cliente_solo_elementos.get("/api/v1/dependencias").json()["total"]

    directa = registrar_dependencia(cliente_solo_elementos, "PROC-CORTE", "PROD-PANEL")
    inversa = registrar_dependencia(cliente_solo_elementos, "PROD-PANEL", "PROC-CORTE")

    assert directa.status_code == 201
    assert inversa.status_code == 201
    assert directa.json()["tipoRelacion"] == "habilita"
    assert inversa.json()["tipoRelacion"] == "habilita"

    cuerpo = cliente_solo_elementos.get("/api/v1/dependencias").json()
    pares = {(d["origen"], d["destino"]) for d in cuerpo["dependencias"]}
    assert ("PROC-CORTE", "PROD-PANEL") in pares
    assert ("PROD-PANEL", "PROC-CORTE") in pares
    assert cuerpo["total"] == total_inicial + 2


def test_ac_f1_07_dependencia_reflexiva_responde_422_err07(
    cliente_solo_elementos: TestClient,
) -> None:
    antes = cliente_solo_elementos.get("/api/v1/dependencias").json()

    respuesta = registrar_dependencia(cliente_solo_elementos, "INS-TORNILLO", "INS-TORNILLO")

    assert respuesta.status_code == 422
    assert respuesta.json()["error"]["codigo"] == "DEPENDENCIA_INVALIDA"
    assert cliente_solo_elementos.get("/api/v1/dependencias").json() == antes


def test_ac_f1_07_reflexiva_con_id_en_minusculas_tambien_se_rechaza(
    cliente_solo_elementos: TestClient,
) -> None:
    respuesta = registrar_dependencia(cliente_solo_elementos, "ins-tornillo", "INS-TORNILLO")

    assert respuesta.status_code == 422
    assert respuesta.json()["error"]["codigo"] == "DEPENDENCIA_INVALIDA"


def test_ac_f1_08_dependencia_duplicada_responde_409_err08_sin_cambiar_total(
    cliente: TestClient,
) -> None:
    antes = cliente.get("/api/v1/dependencias").json()

    repetida = registrar_dependencia(cliente, "INS-TORNILLO", "PROD-PANEL")

    assert repetida.status_code == 409
    assert repetida.json()["error"]["codigo"] == "DEPENDENCIA_DUPLICADA"
    assert cliente.get("/api/v1/dependencias").json() == antes


def test_ac_f1_08b_el_par_inverso_no_es_duplicado_del_original(
    cliente_solo_elementos: TestClient,
) -> None:
    assert registrar_dependencia(cliente_solo_elementos, "INS-TORNILLO", "PROD-PANEL").status_code == 201
    assert registrar_dependencia(cliente_solo_elementos, "PROD-PANEL", "INS-TORNILLO").status_code == 201

    cuerpo = cliente_solo_elementos.get("/api/v1/dependencias").json()
    assert cuerpo["total"] == len(cuerpo["dependencias"])
    assert cuerpo["total"] == len({(d["origen"], d["destino"]) for d in cuerpo["dependencias"]})


def test_ac_f1_09_listado_incluye_tipo_relacion_y_total(cliente_limpio: TestClient) -> None:
    respuesta = cliente_limpio.get("/api/v1/dependencias")

    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    assert cuerpo["total"] == len(cuerpo["dependencias"]) == 5
    for dependencia in cuerpo["dependencias"]:
        assert set(dependencia) == {"origen", "destino", "tipoRelacion"}
        assert dependencia["tipoRelacion"] == "habilita"


def test_ac_f1_09_listado_ordenado_por_origen_y_destino(cliente: TestClient) -> None:
    dependencias = cliente.get("/api/v1/dependencias").json()["dependencias"]

    claves = [(d["origen"], d["destino"]) for d in dependencias]
    assert claves == sorted(claves)


def test_ac_f1_09b_filtro_por_origen(cliente_limpio: TestClient) -> None:
    respuesta = cliente_limpio.get("/api/v1/dependencias?origen=INS-TORNILLO")

    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    assert {d["origen"] for d in cuerpo["dependencias"]} == {"INS-TORNILLO"}
    assert cuerpo["total"] == 1 == len(cuerpo["dependencias"])


def test_ac_f1_09b_filtro_por_destino(cliente: TestClient) -> None:
    respuesta = cliente.get("/api/v1/dependencias?destino=PROD-PANEL")

    cuerpo = respuesta.json()
    assert {d["destino"] for d in cuerpo["dependencias"]} == {"PROD-PANEL"}
    assert cuerpo["total"] == 2 == len(cuerpo["dependencias"])


def test_ac_f1_09b_filtros_combinados_cumplen_ambos(cliente: TestClient) -> None:
    respuesta = cliente.get("/api/v1/dependencias?origen=PROV-ACERO&destino=INS-BARRA")

    cuerpo = respuesta.json()
    assert cuerpo["total"] == 1
    assert cuerpo["dependencias"] == [
        {"origen": "PROV-ACERO", "destino": "INS-BARRA", "tipoRelacion": "habilita"}
    ]


def test_ac_f1_09b_filtro_con_id_mal_formado_responde_422_err05(cliente: TestClient) -> None:
    for campo in ("origen", "destino"):
        respuesta = cliente.get(f"/api/v1/dependencias?{campo}=xx")

        assert respuesta.status_code == 422, campo
        assert respuesta.json()["error"]["codigo"] == "IDENTIFICADOR_INVALIDO"
