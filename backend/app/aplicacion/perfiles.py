"""Definición de perfiles de demostración de F4.

Los perfiles son ``COMPRAS`` (puede escribir) y ``PRODUCCION`` (solo consulta).
Esta definición vive en la capa de aplicación, no en el dominio del grafo
(ver ``architecture.md``, sección 1.1, tabla de F4).
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class Perfil:
    """Perfil de demostración con su nombre visible y capacidad de escritura."""

    id: str
    nombre: str
    puede_escribir: bool


#: Perfiles disponibles para la sesión de demostración de F4.
PERFILES_DISPONIBLES: tuple[Perfil, ...] = (
    Perfil(id="ADMINISTRADOR", nombre="Administrador", puede_escribir=True),
    Perfil(id="COMPRAS", nombre="Responsable de compras", puede_escribir=True),
    Perfil(id="PRODUCCION", nombre="Coordinador de producción", puede_escribir=True),
    Perfil(id="VENTAS", nombre="Asesor de ventas", puede_escribir=False),
)


def perfil_por_id(perfil_id: str) -> Perfil | None:
    """Devuelve el perfil con el ``id`` indicado, o ``None`` si no existe."""
    for perfil in PERFILES_DISPONIBLES:
        if perfil.id == perfil_id:
            return perfil
    return None


def existe_perfil(perfil_id: str) -> bool:
    """Indica si existe un perfil con ese identificador."""
    return perfil_por_id(perfil_id) is not None
