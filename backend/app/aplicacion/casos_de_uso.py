"""Casos de uso de F1 — Catálogo de dependencias.

Cada caso de uso expresa una operación del catálogo en términos del dominio:
valida a través de las reglas del dominio, delega en el agregado ``Catalogo``
y no contiene decisiones de transporte ni de persistencia.
"""

from collections.abc import Mapping

from app.aplicacion.puertos import RepositorioCatalogo
from app.dominio.catalogo import Catalogo
from app.dominio.dependencia import Dependencia
from app.dominio.elemento import Elemento
from app.dominio.errores import CampoNoPermitido, DetalleError
from app.dominio.tipo_elemento import TipoElemento
from app.dominio.validacion import (
    normalizar_identificador,
    normalizar_tipo,
    validar_identificador_consulta,
)

_CAMPOS_ELEMENTO = {"id", "tipo", "nombre", "descripcion"}
_CAMPOS_DEPENDENCIA = {"origen", "destino"}


def _rechazar_campos_desconocidos(datos: Mapping[str, object], permitidos: set[str]) -> None:
    """Rechaza campos no reconocidos (ERR-06) antes de cualquier otra regla."""
    desconocidos = sorted(set(datos) - permitidos)
    if desconocidos:
        raise CampoNoPermitido(
            "La petición incluye campos no admitidos.",
            [DetalleError(campo, "Campo no reconocido en el recurso.") for campo in desconocidos],
        )


class CrearElemento:
    """RF-F1-01/02/03/11: registra un elemento válido con id único."""

    def __init__(self, repositorio: RepositorioCatalogo) -> None:
        self._repositorio = repositorio

    def ejecutar(self, datos: Mapping[str, object]) -> Elemento:
        _rechazar_campos_desconocidos(datos, _CAMPOS_ELEMENTO)
        elemento = Elemento.crear(
            id_valor=datos.get("id"),
            tipo=datos.get("tipo"),
            nombre=datos.get("nombre"),
            descripcion=datos.get("descripcion"),
        )
        catalogo = self._repositorio.obtener()
        catalogo.registrar_elemento(elemento)
        self._repositorio.guardar(catalogo)
        return elemento


class ListarElementos:
    """RF-F1-04/13: lista elementos con filtro opcional por tipo."""

    def __init__(self, repositorio: RepositorioCatalogo) -> None:
        self._repositorio = repositorio

    def ejecutar(self, tipo_valor: object | None = None) -> list[Elemento]:
        tipo = None if tipo_valor is None else normalizar_tipo(tipo_valor)
        return self._repositorio.obtener().listar_elementos(tipo=tipo)


class ObtenerElemento:
    """RF-F1-05: consulta un elemento por id, distinguiendo formato de existencia."""

    def __init__(self, repositorio: RepositorioCatalogo) -> None:
        self._repositorio = repositorio

    def ejecutar(self, identificador: object) -> Elemento:
        id_normalizado = validar_identificador_consulta(identificador, "id")
        return self._repositorio.obtener().obtener_elemento(id_normalizado)


class RegistrarDependencia:
    """RF-F1-06/07/08/11: registra una arista entre elementos existentes."""

    def __init__(self, repositorio: RepositorioCatalogo) -> None:
        self._repositorio = repositorio

    def ejecutar(self, datos: Mapping[str, object]) -> Dependencia:
        _rechazar_campos_desconocidos(datos, _CAMPOS_DEPENDENCIA)
        origen = normalizar_identificador(datos.get("origen"), campo="origen")
        destino = normalizar_identificador(datos.get("destino"), campo="destino")
        catalogo = self._repositorio.obtener()
        dependencia = catalogo.registrar_dependencia(origen, destino)
        self._repositorio.guardar(catalogo)
        return dependencia


class ListarDependencias:
    """RF-F1-09/13: lista dependencias con filtros opcionales por extremo."""

    def __init__(self, repositorio: RepositorioCatalogo) -> None:
        self._repositorio = repositorio

    def ejecutar(
        self, origen: object | None = None, destino: object | None = None
    ) -> list[Dependencia]:
        origen_normalizado = (
            None if origen is None else validar_identificador_consulta(origen, "origen")
        )
        destino_normalizado = (
            None if destino is None else validar_identificador_consulta(destino, "destino")
        )
        return self._repositorio.obtener().listar_dependencias(
            origen=origen_normalizado, destino=destino_normalizado
        )


class ObtenerGrafo:
    """RF-F1-10/15: expone la representación del grafo tal como está."""

    def __init__(self, repositorio: RepositorioCatalogo) -> None:
        self._repositorio = repositorio

    def ejecutar(self) -> Catalogo:
        return self._repositorio.obtener()
