"""Conjunto sintético de demostración de F1.

Coherente con ``docs/graph-model.md`` sección 4: proveedores, insumos,
productos y procesos, sin datos de personas ni de empresas reales. Se carga
por el mismo camino que la API (registro de elementos y dependencias), de modo
que pasa por las mismas validaciones de F1 (RNF-F1-07).
"""

from app.dominio.catalogo import Catalogo
from app.dominio.elemento import Elemento

_ELEMENTOS: tuple[tuple[str, str, str], ...] = (
    ("PROV-ACERO", "PROVEEDOR", "Proveedor de acero"),
    ("INS-BARRA", "INSUMO", "Barra de acero"),
    ("INS-TORNILLO", "INSUMO", "Tornillo hexagonal M6"),
    ("PROC-CORTE", "PROCESO", "Corte de panel"),
    ("PROD-PANEL", "PRODUCTO", "Panel de montaje"),
    ("PROD-BANCO", "PRODUCTO", "Banco de montaje"),
)

_DEPENDENCIAS: tuple[tuple[str, str], ...] = (
    ("PROV-ACERO", "INS-BARRA"),
    ("INS-BARRA", "PROC-CORTE"),
    ("PROC-CORTE", "PROD-PANEL"),
    ("INS-TORNILLO", "PROD-PANEL"),
    ("PROD-PANEL", "PROD-BANCO"),
    ("INS-TORNILLO", "PROD-BANCO"),
)


def poblar_catalogo_demostracion(catalogo: Catalogo) -> Catalogo:
    """Registra el conjunto sintético de demostración en ``catalogo``."""
    for id_valor, tipo, nombre in _ELEMENTOS:
        catalogo.registrar_elemento(Elemento.crear(id_valor, tipo, nombre))
    for origen, destino in _DEPENDENCIAS:
        catalogo.registrar_dependencia(origen, destino)
    return catalogo
