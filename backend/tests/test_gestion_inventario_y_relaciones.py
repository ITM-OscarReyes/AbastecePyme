"""Inventario de suministros, gestión de elementos/relaciones y reglas de tipo."""

from fastapi.testclient import TestClient

from .conftest import registrar_dependencia, registrar_elemento


def _crear_suministro(
    cliente: TestClient,
    id_valor: str = "INS-STOCK",
    stock_disponible: int = 5,
    stock_minimo: int = 10,
):
    return cliente.post(
        "/api/v1/elementos",
        json={
            "id": id_valor,
            "tipo": "INSUMO",
            "nombre": "Suministro con inventario",
            "stockDisponible": stock_disponible,
            "stockMinimo": stock_minimo,
        },
    )


def test_crear_suministro_con_stock_bajo_genera_alerta(cliente_vacio: TestClient) -> None:
    respuesta = _crear_suministro(cliente_vacio)

    assert respuesta.status_code == 201
    cuerpo = respuesta.json()
    assert cuerpo["stockDisponible"] == 5
    assert cuerpo["stockMinimo"] == 10
    assert cuerpo["estadoStock"] == "BAJO"
    assert cuerpo["alertaStock"] is True

    consultado = cliente_vacio.get("/api/v1/elementos/INS-STOCK").json()
    assert consultado == cuerpo


def test_suministro_sin_stock_explicito_usa_cero_y_no_alerta(cliente_vacio: TestClient) -> None:
    respuesta = registrar_elemento(
        cliente_vacio, "INS-SIN-STOCK", "INSUMO", "Suministro sin inventario"
    )

    assert respuesta.status_code == 201
    cuerpo = respuesta.json()
    assert cuerpo["stockDisponible"] == 0
    assert cuerpo["stockMinimo"] == 0
    assert cuerpo["estadoStock"] == "SUFICIENTE"
    assert cuerpo["alertaStock"] is False


def test_inventario_solo_aplica_a_suministros(cliente_vacio: TestClient) -> None:
    respuesta = cliente_vacio.post(
        "/api/v1/elementos",
        json={
            "id": "PROD-CON-STOCK",
            "tipo": "PRODUCTO",
            "nombre": "Producto con stock",
            "stockDisponible": 5,
        },
    )

    assert respuesta.status_code == 422
    error = respuesta.json()["error"]
    assert error["codigo"] == "VALIDACION_FALLIDA"
    assert [detalle["campo"] for detalle in error["detalles"]] == ["stockDisponible"]


def test_inventario_invalido_se_rechaza(cliente_vacio: TestClient) -> None:
    for stock in (-1, 1.5, "10", True):
        respuesta = cliente_vacio.post(
            "/api/v1/elementos",
            json={
                "id": f"INS-{str(stock).replace('.', '').replace('-', 'N')[-6:]}",
                "tipo": "INSUMO",
                "nombre": "Suministro inválido",
                "stockDisponible": stock,
            },
        )

        assert respuesta.status_code == 422, stock
        assert respuesta.json()["error"]["codigo"] == "VALIDACION_FALLIDA", stock


def test_actualizar_stock_recalcula_estado_y_alerta(cliente_vacio: TestClient) -> None:
    _crear_suministro(cliente_vacio)

    subir = cliente_vacio.put(
        "/api/v1/elementos/INS-STOCK", json={"stockDisponible": 25}
    )
    assert subir.status_code == 200
    assert subir.json()["estadoStock"] == "SUFICIENTE"
    assert subir.json()["alertaStock"] is False

    subir_minimo = cliente_vacio.put(
        "/api/v1/elementos/INS-STOCK", json={"stockMinimo": 30}
    )
    assert subir_minimo.status_code == 200
    assert subir_minimo.json()["estadoStock"] == "BAJO"
    assert subir_minimo.json()["alertaStock"] is True

    # Los campos no enviados conservan su valor.
    assert subir_minimo.json()["stockDisponible"] == 25


def test_actualizar_elemento_no_permite_cambiar_id_ni_tipo(cliente_vacio: TestClient) -> None:
    _crear_suministro(cliente_vacio)

    respuesta = cliente_vacio.put(
        "/api/v1/elementos/INS-STOCK", json={"tipo": "PRODUCTO"}
    )

    assert respuesta.status_code == 422
    assert respuesta.json()["error"]["codigo"] == "CAMPO_NO_PERMITIDO"


def test_eliminar_elemento_elimina_sus_relaciones(cliente_vacio: TestClient) -> None:
    registrar_elemento(cliente_vacio, "PROV-T", "PROVEEDOR", "Proveedor de prueba")
    _crear_suministro(cliente_vacio)
    assert registrar_dependencia(cliente_vacio, "PROV-T", "INS-STOCK").status_code == 201

    respuesta = cliente_vacio.delete("/api/v1/elementos/INS-STOCK")

    assert respuesta.status_code == 204
    assert cliente_vacio.get("/api/v1/elementos/INS-STOCK").status_code == 404
    assert cliente_vacio.get("/api/v1/dependencias").json() == {
        "dependencias": [],
        "total": 0,
    }


def test_eliminar_relacion_existente_y_repetir_da_404(cliente_vacio: TestClient) -> None:
    registrar_elemento(cliente_vacio, "PROC-T", "PROCESO", "Proceso de prueba")
    _crear_suministro(cliente_vacio)
    assert registrar_dependencia(cliente_vacio, "PROC-T", "INS-STOCK").status_code == 201
    assert registrar_dependencia(cliente_vacio, "INS-STOCK", "PROC-T").status_code == 201

    primera = cliente_vacio.delete("/api/v1/dependencias/INS-STOCK/PROC-T")
    segunda = cliente_vacio.delete("/api/v1/dependencias/INS-STOCK/PROC-T")

    assert primera.status_code == 204
    assert segunda.status_code == 404
    assert segunda.json()["error"]["codigo"] == "DEPENDENCIA_NO_ENCONTRADA"


def test_actualizar_relacion_cambia_extremos(cliente_vacio: TestClient) -> None:
    registrar_elemento(cliente_vacio, "PROC-T", "PROCESO", "Proceso de prueba")
    registrar_elemento(cliente_vacio, "PROD-T", "PRODUCTO", "Producto de prueba")
    _crear_suministro(cliente_vacio)
    assert registrar_dependencia(cliente_vacio, "PROC-T", "INS-STOCK").status_code == 201
    assert registrar_dependencia(cliente_vacio, "INS-STOCK", "PROC-T").status_code == 201

    respuesta = cliente_vacio.put(
        "/api/v1/dependencias/INS-STOCK/PROC-T",
        json={"origen": "INS-STOCK", "destino": "PROD-T"},
    )

    assert respuesta.status_code == 200
    assert respuesta.json()["destino"] == "PROD-T"
    pares = {
        (d["origen"], d["destino"])
        for d in cliente_vacio.get("/api/v1/dependencias").json()["dependencias"]
    }
    assert pares == {("PROC-T", "INS-STOCK"), ("INS-STOCK", "PROD-T")}


def test_reglas_de_dependencia_expuestas_por_la_api(cliente_vacio: TestClient) -> None:
    respuesta = cliente_vacio.get("/api/v1/reglas-dependencia")

    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    assert cuerpo["tipos"] == ["PROVEEDOR", "INSUMO", "PRODUCTO", "PROCESO"]
    assert len(cuerpo["reglas"]) == 16

    permitidas = {
        (regla["tipoOrigen"], regla["tipoDestino"])
        for regla in cuerpo["reglas"]
        if regla["permitida"]
    }
    assert permitidas == {
        ("PROVEEDOR", "INSUMO"),
        ("PROVEEDOR", "PROCESO"),
        ("PROVEEDOR", "PRODUCTO"),
        ("INSUMO", "PROCESO"),
        ("INSUMO", "PRODUCTO"),
        ("PROCESO", "INSUMO"),
        ("PROCESO", "PRODUCTO"),
    }


def test_relacion_entre_tipos_no_permitidos_devuelve_422(cliente_vacio: TestClient) -> None:
    registrar_elemento(cliente_vacio, "PROD-A", "PRODUCTO", "Producto A")
    registrar_elemento(cliente_vacio, "PROD-B", "PRODUCTO", "Producto B")

    respuesta = registrar_dependencia(cliente_vacio, "PROD-A", "PROD-B")

    assert respuesta.status_code == 422
    assert respuesta.json()["error"]["codigo"] == "DEPENDENCIA_INVALIDA"


def test_suministro_debe_estar_asociado_antes_de_enlazarse(cliente_vacio: TestClient) -> None:
    _crear_suministro(cliente_vacio)
    registrar_elemento(cliente_vacio, "PROC-T", "PROCESO", "Proceso de prueba")

    sin_asociacion = registrar_dependencia(cliente_vacio, "INS-STOCK", "PROC-T")

    assert sin_asociacion.status_code == 422
    error = sin_asociacion.json()["error"]
    assert error["codigo"] == "DEPENDENCIA_INVALIDA"
    assert [detalle["campo"] for detalle in error["detalles"]] == ["origen"]

    asociacion = registrar_dependencia(cliente_vacio, "PROC-T", "INS-STOCK")
    assert asociacion.status_code == 201

    con_asociacion = registrar_dependencia(cliente_vacio, "INS-STOCK", "PROC-T")
    assert con_asociacion.status_code == 201


def test_impacto_incluye_estado_de_stock_de_los_suministros(cliente_vacio: TestClient) -> None:
    registrar_elemento(cliente_vacio, "PROV-T", "PROVEEDOR", "Proveedor de prueba")
    _crear_suministro(cliente_vacio)
    registrar_elemento(cliente_vacio, "PROC-T", "PROCESO", "Proceso de prueba")
    assert registrar_dependencia(cliente_vacio, "PROV-T", "INS-STOCK").status_code == 201
    assert registrar_dependencia(cliente_vacio, "INS-STOCK", "PROC-T").status_code == 201

    respuesta = cliente_vacio.get("/api/v1/impacto/PROV-T")

    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    suministro = next(a for a in cuerpo["afectados"] if a["id"] == "INS-STOCK")
    assert suministro["estadoStock"] == "BAJO"
    assert suministro["alertaStock"] is True
    assert cuerpo["resumenStock"] == {
        "totalSuministros": 1,
        "suministrosBajoMinimo": 1,
    }
