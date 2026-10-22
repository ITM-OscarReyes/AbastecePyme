"""Punto de entrada del backend.

Arranque: ``uvicorn app.main:app --reload`` desde la carpeta ``backend``.
Inicializa el catálogo con el conjunto sintético de demostración de F1;
los consumidores que necesiten un catálogo vacío pueden construir su propia
aplicación con ``crear_aplicacion()``.
"""

from app.api.aplicacion import crear_aplicacion
from app.dominio.catalogo import Catalogo
from app.infraestructura.datos_demostracion import poblar_catalogo_demostracion


def _construir_aplicacion():
    catalogo = poblar_catalogo_demostracion(Catalogo())
    return crear_aplicacion(catalogo)


app = _construir_aplicacion()
