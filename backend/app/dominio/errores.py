"""Catálogo de errores de negocio de F1.

Cada error lleva un código estable (alineado con ``docs/api-contract.md``),
un mensaje legible y detalles por campo cuando aplica. La traducción de cada
código a su código HTTP ocurre en la capa de infraestructura; el dominio no
conoce HTTP.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class DetalleError:
    """Detalle de un problema de validación asociado a un campo concreto."""

    campo: str
    mensaje: str


class ErrorDominio(Exception):
    """Error base del dominio con código estable y detalles por campo."""

    codigo: str = "ERROR_DOMINIO"

    def __init__(self, mensaje: str, detalles: list[DetalleError] | None = None) -> None:
        super().__init__(mensaje)
        self.mensaje = mensaje
        self.detalles: list[DetalleError] = detalles if detalles is not None else []


class ElementoDuplicado(ErrorDominio):
    """ERR-01: el identificador del elemento ya existe en el catálogo."""

    codigo = "ELEMENTO_DUPLICADO"


class ElementoNoEncontrado(ErrorDominio):
    """ERR-02: un elemento referenciado no existe en el catálogo."""

    codigo = "ELEMENTO_NO_ENCONTRADO"


class PeticionMalFormada(ErrorDominio):
    """ERR-03: el cuerpo de la petición no es interpretable."""

    codigo = "PETICION_MAL_FORMADA"


class ValidacionFallida(ErrorDominio):
    """ERR-04: un campo falta, no es del tipo esperado o no cumple su regla."""

    codigo = "VALIDACION_FALLIDA"


class IdentificadorInvalido(ErrorDominio):
    """ERR-05: un identificador no cumple el formato previsto."""

    codigo = "IDENTIFICADOR_INVALIDO"


class CampoNoPermitido(ErrorDominio):
    """ERR-06: la petición incluye un campo no reconocido por el recurso."""

    codigo = "CAMPO_NO_PERMITIDO"


class DependenciaInvalida(ErrorDominio):
    """ERR-07: la dependencia es inválida (origen igual a destino)."""

    codigo = "DEPENDENCIA_INVALIDA"


class DependenciaDuplicada(ErrorDominio):
    """ERR-08: ya existe una dependencia con el mismo par origen/destino."""

    codigo = "DEPENDENCIA_DUPLICADA"


class RutaNoEncontrada(ErrorDominio):
    """ERR-09: la ruta solicitada no existe en la API."""

    codigo = "TIPO_NO_ENCONTRADO"
