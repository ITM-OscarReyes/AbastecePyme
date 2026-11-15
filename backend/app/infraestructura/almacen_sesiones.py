"""Adaptador de persistencia en memoria de las sesiones de demostración de F4.

AMB-F4-01: la sesión de demostración no persiste entre reinicios; este
almacén vive en memoria y se vacía al reiniciar el backend. Cambiar de
adaptador no afecta al dominio ni a los casos de uso.
"""

from app.aplicacion.puertos import RepositorioSesion
from app.dominio.sesion import Sesion


class RepositorioSesionMemoria(RepositorioSesion):
    """Implementación del puerto ``RepositorioSesion`` en memoria."""

    def __init__(self) -> None:
        self._sesiones: dict[str, Sesion] = {}

    def obtener(self, token: str) -> Sesion | None:
        """Devuelve la sesión asociada al ``token``, o ``None`` si no existe."""
        return self._sesiones.get(token)

    def guardar(self, sesion: Sesion) -> None:
        """Almacena la ``sesión`` indexada por su token."""
        self._sesiones[sesion.token] = sesion

    def eliminar(self, token: str) -> None:
        """Invalida la sesión asociada al ``token`` si existe."""
        self._sesiones.pop(token, None)
