"""Fábrica de la aplicación FastAPI de AbastecePyme (F1)."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.errores_http import registrar_manejadores_error
from app.api.rutas import crear_enrutador
from app.dominio.catalogo import Catalogo
from app.infraestructura.repositorio_memoria import RepositorioCatalogoMemoria


def crear_aplicacion(catalogo: Catalogo | None = None) -> FastAPI:
    """Crea la aplicación con su catálogo y dependencias inyectadas."""
    aplicacion = FastAPI(
        title="AbastecePyme API",
        version="1.0.0",
        description="API REST de F1 — Catálogo de dependencias.",
    )
    aplicacion.state.repositorio_catalogo = RepositorioCatalogoMemoria(catalogo)
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
