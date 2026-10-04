"""Puertos de salida de la capa de aplicación.

La aplicación depende de esta abstracción; la implementación concreta vive en
infraestructura. De momento el único puerto necesario es el repositorio del
catálogo (ver ``architecture.md``, sección 1.2).
"""

from typing import Protocol

from app.dominio.catalogo import Catalogo


class RepositorioCatalogo(Protocol):
    """Puerto de persistencia del catálogo de dependencias."""

    def obtener(self) -> Catalogo:
        """Devuelve el catálogo actual (estado compartido del servidor)."""
        ...

    def guardar(self, catalogo: Catalogo) -> None:
        """Persiste el estado del catálogo tras una operación de escritura."""
        ...
