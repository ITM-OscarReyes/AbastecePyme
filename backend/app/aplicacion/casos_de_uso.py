"""Casos de uso del catálogo, las relaciones, el impacto y la sesión de F4.

Cada caso de uso expresa una operación en términos del dominio: valida a
través de las reglas del dominio, delega en el agregado ``Catalogo`` y no
contiene decisiones de transporte ni de persistencia. Los casos de uso de F4
(sessiones y autorización de escrituras) se añaden sin modificar los de F1,
F2 ni F3.
"""

import uuid
from collections.abc import Mapping

from app.aplicacion.perfiles import (
    PERFILES_DISPONIBLES,
    Perfil,
    existe_perfil,
    perfil_por_id,
)
from app.aplicacion.puertos import RepositorioCatalogo, RepositorioSesion
from app.dominio.catalogo import Catalogo, ResultadoOrdenProduccion, ResultadoPlanEntrega
from app.dominio.dependencia import Dependencia
from app.dominio.elemento import Elemento
from app.dominio.errores import (
    CampoNoPermitido,
    ConfiguracionCiclica,
    DetalleError,
    ElementoNoEncontrado,
    IdentificadorInvalido,
    PermisoDenegado,
    SesionRequerida,
    ValidacionFallida,
)
from app.dominio.reglas_dependencia import ReglaDependencia, reglas_por_tipo
from app.dominio.sesion import Sesion
from app.dominio.tipo_elemento import TipoElemento
from app.dominio.validacion import (
    es_identificador_valido,
    normalizar_identificador,
    normalizar_tipo,
    validar_identificador_consulta,
)

_CAMPOS_ELEMENTO = {
    "id",
    "tipo",
    "nombre",
    "descripcion",
    "stock_disponible",
    "stock_minimo",
}
_CAMPOS_ACTUALIZAR_ELEMENTO = {
    "nombre",
    "descripcion",
    "stock_disponible",
    "stock_minimo",
}
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
    """Registra un elemento válido con id único y, si es suministro, inventario."""

    def __init__(self, repositorio: RepositorioCatalogo) -> None:
        self._repositorio = repositorio

    def ejecutar(self, datos: Mapping[str, object]) -> Elemento:
        _rechazar_campos_desconocidos(datos, _CAMPOS_ELEMENTO)
        elemento = Elemento.crear(
            id_valor=datos.get("id"),
            tipo=datos.get("tipo"),
            nombre=datos.get("nombre"),
            descripcion=datos.get("descripcion"),
            stock_disponible=datos.get("stock_disponible"),
            stock_minimo=datos.get("stock_minimo"),
        )
        catalogo = self._repositorio.obtener()
        catalogo.registrar_elemento(elemento)
        self._repositorio.guardar(catalogo)
        return elemento


class ActualizarElemento:
    """Actualiza nombre, descripción e inventario de un elemento existente."""

    def __init__(self, repositorio: RepositorioCatalogo) -> None:
        self._repositorio = repositorio

    def ejecutar(self, identificador: object, datos: Mapping[str, object]) -> Elemento:
        _rechazar_campos_desconocidos(datos, _CAMPOS_ACTUALIZAR_ELEMENTO)
        id_normalizado = validar_identificador_consulta(identificador, "id")
        catalogo = self._repositorio.obtener()
        elemento = catalogo.obtener_elemento(id_normalizado)
        actualizado = elemento.actualizar(
            nombre=datos.get("nombre"),
            descripcion=datos.get("descripcion"),
            stock_disponible=datos.get("stock_disponible"),
            stock_minimo=datos.get("stock_minimo"),
            nombre_presente="nombre" in datos,
            descripcion_presente="descripcion" in datos,
            stock_disponible_presente="stock_disponible" in datos,
            stock_minimo_presente="stock_minimo" in datos,
        )
        catalogo.reemplazar_elemento(actualizado)
        self._repositorio.guardar(catalogo)
        return actualizado


class EliminarElemento:
    """Elimina un elemento y, en cascada, sus relaciones.

    Por defecto la operación se rechaza si dejaría una cadena incompleta. Con
    ``eliminar_cadena=True`` se elimina también la cadena que depende del
    elemento.
    """

    def __init__(self, repositorio: RepositorioCatalogo) -> None:
        self._repositorio = repositorio

    def ejecutar(
        self, identificador: object, eliminar_cadena: bool = False
    ) -> Elemento:
        id_normalizado = validar_identificador_consulta(identificador, "id")
        catalogo = self._repositorio.obtener()
        elemento = catalogo.eliminar_elemento(
            id_normalizado, eliminar_cadena=eliminar_cadena
        )
        self._repositorio.guardar(catalogo)
        return elemento


class ListarElementos:
    """Lista elementos con filtro opcional por tipo."""

    def __init__(self, repositorio: RepositorioCatalogo) -> None:
        self._repositorio = repositorio

    def ejecutar(self, tipo_valor: object | None = None) -> list[Elemento]:
        tipo = None if tipo_valor is None else normalizar_tipo(tipo_valor)
        return self._repositorio.obtener().listar_elementos(tipo=tipo)


class ObtenerElemento:
    """Consulta un elemento por id, distinguiendo formato de existencia."""

    def __init__(self, repositorio: RepositorioCatalogo) -> None:
        self._repositorio = repositorio

    def ejecutar(self, identificador: object) -> Elemento:
        id_normalizado = validar_identificador_consulta(identificador, "id")
        return self._repositorio.obtener().obtener_elemento(id_normalizado)


class RegistrarDependencia:
    """Registra una arista entre elementos existentes y tipos compatibles."""

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


class ActualizarDependencia:
    """Cambia los extremos de una dependencia existente."""

    def __init__(self, repositorio: RepositorioCatalogo) -> None:
        self._repositorio = repositorio

    def ejecutar(
        self,
        origen_actual: object,
        destino_actual: object,
        datos: Mapping[str, object],
    ) -> Dependencia:
        _rechazar_campos_desconocidos(datos, _CAMPOS_DEPENDENCIA)
        origen_viejo = validar_identificador_consulta(origen_actual, "origen")
        destino_viejo = validar_identificador_consulta(destino_actual, "destino")
        origen_nuevo = normalizar_identificador(datos.get("origen"), campo="origen")
        destino_nuevo = normalizar_identificador(datos.get("destino"), campo="destino")
        catalogo = self._repositorio.obtener()
        dependencia = catalogo.actualizar_dependencia(
            origen_viejo, destino_viejo, origen_nuevo, destino_nuevo
        )
        self._repositorio.guardar(catalogo)
        return dependencia


class EliminarDependencia:
    """Elimina una relación existente."""

    def __init__(self, repositorio: RepositorioCatalogo) -> None:
        self._repositorio = repositorio

    def ejecutar(self, origen: object, destino: object) -> Dependencia:
        origen_normalizado = validar_identificador_consulta(origen, "origen")
        destino_normalizado = validar_identificador_consulta(destino, "destino")
        catalogo = self._repositorio.obtener()
        dependencia = catalogo.eliminar_dependencia(
            origen_normalizado, destino_normalizado
        )
        self._repositorio.guardar(catalogo)
        return dependencia


class ListarDependencias:
    """Lista dependencias con filtros opcionales por extremo."""

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
    """Expone la representación del grafo tal como está."""

    def __init__(self, repositorio: RepositorioCatalogo) -> None:
        self._repositorio = repositorio

    def ejecutar(self) -> Catalogo:
        return self._repositorio.obtener()


class ObtenerReglasDependencia:
    """Expone las combinaciones de tipos permitidas y su explicación."""

    def ejecutar(self) -> tuple[list[str], list[ReglaDependencia]]:
        return TipoElemento.valores_admitidos(), reglas_por_tipo()


class ConsultarImpacto:
    """Consulta el impacto de un elemento con el recorrido propio del dominio."""

    def __init__(self, repositorio: RepositorioCatalogo) -> None:
        self._repositorio = repositorio

    def ejecutar(self, identificador: object) -> tuple[Elemento, list[Elemento]]:
        id_normalizado = validar_identificador_consulta(identificador, "id")
        catalogo = self._repositorio.obtener()
        elemento = catalogo.obtener_elemento(id_normalizado)
        afectados = catalogo.obtener_impacto(id_normalizado)
        return elemento, afectados


class ObtenerOrdenProduccion:
    """Diagnóstico global de planta (F3).

    Orquesta la consulta al agregado ``Catalogo`` y devuelve el
    ``ResultadoOrdenProduccion`` con es_dag, orden, total_pasos, ciclos,
    elementos_bloqueados, productos_bloqueados y productos_planificables.
    Siempre devuelve 200 con el resultado estructurado.
    """

    def __init__(self, repositorio: RepositorioCatalogo) -> None:
        self._repositorio = repositorio

    def ejecutar(self) -> ResultadoOrdenProduccion:
        catalogo = self._repositorio.obtener()
        return catalogo.orden_produccion()


class ObtenerPlanEntrega:
    """Calcula el plan de entrega por producto (F3).

    Valida la lista de productos:
    - Obligatoria y no vacía (ERR-04 si falta o vacía).
    - Formato de identificador válido (ERR-05 si no cumple).
    - Elementos existentes (ERR-02 si no existen).
    - Elementos de tipo PRODUCTO (ERR-04 si no son PRODUCTO).
    """

    def __init__(self, repositorio: RepositorioCatalogo) -> None:
        self._repositorio = repositorio

    def ejecutar(self, productos_param: object) -> ResultadoPlanEntrega:
        if not productos_param or not isinstance(productos_param, str) or not productos_param.strip():
            raise ValidacionFallida(
                "La lista de productos es obligatoria y no puede estar vacía.",
                [DetalleError("productos", "Debe proporcionar al menos un identificador de producto.")],
            )

        items_crudos = [item.strip() for item in productos_param.split(",") if item.strip()]
        if not items_crudos:
            raise ValidacionFallida(
                "La lista de productos es obligatoria y no puede estar vacía.",
                [DetalleError("productos", "Debe proporcionar al menos un identificador de producto.")],
            )

        # Validar formato de cada identificador (ERR-05)
        for item in items_crudos:
            validar_identificador_consulta(item, "productos")

        # Normalizar y deduplicar en orden alfabético
        productos_normalizados = sorted(set(item.strip().upper() for item in items_crudos))

        catalogo = self._repositorio.obtener()

        # Validar existencia de todos los elementos (ERR-02)
        for pid in productos_normalizados:
            if not catalogo.existe_elemento(pid):
                raise ElementoNoEncontrado(
                    f"No existe un elemento con el identificador {pid}.",
                    [DetalleError("productos", f"El elemento '{pid}' no existe en el catálogo.")],
                )

        # Validar que todos los elementos sean de tipo PRODUCTO (ERR-04)
        for pid in productos_normalizados:
            elemento = catalogo.obtener_elemento(pid)
            if elemento.tipo is not TipoElemento.PRODUCTO:
                raise ValidacionFallida(
                    f"El elemento '{pid}' no es de tipo PRODUCTO.",
                    [DetalleError("productos", f"El elemento '{pid}' tiene tipo {elemento.tipo.value}, se requiere PRODUCTO.")],
                )

        return catalogo.plan_entrega(productos_normalizados)


class ListarPerfiles:
    """Devuelve los perfiles de demostración disponibles con su capacidad de escritura.

    Se usa desde F4 para mostrar el selector de perfiles y para que la
    interfaz conozca qué acciones de escritura están permitidas.
    """

    def ejecutar(self) -> list[Perfil]:
        """Devuelve los perfiles en orden estable (COMPRAS, PRODUCCION)."""
        return list(PERFILES_DISPONIBLES)


class AbrirSesion:
    """Crea una sesión de demostración para un perfil válido.

    No usa credenciales: recibe el identificador de perfil, genera un token
    opaco, almacena la sesión en memoria y la devuelve. La sesión se pierde
    al reiniciar el backend (ver ``RN-F4-03``).
    """

    def __init__(self, repositorio_sesion: RepositorioSesion) -> None:
        self._repositorio_sesion = repositorio_sesion

    def ejecutar(self, perfil_id: object) -> Sesion:
        """Valida el perfil, crea la sesión y la almacena en memoria."""
        if not isinstance(perfil_id, str) or not existe_perfil(perfil_id):
            raise ValidacionFallida(
                "El perfil es obligatorio y debe ser COMPRAS o PRODUCCION.",
                [DetalleError("perfil", "Debe ser COMPRAS o PRODUCCION.")],
            )
        token = uuid.uuid4().hex
        sesion = Sesion(token=token, perfil_id=perfil_id)
        self._repositorio_sesion.guardar(sesion)
        return sesion


class ObtenerSesion:
    """Devuelve la sesión asociada a un token, o falla si no existe.

    Se usa para consultar el perfil activo y para validar que el token
    enviado en una escritura sigue siendo válido.
    """

    def __init__(self, repositorio_sesion: RepositorioSesion) -> None:
        self._repositorio_sesion = repositorio_sesion

    def ejecutar(self, token: object) -> Sesion:
        """Devuelve la sesión o lanza ``SesionRequerida`` si el token no es válido."""
        if not isinstance(token, str) or not token.strip():
            raise SesionRequerida(
                "Se requiere una sesión válida para realizar esta operación.",
                [DetalleError("token", "Falta el token de sesión.")],
            )
        sesion = self._repositorio_sesion.obtener(token.strip())
        if sesion is None:
            raise SesionRequerida(
                "El token de sesión no es válido o ha expirado.",
                [DetalleError("token", "Token de sesión inválido.")],
            )
        return sesion


class CerrarSesion:
    """Invalida una sesión de demostración eliminando su token del almacén."""

    def __init__(self, repositorio_sesion: RepositorioSesion) -> None:
        self._repositorio_sesion = repositorio_sesion

    def ejecutar(self, token: object) -> None:
        """Elimina la sesión asociada al ``token`` o lanza ``SesionRequerida``."""
        if not isinstance(token, str) or not token.strip():
            raise SesionRequerida(
                "Se requiere una sesión válida para cerrarla.",
                [DetalleError("token", "Falta el token de sesión.")],
            )
        sesion = self._repositorio_sesion.obtener(token.strip())
        if sesion is None:
            raise SesionRequerida(
                "El token de sesión no es válido o ya fue cerrado.",
                [DetalleError("token", "Token de sesión inválido.")],
            )
        self._repositorio_sesion.eliminar(token.strip())


class AutorizarEscritura:
    """Valida que una petición de escritura cuente con sesión de perfil COMPRAS.

    Se aplica antes de modificar el catálogo en cualquier ruta de escritura
    de F4 (crear, editar o eliminar elementos y relaciones). El orden de
    comprobación es: sesion ausente o inválida -> 401 ERR-11; sesion válida
    con perfil sin permiso -> 403 ERR-12; sesion COMPRAS -> autorizado.
    """

    def __init__(self, repositorio_sesion: RepositorioSesion) -> None:
        self._repositorio_sesion = repositorio_sesion

    def ejecutar(self, token: object) -> Sesion:
        """Devuelve la sesión si autoriza la escritura, o lanza un error de dominio."""
        sesion = ObtenerSesion(self._repositorio_sesion).ejecutar(token)
        perfil = perfil_por_id(sesion.perfil_id)
        if perfil is None or not perfil.puede_escribir:
            raise PermisoDenegado(
                "El perfil activo no tiene permiso para modificar la cadena.",
                [
                    DetalleError(
                        "perfil",
                        "Solo el perfil de compras puede crear, editar o eliminar elementos y relaciones.",
                    )
                ],
            )
        return sesion


__all__ = [
    "ActualizarDependencia",
    "ActualizarElemento",
    "AbrirSesion",
    "AutorizarEscritura",
    "CerrarSesion",
    "ConsultarImpacto",
    "CrearElemento",
    "EliminarDependencia",
    "EliminarElemento",
    "ListarDependencias",
    "ListarElementos",
    "ListarPerfiles",
    "ObtenerElemento",
    "ObtenerGrafo",
    "ObtenerOrdenProduccion",
    "ObtenerPlanEntrega",
    "ObtenerReglasDependencia",
    "ObtenerSesion",
    "RegistrarDependencia",
]
