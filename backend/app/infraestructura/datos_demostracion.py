"""Conjunto sintético de demostración.

Coherente con ``docs/graph-model.md``: proveedores, suministros, procesos y
productos, sin datos de personas ni de empresas reales. Se carga por el mismo
camino que la API (registro de elementos y dependencias), de modo que pasa por
las mismas validaciones de negocio.

La demostración cubre dos líneas de producto: el escritorio de madera con
cajones y la mesa de trabajo metálica. Los suministros ``INS-BARNIZ``,
``INS-TORNILLO`` y ``INS-CORREDERA`` quedan por debajo de su mínimo aceptable
para que la demostración incluya alertas de stock reales.

Cada elemento lleva una descripción pensada para el usuario final: el plan de
producción la muestra junto al nombre del paso.
"""

from app.dominio.catalogo import Catalogo
from app.dominio.elemento import Elemento

#: (id, tipo, nombre, descripción, stock disponible, stock mínimo)
_ELEMENTOS: tuple[tuple[str, str, str, str, int | None, int | None], ...] = (
    # Proveedores
    (
        "PROV-MADERA",
        "PROVEEDOR",
        "Proveedor de madera",
        "Suministra tableros y listones de madera para la línea de escritorios.",
        None,
        None,
    ),
    (
        "PROV-FERRETERIA",
        "PROVEEDOR",
        "Proveedor de ferretería",
        "Suministra tornillos, tuercas, arandelas, bisagras, correderas, tiradores y cola.",
        None,
        None,
    ),
    (
        "PROV-ACABADOS",
        "PROVEEDOR",
        "Proveedor de acabados",
        "Suministra lijas y barniz para el acabado de las piezas de madera.",
        None,
        None,
    ),
    (
        "PROV-ACERO",
        "PROVEEDOR",
        "Proveedor de acero",
        "Suministra paneles y tubos de acero para la mesa de trabajo.",
        None,
        None,
    ),
    # Suministros de madera
    (
        "INS-TABLERO",
        "INSUMO",
        "Tablero de madera",
        "Tablero que se corta para formar las piezas del escritorio.",
        80,
        40,
    ),
    (
        "INS-LISTON",
        "INSUMO",
        "Listón de madera",
        "Listón que se corta para reforzar las piezas del escritorio.",
        60,
        30,
    ),
    # Suministros de acabados
    (
        "INS-LIJA",
        "INSUMO",
        "Lija de grano fino",
        "Lija para alisar las piezas antes de barnizarlas.",
        40,
        25,
    ),
    (
        "INS-BARNIZ",
        "INSUMO",
        "Barniz protector",
        "Barniz que protege y da acabado a las piezas de madera.",
        12,
        15,
    ),
    # Suministros de ferretería
    (
        "INS-COLA",
        "INSUMO",
        "Cola para madera",
        "Adhesivo para unir las piezas durante el ensamble.",
        20,
        10,
    ),
    (
        "INS-TORNILLO",
        "INSUMO",
        "Tornillo hexagonal M6",
        "Tornillo de fijación para ensamblar escritorios y mesas.",
        30,
        100,
    ),
    (
        "INS-TUERCA",
        "INSUMO",
        "Tuerca M6",
        "Tuerca que asegura los tornillos del ensamble.",
        200,
        80,
    ),
    (
        "INS-ARANDELA",
        "INSUMO",
        "Arandela M6",
        "Arandela que distribuye la presión del tornillo.",
        300,
        100,
    ),
    (
        "INS-BISAGRA",
        "INSUMO",
        "Bisagra de cajón",
        "Bisagra para las puertas de los cajones del escritorio.",
        24,
        12,
    ),
    (
        "INS-CORREDERA",
        "INSUMO",
        "Corredera de cajón",
        "Corredera para el deslizamiento de los cajones.",
        18,
        20,
    ),
    (
        "INS-TIRADOR",
        "INSUMO",
        "Tirador de cajón",
        "Tirador metálico para abrir los cajones.",
        50,
        20,
    ),
    # Suministros de acero
    (
        "INS-PANEL-METAL",
        "INSUMO",
        "Panel metálico",
        "Panel de acero para la superficie de la mesa de trabajo.",
        40,
        20,
    ),
    (
        "INS-TUBO",
        "INSUMO",
        "Tubo de acero",
        "Tubo de acero para la estructura de la mesa de trabajo.",
        60,
        30,
    ),
    # Suministros intermedios generados por procesos
    (
        "INS-PIEZA-CORTADA",
        "INSUMO",
        "Pieza de madera cortada",
        "Pieza recién cortada, pendiente de lijado y barnizado.",
        50,
        20,
    ),
    (
        "INS-PIEZA-ACABADA",
        "INSUMO",
        "Pieza de madera acabada",
        "Pieza lijada y barnizada, lista para el ensamble.",
        40,
        15,
    ),
    # Procesos
    (
        "PROC-CORTE-MADERA",
        "PROCESO",
        "Corte de madera",
        "Corta tableros y listones en las piezas que forman el escritorio.",
        None,
        None,
    ),
    (
        "PROC-ACABADO",
        "PROCESO",
        "Acabado de piezas",
        "Lija y barniza las piezas cortadas para dejarlas listas.",
        None,
        None,
    ),
    (
        "PROC-ENSAMBLE-ESCRITORIO",
        "PROCESO",
        "Ensamble de escritorio",
        "Une las piezas acabadas y la ferretería para armar el escritorio con cajones.",
        None,
        None,
    ),
    (
        "PROC-ENSAMBLE-MESA",
        "PROCESO",
        "Ensamble de mesa de trabajo",
        "Une los paneles y tubos de acero con tornillos para armar la mesa de trabajo.",
        None,
        None,
    ),
    (
        "PROC-ENSAMBLE-REPISA",
        "PROCESO",
        "Ensamble de repisa flotante",
        "Une las piezas de madera acabadas con tornillos y cola para formar la repisa.",
        None,
        None,
    ),
    # Productos
    (
        "PROD-ESCRITORIO",
        "PRODUCTO",
        "Escritorio de madera con cajones",
        "Escritorio de madera con cajones para el área de trabajo.",
        None,
        None,
    ),
    (
        "PROD-REPISA",
        "PRODUCTO",
        "Repisa de madera flotante",
        "Repisa modular de madera barnizada para almacenamiento.",
        None,
        None,
    ),
    (
        "PROD-MESA-TRABAJO",
        "PRODUCTO",
        "Mesa de trabajo metálica",
        "Mesa de trabajo con estructura metálica para el taller.",
        None,
        None,
    ),
)

#: Aristas ``origen habilita destino`` en un orden que respeta las reglas de
#: asociación de suministros: primero se registran los orígenes de cada
#: suministro (proveedor o proceso) y después su enlace hacia procesos y
#: productos.
_DEPENDENCIAS: tuple[tuple[str, str], ...] = (
    # Proveedores -> suministros
    ("PROV-MADERA", "INS-TABLERO"),
    ("PROV-MADERA", "INS-LISTON"),
    ("PROV-FERRETERIA", "INS-COLA"),
    ("PROV-FERRETERIA", "INS-TORNILLO"),
    ("PROV-FERRETERIA", "INS-TUERCA"),
    ("PROV-FERRETERIA", "INS-ARANDELA"),
    ("PROV-FERRETERIA", "INS-BISAGRA"),
    ("PROV-FERRETERIA", "INS-CORREDERA"),
    ("PROV-FERRETERIA", "INS-TIRADOR"),
    ("PROV-ACABADOS", "INS-LIJA"),
    ("PROV-ACABADOS", "INS-BARNIZ"),
    ("PROV-ACERO", "INS-PANEL-METAL"),
    ("PROV-ACERO", "INS-TUBO"),
    # Procesos -> suministros intermedios (deben existir antes de asociarlos)
    ("PROC-CORTE-MADERA", "INS-PIEZA-CORTADA"),
    ("PROC-ACABADO", "INS-PIEZA-ACABADA"),
    # Suministros -> procesos
    ("INS-TABLERO", "PROC-CORTE-MADERA"),
    ("INS-LISTON", "PROC-CORTE-MADERA"),
    ("INS-PIEZA-CORTADA", "PROC-ACABADO"),
    ("INS-LIJA", "PROC-ACABADO"),
    ("INS-BARNIZ", "PROC-ACABADO"),
    ("INS-PIEZA-ACABADA", "PROC-ENSAMBLE-ESCRITORIO"),
    ("INS-COLA", "PROC-ENSAMBLE-ESCRITORIO"),
    ("INS-TORNILLO", "PROC-ENSAMBLE-ESCRITORIO"),
    ("INS-TUERCA", "PROC-ENSAMBLE-ESCRITORIO"),
    ("INS-ARANDELA", "PROC-ENSAMBLE-ESCRITORIO"),
    ("INS-BISAGRA", "PROC-ENSAMBLE-ESCRITORIO"),
    ("INS-CORREDERA", "PROC-ENSAMBLE-ESCRITORIO"),
    ("INS-TIRADOR", "PROC-ENSAMBLE-ESCRITORIO"),
    ("INS-PANEL-METAL", "PROC-ENSAMBLE-MESA"),
    ("INS-TUBO", "PROC-ENSAMBLE-MESA"),
    ("INS-TORNILLO", "PROC-ENSAMBLE-MESA"),
    # Ensamble de repisa (madera acabada + cola + tornillos)
    ("INS-PIEZA-ACABADA", "PROC-ENSAMBLE-REPISA"),
    ("INS-COLA", "PROC-ENSAMBLE-REPISA"),
    ("INS-TORNILLO", "PROC-ENSAMBLE-REPISA"),
    # Procesos -> productos
    ("PROC-ENSAMBLE-ESCRITORIO", "PROD-ESCRITORIO"),
    ("PROC-ENSAMBLE-REPISA", "PROD-REPISA"),
    ("PROC-ENSAMBLE-MESA", "PROD-MESA-TRABAJO"),
)


def poblar_catalogo_demostracion(catalogo: Catalogo) -> Catalogo:
    """Registra el conjunto sintético de demostración en ``catalogo``."""
    for id_valor, tipo, nombre, descripcion, stock_disponible, stock_minimo in _ELEMENTOS:
        catalogo.registrar_elemento(
            Elemento.crear(
                id_valor,
                tipo,
                nombre,
                descripcion=descripcion,
                stock_disponible=stock_disponible,
                stock_minimo=stock_minimo,
            )
        )
    for origen, destino in _DEPENDENCIAS:
        catalogo.registrar_dependencia(origen, destino)
    return catalogo
