"""Conjunto sintético de demostración.

Coherente con ``docs/graph-model.md``: proveedores, suministros, procesos y
productos, sin datos de personas ni de empresas reales. Se carga por el mismo
camino que la API (registro de elementos y dependencias), de modo que pasa por
las mismas validaciones de negocio.

El suministro ``INS-TORNILLO`` y el barniz ``INS-BARNIZ`` quedan por debajo de
su mínimo aceptable para que la demostración incluya alertas de stock reales.
"""

from app.dominio.catalogo import Catalogo
from app.dominio.elemento import Elemento

_ELEMENTOS: tuple[tuple[str, str, str, int | None, int | None], ...] = (
    ("PROV-ACERO", "PROVEEDOR", "Proveedor de acero", None, None),
    ("INS-BARRA", "INSUMO", "Barra de acero", 120, 50),
    ("INS-TORNILLO", "INSUMO", "Tornillo hexagonal M6", 30, 100),
    ("PROC-CORTE", "PROCESO", "Corte de panel", None, None),
    ("PROD-PANEL", "PRODUCTO", "Panel de montaje", None, None),
    ("PROD-BANCO", "PRODUCTO", "Banco de montaje", None, None),
    ("PROV-MADERA", "PROVEEDOR", "Proveedor de madera", None, None),
    ("INS-TABLERO", "INSUMO", "Tablero de madera", 80, 40),
    ("INS-BARNIZ", "INSUMO", "Barniz protector", 12, 15),
    ("PROC-ENSAMBLE", "PROCESO", "Ensamble de escritorio", None, None),
    ("PROD-ESCRITORIO", "PRODUCTO", "Escritorio de oficina", None, None),
)

_DEPENDENCIAS: tuple[tuple[str, str], ...] = (
    ("PROV-ACERO", "INS-BARRA"),
    ("PROV-ACERO", "INS-TORNILLO"),
    ("INS-BARRA", "PROC-CORTE"),
    ("INS-TORNILLO", "PROC-CORTE"),
    ("PROC-CORTE", "PROD-PANEL"),
    ("PROC-CORTE", "PROD-BANCO"),
    ("PROV-MADERA", "INS-TABLERO"),
    ("PROV-MADERA", "INS-BARNIZ"),
    ("INS-TABLERO", "PROC-ENSAMBLE"),
    ("INS-BARNIZ", "PROC-ENSAMBLE"),
    ("PROC-ENSAMBLE", "PROD-ESCRITORIO"),
)


def poblar_catalogo_demostracion(catalogo: Catalogo) -> Catalogo:
    """Registra el conjunto sintético de demostración en ``catalogo``."""
    for id_valor, tipo, nombre, stock_disponible, stock_minimo in _ELEMENTOS:
        catalogo.registrar_elemento(
            Elemento.crear(
                id_valor,
                tipo,
                nombre,
                stock_disponible=stock_disponible,
                stock_minimo=stock_minimo,
            )
        )
    for origen, destino in _DEPENDENCIAS:
        catalogo.registrar_dependencia(origen, destino)
    return catalogo
