"""Modelo de dominio de un elemento del catálogo."""

from dataclasses import dataclass

from app.dominio.tipo_elemento import TipoElemento
from app.dominio.validacion import (
    normalizar_descripcion,
    normalizar_identificador,
    normalizar_nombre,
    normalizar_tipo,
)


@dataclass(frozen=True)
class Elemento:
    """Unidad del catálogo: un proveedor, insumo, producto o proceso.

    Es inmutable: una vez registrado no se modifica (F1 no define edición).
    """

    id: str
    tipo: TipoElemento
    nombre: str
    descripcion: str | None = None

    @classmethod
    def crear(
        cls,
        id_valor: object,
        tipo: object,
        nombre: object,
        descripcion: object = None,
    ) -> "Elemento":
        """Construye un elemento validando y normalizando todos sus campos."""
        return cls(
            id=normalizar_identificador(id_valor),
            tipo=normalizar_tipo(tipo),
            nombre=normalizar_nombre(nombre),
            descripcion=normalizar_descripcion(descripcion),
        )
