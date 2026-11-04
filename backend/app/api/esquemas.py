"""Esquemas de entrada y salida de la API.

Los modelos Pydantic usan nombres Python en ``snake_case`` y traducen a
``lowerCamelCase`` únicamente al serializar. La validación de reglas de
negocio no vive aquí: los modelos de entrada aceptan cualquier JSON
interpretable y los casos de uso aplican las reglas del dominio.
"""

from typing import Any

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class _EsquemaBase(BaseModel):
    """Base con traducción de nombres a ``lowerCamelCase`` al serializar."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class EntradaElemento(_EsquemaBase):
    """Cuerpo de ``POST /api/v1/elementos``; los campos se validan en dominio."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, extra="allow")

    id: Any = None
    tipo: Any = None
    nombre: Any = None
    descripcion: Any = None
    stock_disponible: Any = None
    stock_minimo: Any = None

    def como_diccionario(self) -> dict[str, object]:
        """Devuelve todos los campos recibidos, incluidos los no reconocidos."""
        return dict(self.model_dump())


class EntradaActualizarElemento(_EsquemaBase):
    """Cuerpo de ``PUT /api/v1/elementos/{id}``.

    El identificador y el tipo no se editan: el código es estable y el tipo
    determina las reglas de dependencia aplicables.
    """

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, extra="allow")

    nombre: Any = None
    descripcion: Any = None
    stock_disponible: Any = None
    stock_minimo: Any = None

    def como_diccionario(self) -> dict[str, object]:
        """Devuelve solo los campos enviados explícitamente por el cliente."""
        return dict(self.model_dump(exclude_unset=True))


class EntradaDependencia(_EsquemaBase):
    """Cuerpo de ``POST /api/v1/dependencias``; los campos se validan en dominio."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, extra="allow")

    origen: Any = None
    destino: Any = None

    def como_diccionario(self) -> dict[str, object]:
        """Devuelve todos los campos recibidos, incluidos los no reconocidos."""
        return dict(self.model_dump())


class ElementoRespuesta(_EsquemaBase):
    """Representación HTTP de un elemento del catálogo."""

    id: str
    tipo: str
    nombre: str
    descripcion: str | None
    stock_disponible: int | None
    stock_minimo: int | None
    estado_stock: str
    alerta_stock: bool


class DependenciaRespuesta(_EsquemaBase):
    """Representación HTTP de una dependencia (``origen habilita destino``)."""

    origen: str
    destino: str
    tipo_relacion: str


class ListaElementosRespuesta(_EsquemaBase):
    """Colección de elementos con su total."""

    elementos: list[ElementoRespuesta]
    total: int


class ListaDependenciasRespuesta(_EsquemaBase):
    """Colección de dependencias con su total."""

    dependencias: list[DependenciaRespuesta]
    total: int


class ResumenGrafo(_EsquemaBase):
    """Totales del grafo del catálogo."""

    total_elementos: int
    total_dependencias: int


class GrafoRespuesta(_EsquemaBase):
    """Representación del grafo: estructura del catálogo tal como está."""

    elementos: list[ElementoRespuesta]
    dependencias: list[DependenciaRespuesta]
    resumen: ResumenGrafo


class DetalleErrorRespuesta(_EsquemaBase):
    """Entrada de detalle de un error, asociada a un campo."""

    campo: str
    mensaje: str


class CuerpoErrorRespuesta(_EsquemaBase):
    """Contenido del sobre único de error."""

    codigo: str
    mensaje: str
    detalles: list[DetalleErrorRespuesta]


class RespuestaError(_EsquemaBase):
    """Sobre único y uniforme para todos los errores del catálogo."""

    error: CuerpoErrorRespuesta


class ElementoImpactoRespuesta(_EsquemaBase):
    """Elemento dentro de un análisis de impacto, con su estado de stock."""

    id: str
    tipo: str
    nombre: str
    descripcion: str | None
    stock_disponible: int | None
    stock_minimo: int | None
    estado_stock: str
    alerta_stock: bool


class ResumenStockImpacto(_EsquemaBase):
    """Resumen de inventario de los suministros involucrados en el impacto."""

    total_suministros: int
    suministros_bajo_minimo: int


class ImpactoRespuesta(_EsquemaBase):
    """Respuesta de ``GET /api/v1/impacto/{id}``."""

    elemento: ElementoImpactoRespuesta
    afectados: list[ElementoImpactoRespuesta]
    total: int
    resumen_stock: ResumenStockImpacto


class ReglaDependenciaRespuesta(_EsquemaBase):
    """Combinación de tipos y su veredicto de dependencia."""

    tipo_origen: str
    tipo_destino: str
    permitida: bool
    motivo: str


class ReglasDependenciaRespuesta(_EsquemaBase):
    """Reglas de dependencia disponibles para la interfaz."""

    tipos: list[str]
    reglas: list[ReglaDependenciaRespuesta]
