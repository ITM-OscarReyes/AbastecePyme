"""Modelo de dominio de una dependencia entre dos elementos."""

from dataclasses import dataclass, field

#: Valor constante del tipo de relación en F1: el origen habilita al destino.
TIPO_RELACION_HABILITA = "habilita"


@dataclass(frozen=True)
class Dependencia:
    """Arista dirigida ``origen -> destino`` del grafo del catálogo.

    Significado del negocio (``docs/graph-model.md``): para producir o
    preparar el ``destino`` se necesita que el ``origen`` esté disponible.
    """

    origen: str
    destino: str
    tipo_relacion: str = field(default=TIPO_RELACION_HABILITA)
