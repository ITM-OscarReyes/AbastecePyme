"""Aplicación de prueba con el catálogo vacío para verificar AC-F1-13 por HTTP.

No forma parte de la aplicación de producción: solo sirve para levantar un
servidor con ``V = ∅`` y comprobar por HTTP real que el catálogo vacío
responde con colecciones vacías y totales en cero, y no con errores.

    uvicorn tests.servidor_vacio:app --port 8001
"""

from app.api.aplicacion import crear_aplicacion
from app.dominio.catalogo import Catalogo

app = crear_aplicacion(Catalogo())
