"""Adaptador de persistencia en memoria del catálogo.

AMB-F1-02: el brief no exige persistencia entre reinicios, por lo que F1
usa almacenamiento en memoria. Cambiar de adaptador no afecta al dominio ni
a los casos de uso.
"""

from app.dominio.catalogo import Catalogo


class RepositorioCatalogoMemoria:
    """Implementación del puerto ``RepositorioCatalogo`` en memoria."""

    def __init__(self, catalogo: Catalogo | None = None) -> None:
        self._catalogo = catalogo if catalogo is not None else Catalogo()

    def obtener(self) -> Catalogo:
        return self._catalogo

    def guardar(self, catalogo: Catalogo) -> None:
        self._catalogo = catalogo
