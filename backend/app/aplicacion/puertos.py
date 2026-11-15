"""Puertos de salida de la capa de aplicación.

La aplicación depende de estas abstracciones; las implementaciones concretas
viven en infraestructura. El puerto del catálogo se usa desde F1 y el puerto
de sesiones se usa desde F4 (ver ``architecture.md``, sección 1.2 y §10).
"""

from typing import Protocol

from app.dominio.catalogo import Catalogo
from app.dominio.sesion import Sesion


class RepositorioCatalogo(Protocol):
    """Puerto de persistencia del catálogo de dependencias."""

    def obtener(self) -> Catalogo:
        """Devuelve el catálogo actual (estado compartido del servidor)."""
        ...

    def guardar(self, catalogo: Catalogo) -> None:
        """Persiste el estado del catálogo tras una operación de escritura."""
        ...


class RepositorioSesion(Protocol):
    """Puerto de almacén de sesiones de demostración de F4.

    La sesión vive en memoria del backend y se pierde al reiniciar. No es
    autenticación real: no valida identidad, no persiste ni protege las
    lecturas (ver ``RN-F4-03``).
    """

    def obtener(self, token: str) -> Sesion | None:
        """Devuelve la sesión asociada al ``token``, o ``None`` si no existe."""

    def guardar(self, sesion: Sesion) -> None:
        """Almacena la ``sesión`` indexada por su token."""

    def eliminar(self, token: str) -> None:
        """Invalida la sesión asociada al ``token`` si existe."""
