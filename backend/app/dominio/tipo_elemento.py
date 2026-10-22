"""Tipos de elemento admitidos por el catálogo.

El conjunto es cerrado (RF-F1-03): solo ``PROVEEDOR``, ``INSUMO``,
``PRODUCTO`` y ``PROCESO``.
"""

from enum import Enum


class TipoElemento(str, Enum):
    """Clasificación cerrada de un elemento del catálogo."""

    PROVEEDOR = "PROVEEDOR"
    INSUMO = "INSUMO"
    PRODUCTO = "PRODUCTO"
    PROCESO = "PROCESO"

    @classmethod
    def valores_admitidos(cls) -> list[str]:
        """Devuelve los valores admitidos como cadenas, en orden estable."""
        return [tipo.value for tipo in cls]
