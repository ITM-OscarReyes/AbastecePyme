"""Traducción de errores a respuestas HTTP.

Toda la decisión de códigos HTTP y del sobre de error vive aquí: el dominio
lanza excepciones con código estable y esta capa las traduce (sección 3.1 de
``architecture.md``).
"""

from fastapi import FastAPI, Request, status
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.dominio.errores import (
    CampoNoPermitido,
    DependenciaDuplicada,
    DependenciaInvalida,
    DetalleError,
    ElementoDuplicado,
    ElementoNoEncontrado,
    ErrorDominio,
    IdentificadorInvalido,
    PeticionMalFormada,
    RutaNoEncontrada,
    ValidacionFallida,
)

#: Código HTTP asociado a cada error de dominio estable del contrato.
_HTTP_POR_CODIGO: dict[str, int] = {
    ElementoDuplicado.codigo: status.HTTP_409_CONFLICT,
    ElementoNoEncontrado.codigo: status.HTTP_404_NOT_FOUND,
    PeticionMalFormada.codigo: status.HTTP_400_BAD_REQUEST,
    ValidacionFallida.codigo: status.HTTP_422_UNPROCESSABLE_CONTENT,
    IdentificadorInvalido.codigo: status.HTTP_422_UNPROCESSABLE_CONTENT,
    CampoNoPermitido.codigo: status.HTTP_422_UNPROCESSABLE_CONTENT,
    DependenciaInvalida.codigo: status.HTTP_422_UNPROCESSABLE_CONTENT,
    DependenciaDuplicada.codigo: status.HTTP_409_CONFLICT,
    "TIPO_NO_ENCONTRADO": status.HTTP_404_NOT_FOUND,
}


def _contenido_error(error: ErrorDominio) -> dict[str, object]:
    """Construye el cuerpo uniforme de error del contrato."""
    return {
        "error": {
            "codigo": error.codigo,
            "mensaje": error.mensaje,
            "detalles": [
                {"campo": detalle.campo, "mensaje": detalle.mensaje}
                for detalle in error.detalles
            ],
        }
    }


def _clasificar_error_validacion(exc: RequestValidationError) -> ErrorDominio:
    """Traduce un ``RequestValidationError`` de FastAPI a un error de dominio.

    Regla: cuerpo ilegible o con estructura incorrecta → ERR-03; campo no
    reconocido → ERR-06; cualquier otra falta de validez estructural → ERR-04.
    La validación de formato de negocio ocurre después, en el dominio.
    """
    primero = exc.errors()[0] if exc.errors() else {}
    tipo = primero.get("type", "")
    ubicacion = tuple(primero.get("loc", ()))

    if tipo in {"json_invalid", "model_type", "model_attributes_type", "model_one_of"}:
        return PeticionMalFormada("El cuerpo de la petición no es un JSON válido o no tiene la estructura esperada.")
    if tipo == "extra_forbidden":
        campo = str(ubicacion[-1]) if ubicacion else ""
        return CampoNoPermitido(
            "La petición incluye campos no admitidos.",
            detalles=[DetalleError(campo, "Campo no reconocido en el recurso.")],
        )
    if tipo == "missing" and ubicacion == ("body",):
        return PeticionMalFormada("El cuerpo de la petición está ausente o vacío.")
    if tipo in {"json_parsing", "value_error"} and any(parte == "body" for parte in ubicacion):
        return PeticionMalFormada("El cuerpo de la petición no es un JSON válido.")
    campo = str(ubicacion[-1]) if len(ubicacion) > 1 else ""
    return ValidacionFallida(
        "La solicitud contiene datos inválidos.",
        detalles=[DetalleError(campo, str(primero.get("msg", "Valor no válido.")))],
    )


def registrar_manejadores_error(aplicacion: FastAPI) -> None:
    """Instala los manejadores de excepciones que producen el sobre único."""

    @aplicacion.exception_handler(ErrorDominio)
    async def manejar_error_dominio(_peticion: Request, exc: ErrorDominio) -> JSONResponse:
        codigo_http = _HTTP_POR_CODIGO.get(exc.codigo, status.HTTP_500_INTERNAL_SERVER_ERROR)
        return JSONResponse(status_code=codigo_http, content=jsonable_encoder(_contenido_error(exc)))

    @aplicacion.exception_handler(RequestValidationError)
    async def manejar_error_validacion(_peticion: Request, exc: RequestValidationError) -> JSONResponse:
        error = _clasificar_error_validacion(exc)
        codigo_http = _HTTP_POR_CODIGO.get(error.codigo, status.HTTP_422_UNPROCESSABLE_CONTENT)
        return JSONResponse(status_code=codigo_http, content=jsonable_encoder(_contenido_error(error)))

    @aplicacion.exception_handler(StarletteHTTPException)
    async def manejar_excepcion_http(_peticion: Request, exc: StarletteHTTPException) -> JSONResponse:
        if exc.status_code == status.HTTP_404_NOT_FOUND:
            error = RutaNoEncontrada("La ruta solicitada no existe en la API.")
            return JSONResponse(
                status_code=status.HTTP_404_NOT_FOUND,
                content=jsonable_encoder(_contenido_error(error)),
            )
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})
