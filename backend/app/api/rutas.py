"""Rutas HTTP de F1.

La capa de presentación solo interpreta la petición y traduce la salida del
caso de uso a su esquema de respuesta; las reglas de negocio están en el
dominio y los casos de uso (RNF-Q-01, RNF-Q-02).
"""

from fastapi import APIRouter, Request, Response, status

from app.api.esquemas import (
    DependenciaRespuesta,
    ElementoRespuesta,
    EntradaDependencia,
    EntradaElemento,
    GrafoRespuesta,
    ListaDependenciasRespuesta,
    ListaElementosRespuesta,
    ResumenGrafo,
)
from app.aplicacion.casos_de_uso import (
    CrearElemento,
    ListarDependencias,
    ListarElementos,
    ObtenerElemento,
    ObtenerGrafo,
    RegistrarDependencia,
)
from app.dominio.dependencia import Dependencia
from app.dominio.elemento import Elemento
from app.dominio.errores import PeticionMalFormada


def _verificar_content_type_json(peticion: Request) -> None:
    """Exige ``Content-Type: application/json`` en cuerpos de petición (ERR-03)."""
    tipo = peticion.headers.get("content-type", "")
    if not tipo.lower().startswith("application/json"):
        raise PeticionMalFormada("El Content-Type de la petición debe ser application/json.")


def _elemento_a_respuesta(elemento: Elemento) -> ElementoRespuesta:
    return ElementoRespuesta(
        id=elemento.id,
        tipo=elemento.tipo.value,
        nombre=elemento.nombre,
        descripcion=elemento.descripcion,
    )


def _dependencia_a_respuesta(dependencia: Dependencia) -> DependenciaRespuesta:
    return DependenciaRespuesta(
        origen=dependencia.origen,
        destino=dependencia.destino,
        tipo_relacion=dependencia.tipo_relacion,
    )


def crear_enrutador() -> APIRouter:
    """Construye el enrutador de F1 con los casos de uso inyectados."""
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

    return enrutador
