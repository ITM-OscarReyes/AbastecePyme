"""Rutas HTTP del catálogo, las relaciones y el análisis de impacto.

La capa de presentación solo interpreta la petición y traduce la salida del
caso de uso a su esquema de respuesta; las reglas de negocio están en el
dominio y los casos de uso.
"""

from fastapi import APIRouter, Request, Response, status

from app.api.esquemas import (
    CicloDetectadoRespuesta,
    DependenciaRespuesta,
    ElementoImpactoRespuesta,
    ElementoRespuesta,
    EntradaActualizarElemento,
    EntradaDependencia,
    EntradaElemento,
    GrafoRespuesta,
    ImpactoRespuesta,
    ListaDependenciasRespuesta,
    ListaElementosRespuesta,
    OrdenProduccionRespuesta,
    PasoProduccionRespuesta,
    PlanEntregaRespuesta,
    ProductoEntregaRespuesta,
    ReglaDependenciaRespuesta,
    ReglasDependenciaRespuesta,
    ResumenGrafo,
    ResumenStockImpacto,
)
from app.aplicacion.casos_de_uso import (
    ActualizarDependencia,
    ActualizarElemento,
    ConsultarImpacto,
    CrearElemento,
    EliminarDependencia,
    EliminarElemento,
    ListarDependencias,
    ListarElementos,
    ObtenerElemento,
    ObtenerGrafo,
    ObtenerOrdenProduccion,
    ObtenerPlanEntrega,
    ObtenerReglasDependencia,
    RegistrarDependencia,
)
from app.dominio.dependencia import Dependencia
from app.dominio.elemento import Elemento
from app.dominio.errores import PeticionMalFormada
from app.dominio.tipo_elemento import TipoElemento


def _verificar_content_type_json(peticion: Request) -> None:
    """Exige ``Content-Type: application/json`` en cuerpos de petición."""
    tipo = peticion.headers.get("content-type", "")
    if not tipo.lower().startswith("application/json"):
        raise PeticionMalFormada("El Content-Type de la petición debe ser application/json.")


def _elemento_a_respuesta(elemento: Elemento) -> ElementoRespuesta:
    return ElementoRespuesta(
        id=elemento.id,
        tipo=elemento.tipo.value,
        nombre=elemento.nombre,
        descripcion=elemento.descripcion,
        stock_disponible=elemento.stock_disponible,
        stock_minimo=elemento.stock_minimo,
        estado_stock=elemento.estado_stock,
        alerta_stock=elemento.alerta_stock,
    )


def _dependencia_a_respuesta(dependencia: Dependencia) -> DependenciaRespuesta:
    return DependenciaRespuesta(
        origen=dependencia.origen,
        destino=dependencia.destino,
        tipo_relacion=dependencia.tipo_relacion,
    )


def _elemento_a_impacto_respuesta(elemento: Elemento) -> ElementoImpactoRespuesta:
    return ElementoImpactoRespuesta(
        id=elemento.id,
        tipo=elemento.tipo.value,
        nombre=elemento.nombre,
        descripcion=elemento.descripcion,
        stock_disponible=elemento.stock_disponible,
        stock_minimo=elemento.stock_minimo,
        estado_stock=elemento.estado_stock,
        alerta_stock=elemento.alerta_stock,
    )


def _resumen_stock(elemento: Elemento, afectados: list[Elemento]) -> ResumenStockImpacto:
    involucrados = [
        candidato
        for candidato in [elemento, *afectados]
        if candidato.tipo is TipoElemento.INSUMO
    ]
    return ResumenStockImpacto(
        total_suministros=len(involucrados),
        suministros_bajo_minimo=sum(1 for suministro in involucrados if suministro.alerta_stock),
    )


def crear_enrutador() -> APIRouter:
    """Construye el enrutador con los casos de uso inyectados."""
    enrutador = APIRouter(prefix="/api/v1")

    def obtener_repositorio(peticion: Request):
        return peticion.app.state.repositorio_catalogo

    @enrutador.post(
        "/elementos",
        response_model=ElementoRespuesta,
        status_code=status.HTTP_201_CREATED,
    )
    def crear_elemento(
        entrada: EntradaElemento,
        respuesta: Response,
        peticion: Request,
    ) -> ElementoRespuesta:
        """Alta de un elemento del catálogo (201 + cabecera Location)."""
        _verificar_content_type_json(peticion)
        caso_de_uso = CrearElemento(obtener_repositorio(peticion))
        elemento = caso_de_uso.ejecutar(entrada.como_diccionario())
        respuesta.headers["Location"] = f"/api/v1/elementos/{elemento.id}"
        return _elemento_a_respuesta(elemento)

    @enrutador.get("/elementos", response_model=ListaElementosRespuesta)
    def listar_elementos(
        peticion: Request, tipo: str | None = None
    ) -> ListaElementosRespuesta:
        """Listado determinista de elementos, con filtro opcional por tipo."""
        caso_de_uso = ListarElementos(obtener_repositorio(peticion))
        elementos = caso_de_uso.ejecutar(tipo_valor=tipo)
        return ListaElementosRespuesta(
            elementos=[_elemento_a_respuesta(elemento) for elemento in elementos],
            total=len(elementos),
        )

    @enrutador.get("/elementos/{id}", response_model=ElementoRespuesta)
    def obtener_elemento(id: str, peticion: Request) -> ElementoRespuesta:
        """Consulta un elemento por id; formato inválido y no existente se distinguen."""
        caso_de_uso = ObtenerElemento(obtener_repositorio(peticion))
        return _elemento_a_respuesta(caso_de_uso.ejecutar(id))

    @enrutador.put("/elementos/{id}", response_model=ElementoRespuesta)
    def actualizar_elemento(
        id: str,
        entrada: EntradaActualizarElemento,
        peticion: Request,
    ) -> ElementoRespuesta:
        """Actualiza nombre, descripción e inventario; id y tipo no cambian."""
        _verificar_content_type_json(peticion)
        caso_de_uso = ActualizarElemento(obtener_repositorio(peticion))
        elemento = caso_de_uso.ejecutar(id, entrada.como_diccionario())
        return _elemento_a_respuesta(elemento)

    @enrutador.delete("/elementos/{id}", status_code=status.HTTP_204_NO_CONTENT)
    def eliminar_elemento(
        id: str, peticion: Request, eliminar_cadena: bool = False
    ) -> Response:
        """Elimina el elemento y sus relaciones, sin dejar aristas colgantes.

        Si la ausencia del elemento dejaría una cadena incompleta responde 409.
        Con ``eliminarCadena=true`` elimina también la cadena dependiente.
        """
        caso_de_uso = EliminarElemento(obtener_repositorio(peticion))
        caso_de_uso.ejecutar(id, eliminar_cadena=eliminar_cadena)
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    @enrutador.post(
        "/dependencias",
        response_model=DependenciaRespuesta,
        status_code=status.HTTP_201_CREATED,
    )
    def registrar_dependencia(
        entrada: EntradaDependencia,
        respuesta: Response,
        peticion: Request,
    ) -> DependenciaRespuesta:
        """Registra una arista dirigida ``origen habilita destino``."""
        _verificar_content_type_json(peticion)
        caso_de_uso = RegistrarDependencia(obtener_repositorio(peticion))
        dependencia = caso_de_uso.ejecutar(entrada.como_diccionario())
        respuesta.headers["Location"] = (
            f"/api/v1/dependencias/{dependencia.origen}/{dependencia.destino}"
        )
        return _dependencia_a_respuesta(dependencia)

    @enrutador.get("/dependencias", response_model=ListaDependenciasRespuesta)
    def listar_dependencias(
        peticion: Request,
        origen: str | None = None,
        destino: str | None = None,
    ) -> ListaDependenciasRespuesta:
        """Listado de dependencias con filtros opcionales por extremo."""
        caso_de_uso = ListarDependencias(obtener_repositorio(peticion))
        dependencias = caso_de_uso.ejecutar(origen=origen, destino=destino)
        return ListaDependenciasRespuesta(
            dependencias=[_dependencia_a_respuesta(dep) for dep in dependencias],
            total=len(dependencias),
        )

    @enrutador.put(
        "/dependencias/{origen}/{destino}",
        response_model=DependenciaRespuesta,
    )
    def actualizar_dependencia(
        origen: str,
        destino: str,
        entrada: EntradaDependencia,
        peticion: Request,
    ) -> DependenciaRespuesta:
        """Cambia los extremos de una relación existente."""
        _verificar_content_type_json(peticion)
        caso_de_uso = ActualizarDependencia(obtener_repositorio(peticion))
        dependencia = caso_de_uso.ejecutar(origen, destino, entrada.como_diccionario())
        return _dependencia_a_respuesta(dependencia)

    @enrutador.delete(
        "/dependencias/{origen}/{destino}",
        status_code=status.HTTP_204_NO_CONTENT,
    )
    def eliminar_dependencia(
        origen: str, destino: str, peticion: Request
    ) -> Response:
        """Elimina una relación existente."""
        caso_de_uso = EliminarDependencia(obtener_repositorio(peticion))
        caso_de_uso.ejecutar(origen, destino)
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    @enrutador.get("/grafo", response_model=GrafoRespuesta)
    def obtener_grafo(peticion: Request) -> GrafoRespuesta:
        """Devuelve la representación del grafo tal como está en el catálogo."""
        catalogo = ObtenerGrafo(obtener_repositorio(peticion)).ejecutar()
        elementos = catalogo.listar_elementos()
        dependencias = catalogo.listar_dependencias()
        return GrafoRespuesta(
            elementos=[_elemento_a_respuesta(elemento) for elemento in elementos],
            dependencias=[_dependencia_a_respuesta(dep) for dep in dependencias],
            resumen=ResumenGrafo(
                total_elementos=len(elementos),
                total_dependencias=len(dependencias),
            ),
        )

    @enrutador.get(
        "/reglas-dependencia",
        response_model=ReglasDependenciaRespuesta,
    )
    def obtener_reglas_dependencia() -> ReglasDependenciaRespuesta:
        """Expone las combinaciones de tipos permitidas antes de crear relaciones."""
        tipos, reglas = ObtenerReglasDependencia().ejecutar()
        return ReglasDependenciaRespuesta(
            tipos=tipos,
            reglas=[
                ReglaDependenciaRespuesta(
                    tipo_origen=regla.tipo_origen.value,
                    tipo_destino=regla.tipo_destino.value,
                    permitida=regla.permitida,
                    motivo=regla.motivo,
                )
                for regla in reglas
            ],
        )

    @enrutador.get("/impacto/{id}", response_model=ImpactoRespuesta)
    def obtener_impacto(id: str, peticion: Request) -> ImpactoRespuesta:
        """Devuelve los afectados por la indisponibilidad de ``id``.

        Recorre el grafo en sentido hacia adelante (``origen habilita destino``)
        e incluye el estado de stock de los suministros involucrados.
        """
        caso_de_uso = ConsultarImpacto(obtener_repositorio(peticion))
        elemento, afectados = caso_de_uso.ejecutar(id)
        return ImpactoRespuesta(
            elemento=_elemento_a_impacto_respuesta(elemento),
            afectados=[_elemento_a_impacto_respuesta(a) for a in afectados],
            total=len(afectados),
            resumen_stock=_resumen_stock(elemento, afectados),
        )

    @enrutador.get("/orden-produccion", response_model=OrdenProduccionRespuesta)
    def obtener_orden_produccion(peticion: Request) -> OrdenProduccionRespuesta:
        """Diagnóstico global de planta (F3).

        Evalúa la red completa como DAG. Responde siempre 200 con el diagnóstico
        estructurado: orden topológico determinista cuando es DAG, o el reporte de
        ciclos, elementos bloqueados, productos bloqueados y productos planificables.
        """
        resultado = ObtenerOrdenProduccion(obtener_repositorio(peticion)).ejecutar()
        orden_respuesta = [
            PasoProduccionRespuesta(
                paso=indice + 1,
                id=elemento.id,
                tipo=elemento.tipo.value,
                nombre=elemento.nombre,
                descripcion=elemento.descripcion,
            )
            for indice, elemento in enumerate(resultado.orden)
        ]
        ciclos_respuesta = [
            CicloDetectadoRespuesta(secuencia=ciclo.secuencia)
            for ciclo in resultado.ciclos
        ]
        return OrdenProduccionRespuesta(
            es_dag=resultado.es_dag,
            orden=orden_respuesta,
            total_pasos=resultado.total_pasos,
            ciclos=ciclos_respuesta,
            elementos_bloqueados=resultado.elementos_bloqueados,
            productos_bloqueados=resultado.productos_bloqueados,
            productos_planificables=resultado.productos_planificables,
            elementos_incompletos=resultado.elementos_incompletos,
            productos_incompletos=resultado.productos_incompletos,
        )

    @enrutador.get("/plan-entrega", response_model=PlanEntregaRespuesta)
    def obtener_plan_entrega(
        productos: str | None = None, peticion: Request = None
    ) -> PlanEntregaRespuesta:
        """Plan de preparación por producto (F3).

        Devuelve el orden de preparación de la unión de requisitos de los
        productos solicitados. Si hay ciclos en sus requisitos, reporta su
        estado BLOQUEADO y los ciclos detectados.
        """
        caso_de_uso = ObtenerPlanEntrega(obtener_repositorio(peticion))
        resultado = caso_de_uso.ejecutar(productos)
        productos_respuesta = [
            ProductoEntregaRespuesta(
                id=prod.id,
                tipo=prod.tipo,
                nombre=prod.nombre,
                descripcion=prod.descripcion,
                estado=prod.estado,
            )
            for prod in resultado.productos
        ]
        pasos_respuesta = [
            PasoProduccionRespuesta(
                paso=indice + 1,
                id=elemento.id,
                tipo=elemento.tipo.value,
                nombre=elemento.nombre,
                descripcion=elemento.descripcion,
            )
            for indice, elemento in enumerate(resultado.pasos)
        ]
        ciclos_respuesta = [
            CicloDetectadoRespuesta(secuencia=ciclo.secuencia)
            for ciclo in resultado.ciclos
        ]
        return PlanEntregaRespuesta(
            productos=productos_respuesta,
            es_planificable=resultado.es_planificable,
            pasos=pasos_respuesta,
            total_pasos=resultado.total_pasos,
            ciclos=ciclos_respuesta,
            elementos_bloqueados=resultado.elementos_bloqueados,
            elementos_incompletos=resultado.elementos_incompletos,
            productos_incompletos=resultado.productos_incompletos,
        )

    return enrutador
