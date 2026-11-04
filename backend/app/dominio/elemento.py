"""Modelo de dominio de un elemento del catálogo."""

from dataclasses import dataclass

from app.dominio.tipo_elemento import TipoElemento
from app.dominio.validacion import (
    normalizar_descripcion,
    normalizar_identificador,
    normalizar_inventario,
    normalizar_nombre,
    normalizar_tipo,
)

#: Estado de stock de un elemento que no maneja inventario.
ESTADO_STOCK_NO_APLICA = "NO_APLICA"
#: El suministro tiene al menos el mínimo aceptable.
ESTADO_STOCK_SUFICIENTE = "SUFICIENTE"
#: El suministro está por debajo del mínimo aceptable.
ESTADO_STOCK_BAJO = "BAJO"


@dataclass(frozen=True)
class Elemento:
    """Unidad del catálogo: un proveedor, suministro, producto o proceso.

    Es inmutable: los cambios se expresan creando una nueva instancia con
    ``actualizar``. Solo los suministros (``INSUMO``) manejan inventario.
    """

    id: str
    tipo: TipoElemento
    nombre: str
    descripcion: str | None = None
    stock_disponible: int | None = None
    stock_minimo: int | None = None

    @classmethod
    def crear(
        cls,
        id_valor: object,
        tipo: object,
        nombre: object,
        descripcion: object = None,
        stock_disponible: object = None,
        stock_minimo: object = None,
    ) -> "Elemento":
        """Construye un elemento validando y normalizando todos sus campos."""
        tipo_normalizado = normalizar_tipo(tipo)
        disponible, minimo = normalizar_inventario(
            tipo_normalizado, stock_disponible, stock_minimo
        )
        return cls(
            id=normalizar_identificador(id_valor),
            tipo=tipo_normalizado,
            nombre=normalizar_nombre(nombre),
            descripcion=normalizar_descripcion(descripcion),
            stock_disponible=disponible,
            stock_minimo=minimo,
        )

    @property
    def maneja_inventario(self) -> bool:
        """Indica si el tipo de elemento admite inventario."""
        return self.tipo is TipoElemento.INSUMO

    @property
    def estado_stock(self) -> str:
        """Estado del suministro frente a su mínimo aceptable.

        La alerta se produce cuando la cantidad disponible es estrictamente
        menor que el mínimo configurado. Los elementos sin inventario
        responden ``NO_APLICA``.
        """
        if not self.maneja_inventario:
            return ESTADO_STOCK_NO_APLICA
        if (self.stock_disponible or 0) < (self.stock_minimo or 0):
            return ESTADO_STOCK_BAJO
        return ESTADO_STOCK_SUFICIENTE

    @property
    def alerta_stock(self) -> bool:
        """Indica si el suministro está por debajo de su mínimo aceptable."""
        return self.estado_stock == ESTADO_STOCK_BAJO

    def actualizar(
        self,
        nombre: object = None,
        descripcion: object = None,
        stock_disponible: object = None,
        stock_minimo: object = None,
        *,
        nombre_presente: bool = True,
        descripcion_presente: bool = True,
        stock_disponible_presente: bool = True,
        stock_minimo_presente: bool = True,
    ) -> "Elemento":
        """Devuelve una copia con los campos indicados.

        El identificador y el tipo no cambian: el código es estable y el tipo
        determina qué reglas de dependencia aplican. Los campos ausentes
        conservan su valor actual.
        """
        nuevo_nombre = nombre if nombre_presente else self.nombre
        nueva_descripcion = descripcion if descripcion_presente else self.descripcion
        nuevo_disponible = (
            stock_disponible if stock_disponible_presente else self.stock_disponible
        )
        nuevo_minimo = stock_minimo if stock_minimo_presente else self.stock_minimo
        return Elemento.crear(
            id_valor=self.id,
            tipo=self.tipo,
            nombre=nuevo_nombre,
            descripcion=nueva_descripcion,
            stock_disponible=nuevo_disponible,
            stock_minimo=nuevo_minimo,
        )
