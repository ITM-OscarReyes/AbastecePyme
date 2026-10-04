"""Esquemas de entrada y salida de la API.

Los modelos Pydantic usan nombres Python en ``snake_case`` y traducen a
``lowerCamelCase`` únicamente al serializar (ver ``architecture.md`` 3.1).
La validación de reglas de negocio no vive aquí: los modelos de entrada
aceptan cualquier JSON interpretable y los casos de uso aplican las reglas
del dominio, para que cada regla se evalúe en un único lugar (RNF-Q-04).
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

    def como_diccionario(self) -> dict[str, object]:
        """Devuelve todos los campos recibidos, incluidos los no reconocidos."""
        return dict(self.model_dump())


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
    """Representación del grafo: estructura del catálogo tal como está.

    No incluye recorridos, niveles, ciclos ni órdenes (F1 no los calcula).
    """

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
    """Sobre único y uniforme para todos los errores de F1."""

    error: CuerpoErrorRespuesta
