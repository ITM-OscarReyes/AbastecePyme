"""Fábrica de la aplicación FastAPI de AbastecePyme (F1)."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.errores_http import registrar_manejadores_error
from app.api.rutas import crear_enrutador
from app.dominio.catalogo import Catalogo
from app.infraestructura.almacen_sesiones import RepositorioSesionMemoria
from app.infraestructura.repositorio_memoria import RepositorioCatalogoMemoria


def crear_aplicacion(catalogo: Catalogo | None = None) -> FastAPI:
    """Crea la aplicación con su catálogo, su almacén de sesiones y dependencias inyectadas.

    Expone la API REST de F1, F2, F3 y F4: catálogo de dependencias, análisis de
    impacto, orden de producción y el tablero demostrable con perfiles, sesión y
    autorización de escrituras.
    """
    aplicacion = FastAPI(
        title="AbastecePyme API",
        version="1.0.0",
        description="API REST de F1, F2, F3 y F4 — Catálogo de dependencias, análisis de impacto, orden de producción y tablero demostrable.",
    )
    aplicacion.state.repositorio_catalogo = RepositorioCatalogoMemoria(catalogo)
    aplicacion.state.repositorio_sesion = RepositorioSesionMemoria()
    aplicacion.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    aplicacion.include_router(crear_enrutador())
    registrar_manejadores_error(aplicacion)
    return aplicacion
