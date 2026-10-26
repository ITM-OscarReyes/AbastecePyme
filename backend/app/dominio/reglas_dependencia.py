"""Reglas de dependencia permitidas entre tipos de elemento.

Una arista ``origen -> destino`` significa «el origen habilita al destino».
Estas reglas se exponen por la API para que la interfaz muestre, antes de
crear una relación, qué combinaciones son válidas. La validación efectiva se
aplica siempre en el dominio.

Decisión de negocio (ver ``docs/decisions/analyst.md``):

- Un proveedor puede abastecer suministros, procesos y productos.
- Un suministro puede alimentar procesos y productos; además puede ser
  generado por un proceso (subensamblaje interno).
- Un proceso puede generar suministros y productos.
- Un producto es terminal: no habilita a otros elementos.
- Un suministro que se enlaza hacia un proceso o producto debe estar asociado
  antes a un proveedor o a un proceso.
"""

from dataclasses import dataclass

from app.dominio.tipo_elemento import TipoElemento

#: Relaciones permitidas por tipo de origen.
RELACIONES_PERMITIDAS: dict[TipoElemento, frozenset[TipoElemento]] = {
    TipoElemento.PROVEEDOR: frozenset(
        {TipoElemento.INSUMO, TipoElemento.PROCESO, TipoElemento.PRODUCTO}
    ),
    TipoElemento.INSUMO: frozenset({TipoElemento.PROCESO, TipoElemento.PRODUCTO}),
    TipoElemento.PROCESO: frozenset({TipoElemento.INSUMO, TipoElemento.PRODUCTO}),
    TipoElemento.PRODUCTO: frozenset(),
}

#: Tipos que pueden asociar un suministro para que exista en la cadena.
TIPOS_QUE_ASOCIAN_SUMINISTRO: frozenset[TipoElemento] = frozenset(
    {TipoElemento.PROVEEDOR, TipoElemento.PROCESO}
)

_MOTIVOS_NO_PERMITIDOS: dict[tuple[TipoElemento, TipoElemento], str] = {
    (TipoElemento.PROVEEDOR, TipoElemento.PROVEEDOR): (
        "Un proveedor no depende de otro elemento; es el origen externo de la cadena."
    ),
    (TipoElemento.INSUMO, TipoElemento.PROVEEDOR): (
        "Un proveedor es una fuente externa y no puede ser generado por un suministro."
    ),
    (TipoElemento.INSUMO, TipoElemento.INSUMO): (
        "Un suministro no puede habilitar directamente a otro suministro; debe hacerlo a través de un proceso."
    ),
    (TipoElemento.PROCESO, TipoElemento.PROVEEDOR): (
        "Un proveedor es una fuente externa y no puede ser generado por un proceso."
    ),
    (TipoElemento.PROCESO, TipoElemento.PROCESO): (
        "Un proceso no puede habilitar directamente a otro proceso; debe hacerlo a través de un suministro."
    ),
    (TipoElemento.PRODUCTO, TipoElemento.PROVEEDOR): (
        "Un producto es terminal y no puede habilitar a otros elementos."
    ),
    (TipoElemento.PRODUCTO, TipoElemento.INSUMO): (
        "Un producto es terminal y no puede habilitar a otros elementos."
    ),
    (TipoElemento.PRODUCTO, TipoElemento.PROCESO): (
        "Un producto es terminal y no puede habilitar a otros elementos."
    ),
    (TipoElemento.PRODUCTO, TipoElemento.PRODUCTO): (
        "Un producto es terminal y no puede habilitar a otro producto."
    ),
}


@dataclass(frozen=True)
class ReglaDependencia:
    """Combinación de tipos de origen y destino con su veredicto."""

    tipo_origen: TipoElemento
    tipo_destino: TipoElemento
    permitida: bool
    motivo: str


def reglas_por_tipo() -> list[ReglaDependencia]:
    """Devuelve las 16 combinaciones de tipos en orden estable."""
    reglas: list[ReglaDependencia] = []
    for tipo_origen in TipoElemento:
        for tipo_destino in TipoElemento:
            permitida = tipo_destino in RELACIONES_PERMITIDAS[tipo_origen]
            if permitida:
                motivo = _motivo_permitida(tipo_origen, tipo_destino)
            else:
                motivo = _MOTIVOS_NO_PERMITIDOS[(tipo_origen, tipo_destino)]
            reglas.append(
                ReglaDependencia(
                    tipo_origen=tipo_origen,
                    tipo_destino=tipo_destino,
                    permitida=permitida,
                    motivo=motivo,
                )
            )
    return reglas


def es_relacion_permitida(origen: TipoElemento, destino: TipoElemento) -> bool:
    """Indica si la combinación de tipos está permitida."""
    return destino in RELACIONES_PERMITIDAS[origen]


def motivo_no_permitida(origen: TipoElemento, destino: TipoElemento) -> str:
    """Explica por qué una combinación de tipos no está permitida."""
    return _MOTIVOS_NO_PERMITIDOS[(origen, destino)]


def _motivo_permitida(origen: TipoElemento, destino: TipoElemento) -> str:
    if origen is TipoElemento.PROVEEDOR:
        return "El proveedor puede abastecer este tipo de elemento."
    if origen is TipoElemento.INSUMO:
        return (
            "El suministro puede alimentar este tipo de elemento; debe estar "
            "asociado a un proveedor o proceso."
        )
    if origen is TipoElemento.PROCESO:
        return "El proceso puede generar este tipo de elemento."
    return "Relación permitida."
