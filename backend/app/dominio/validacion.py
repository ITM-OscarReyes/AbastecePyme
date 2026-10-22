"""Reglas de validación y normalización de los datos del catálogo.

Aquí vive una única implementación de cada regla de F1: la capa HTTP solo
comprueba que la petición es interpretable y el resto se decide en el dominio
(RNF-Q-04). Todas las funciones normalizan antes de validar y lanzan
``ValidacionFallida`` o ``IdentificadorInvalido`` según corresponda.
"""

import re

from app.dominio.errores import DetalleError, IdentificadorInvalido, ValidacionFallida
from app.dominio.tipo_elemento import TipoElemento

# Patrón de identificador definido por la especificación (RF-F1-01).
_PATRON_IDENTIFICADOR = re.compile(r"^[A-Z0-9][A-Z0-9_-]{2,39}$")

_LONGITUD_MIN_NOMBRE = 3
_LONGITUD_MAX_NOMBRE = 80
_LONGITUD_MAX_DESCRIPCION = 300


def es_identificador_valido(valor: str) -> bool:
    """Indica si ``valor`` cumple el formato de identificador del catálogo."""
    return bool(_PATRON_IDENTIFICADOR.match(valor))


def normalizar_identificador(valor: object, campo: str = "id") -> str:
    """Recorta, pasa a mayúsculas y valida el formato de un identificador.

    Se usa tanto para el ``id`` de un elemento como para ``origen``/``destino``
    de una dependencia. En cuerpo de petición un formato inválido es
    ``ValidacionFallida``; en ruta o parámetros de consulta se usa
    ``IdentificadorInvalido`` (ERR-05).
    """
    if not isinstance(valor, str):
        raise ValidacionFallida(
            "La solicitud contiene datos inválidos.",
            [DetalleError(campo, "Debe ser texto.")],
        )
    normalizado = valor.strip().upper()
    if not es_identificador_valido(normalizado):
        raise ValidacionFallida(
            "La solicitud contiene datos inválidos.",
            [DetalleError(campo, "Debe cumplir el patrón ^[A-Z0-9][A-Z0-9_-]{2,39}$ (3 a 40 caracteres).")],
        )
    return normalizado


def validar_identificador_consulta(valor: object, campo: str) -> str:
    """Normaliza y valida un identificador recibido en ruta o en query.

    Distingue «mal formado» (``IdentificadorInvalido``, ERR-05) de
    «inexistente» (``ElementoNoEncontrado``, ERR-02), que el cliente debe
    poder diferenciar (RF-F1-05).
    """
    if not isinstance(valor, str):
        raise IdentificadorInvalido(
            f"El identificador '{campo}' no cumple el formato esperado.",
            [DetalleError(campo, "Debe ser texto con formato de identificador.")],
        )
    normalizado = valor.strip().upper()
    if not es_identificador_valido(normalizado):
        raise IdentificadorInvalido(
            f"El identificador '{normalizado}' no cumple el formato esperado.",
            [DetalleError(campo, "Debe cumplir el patrón ^[A-Z0-9][A-Z0-9_-]{2,39}$ (3 a 40 caracteres).")],
        )
    return normalizado


def normalizar_tipo(valor: object) -> TipoElemento:
    """Recorta, pasa a mayúsculas y valida el tipo de un elemento."""
    if not isinstance(valor, str):
        raise ValidacionFallida(
            "La solicitud contiene datos inválidos.",
            [DetalleError("tipo", "Debe ser texto.")],
        )
    normalizado = valor.strip().upper()
    try:
        return TipoElemento(normalizado)
    except ValueError:
        raise ValidacionFallida(
            "La solicitud contiene datos inválidos.",
            [DetalleError("tipo", f"Debe ser uno de: {', '.join(TipoElemento.valores_admitidos())}.")],
        ) from None


def normalizar_nombre(valor: object) -> str:
    """Recorta y valida el nombre de un elemento (3 a 80 caracteres)."""
    if not isinstance(valor, str):
        raise ValidacionFallida(
            "La solicitud contiene datos inválidos.",
            [DetalleError("nombre", "Debe ser texto.")],
        )
    normalizado = valor.strip()
    if len(normalizado) < _LONGITUD_MIN_NOMBRE or len(normalizado) > _LONGITUD_MAX_NOMBRE:
        raise ValidacionFallida(
            "La solicitud contiene datos inválidos.",
            [DetalleError("nombre", f"Debe tener entre {_LONGITUD_MIN_NOMBRE} y {_LONGITUD_MAX_NOMBRE} caracteres.")],
        )
    return normalizado


def normalizar_descripcion(valor: object) -> str | None:
    """Valida la descripción opcional (texto de hasta 300 caracteres)."""
    if valor is None:
        return None
    if not isinstance(valor, str):
        raise ValidacionFallida(
            "La solicitud contiene datos inválidos.",
            [DetalleError("descripcion", "Debe ser texto.")],
        )
    normalizado = valor.strip()
    if len(normalizado) > _LONGITUD_MAX_DESCRIPCION:
        raise ValidacionFallida(
            "La solicitud contiene datos inválidos.",
            [DetalleError("descripcion", f"No puede superar {_LONGITUD_MAX_DESCRIPCION} caracteres.")],
        )
    return normalizado
