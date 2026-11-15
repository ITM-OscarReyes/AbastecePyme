"""Modelo de dominio de una sesión de demostración de F4.

La sesión vincula un token opaco con un identificador de perfil. No contiene
la definición de perfiles ni su capacidad de escritura (eso vive en la capa
de aplicación); el dominio solo modela el par token/perfil como un valor
inmutable.

La sesión de demostración no es autenticación real: no valida identidad, no
persiste y no protege las lecturas (ver ``RN-F4-03``).
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class Sesion:
    """Sesión de demostración generada por el backend.

    El token es opaco y aleatorio; el cliente lo envía como
    ``Authorization: Bearer <token>`` en las peticiones de escritura.
    ``perfil_id`` identifica al perfil asociado (``COMPRAS`` o
    ``PRODUCCION``).
    """

    token: str
    perfil_id: str
