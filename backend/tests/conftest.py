"""Utilidades compartidas de las pruebas de F1 — Catálogo de dependencias.

Cada prueba se ejecuta contra una aplicación nueva con el catálogo que necesita,
de modo que ningún test dependa del orden de ejecución ni del estado que deja
otro (RNF-F1-05: respuestas deterministas).
"""

import sys
from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

RAIZ_BACKEND = Path(__file__).resolve().parents[1]
if str(RAIZ_BACKEND) not in sys.path:
    sys.path.insert(0, str(RAIZ_BACKEND))

from app.api.aplicacion import crear_aplicacion  # noqa: E402
from app.dominio.catalogo import Catalogo  # noqa: E402
from app.infraestructura.datos_demostracion import (  # noqa: E402
    poblar_catalogo_demostracion,
)

#: Conjunto sintético de ``acceptance-criteria.md`` sección 1.
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
    ("INS-BARRA", "PROC-CORTE"),
    ("PROC-CORTE", "PROD-PANEL"),
    ("INS-TORNILLO", "PROD-PANEL"),
    ("PROD-PANEL", "PROD-BANCO"),
)

CODIGOS_ERROR = {
    "ERR-01": "ELEMENTO_DUPLICADO",
    "ERR-02": "ELEMENTO_NO_ENCONTRADO",
    "ERR-03": "PETICION_MAL_FORMADA",
    "ERR-04": "VALIDACION_FALLIDA",
    "ERR-05": "IDENTIFICADOR_INVALIDO",
    "ERR-06": "CAMPO_NO_PERMITIDO",
    "ERR-07": "DEPENDENCIA_INVALIDA",
    "ERR-08": "DEPENDENCIA_DUPLICADA",
    "ERR-09": "TIPO_NO_ENCONTRADO",
}


def construir_catalogo_prueba() -> Catalogo:
    """Crea el catálogo sintético de ``acceptance-criteria.md`` por el dominio."""
    catalogo = Catalogo()
    from app.dominio.elemento import Elemento

    for id_valor, tipo, nombre in ELEMENTOS_PRUEBA:
        catalogo.registrar_elemento(Elemento.crear(id_valor, tipo, nombre))
    for origen, destino in DEPENDENCIAS_PRUEBA:
        catalogo.registrar_dependencia(origen, destino)
    return catalogo


def _cliente_de(catalogo: Catalogo | None) -> Iterator[TestClient]:
    aplicacion = crear_aplicacion(catalogo)
    with TestClient(aplicacion) as cliente:
        yield cliente


@pytest.fixture
def cliente_vacio() -> Iterator[TestClient]:
    """Aplicación F1 con el catálogo sin elementos (AC-F1-13)."""
    yield from _cliente_de(Catalogo())


@pytest.fixture
def cliente() -> Iterator[TestClient]:
    """Aplicación F1 con el catálogo sintético de demostración."""
    yield from _cliente_de(poblar_catalogo_demostracion(Catalogo()))


@pytest.fixture
def cliente_limpio() -> Iterator[TestClient]:
    """Aplicación F1 con el catálogo del conjunto de prueba, sin demostración."""
    yield from _cliente_de(construir_catalogo_prueba())


@pytest.fixture
def cliente_solo_elementos() -> Iterator[TestClient]:
    """Catálogo con los seis elementos de prueba y ninguna dependencia.

    Permite comprobar el registro de una dependencia que el conjunto de
    demostración ya trae, sin depender del estado que crea otra prueba.
    """
    from app.dominio.elemento import Elemento

    catalogo = Catalogo()
    for id_valor, tipo, nombre in ELEMENTOS_PRUEBA:
        catalogo.registrar_elemento(Elemento.crear(id_valor, tipo, nombre))
    yield from _cliente_de(catalogo)


def registrar_elemento(cliente: TestClient, id_valor: str, tipo: str, nombre: str, **extra: object):
    """Envia un alta de elemento por la API y devuelve la respuesta."""
    cuerpo = {"id": id_valor, "tipo": tipo, "nombre": nombre, **extra}
    return cliente.post("/api/v1/elementos", json=cuerpo)


def registrar_dependencia(cliente: TestClient, origen: str, destino: str):
    """Envia un alta de dependencia por la API y devuelve la respuesta."""
    return cliente.post("/api/v1/dependencias", json={"origen": origen, "destino": destino})


def sembrar(cliente: TestClient, elementos=ELEMENTOS_PRUEBA, dependencias=DEPENDENCIAS_PRUEBA) -> None:
    """Registra por la API el conjunto indicado; falla si alguna alta se rechaza."""
    for id_valor, tipo, nombre in elementos:
        respuesta = registrar_elemento(cliente, id_valor, tipo, nombre)
        assert respuesta.status_code == 201, respuesta.text
    for origen, destino in dependencias:
        respuesta = registrar_dependencia(cliente, origen, destino)
        assert respuesta.status_code == 201, respuesta.text
