"""RF-F2-01 a RF-F2-09 · Análisis de impacto (F2).

Cubre AC-F2-01 a AC-F2-15 y casos límite de la sección 7 de
acceptance-criteria.md.
"""

import sys
from pathlib import Path

from fastapi.testclient import TestClient

RAIZ_BACKEND = Path(__file__).resolve().parents[1]
if str(RAIZ_BACKEND) not in sys.path:
    sys.path.insert(0, str(RAIZ_BACKEND))

from app.api.aplicacion import crear_aplicacion  # noqa: E402
from app.dominio.catalogo import Catalogo  # noqa: E402
from app.dominio.elemento import Elemento  # noqa: E402


# Conjunto de prueba de acceptance-criteria.md sección 7.1
ELEMENTOS_PRUEBA: tuple[tuple[str, str, str], ...] = (
    ("PROV-ACERO", "PROVEEDOR", "Proveedor de acero"),
    ("INS-BARRA", "INSUMO", "Barra de acero"),
    ("INS-TORNILLO", "INSUMO", "Tornillo hexagonal M6"),
    ("PROC-CORTE", "PROCESO", "Corte de panel"),
    ("PROD-PANEL", "PRODUCTO", "Panel de montaje"),
    ("PROD-BANCO", "PRODUCTO", "Banco de montaje"),
)

DEPENDENCIAS_PRUEBA: tuple[tuple[str, str], ...] = (
    ("PROV-ACERO", "INS-BARRA"),
    ("INS-BARRA", "PROC-CORTE"),
    ("PROC-CORTE", "PROD-PANEL"),
    ("INS-TORNILLO", "PROD-PANEL"),
    ("PROD-PANEL", "PROD-BANCO"),
    ("INS-TORNILLO", "PROD-BANCO"),
)

# Conjunto cíclico: el anterior más PROD-BANCO → PROD-PANEL
DEPENDENCIAS_CICLICAS: tuple[tuple[str, str], ...] = DEPENDENCIAS_PRUEBA + (("PROD-BANCO", "PROD-PANEL"),)


def _cliente_con_datos(dependencias: tuple[tuple[str, str], ...] = DEPENDENCIAS_PRUEBA) -> TestClient:
    """Crea un cliente de prueba con el catálogo poblado."""
    catalogo = Catalogo()
    for id_valor, tipo, nombre in ELEMENTOS_PRUEBA:
        catalogo.registrar_elemento(Elemento.crear(id_valor, tipo, nombre))
    for origen, destino in dependencias:
        catalogo.registrar_dependencia(origen, destino)
    return TestClient(crear_aplicacion(catalogo))


def _cliente_vacio() -> TestClient:
    """Cliente con catálogo vacío."""
    return TestClient(crear_aplicacion(Catalogo()))


# ---------------------------------------------------------------------------
# RF-F2-01 / RN-F2-01, RN-F2-02, RN-F2-07 · Respeto a la dirección definida
# ---------------------------------------------------------------------------

def test_ac_f2_01_impacto_prov_acero_devuelve_cuatro_afectados() -> None:
    """AC-F2-01: PROV-ACERO afecta INS-BARRA, PROC-CORTE, PROD-PANEL, PROD-BANCO."""
    cliente = _cliente_con_datos()
    respuesta = cliente.get("/api/v1/impacto/PROV-ACERO")

    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    afectados_ids = [e["id"] for e in cuerpo["afectados"]]
    assert afectados_ids == ["INS-BARRA", "PROC-CORTE", "PROD-BANCO", "PROD-PANEL"]
    assert cuerpo["total"] == 4
    # INS-TORNILLO NO debe aparecer (no es alcanzable desde PROV-ACERO)
    assert "INS-TORNILLO" not in afectados_ids


def test_ac_f2_01b_impacto_no_invierte_grafo_prod_panel_solo_afecta_prod_banco() -> None:
    """AC-F2-01b: PROD-PANEL solo afecta a PROD-BANCO, no a sus predecesores."""
    cliente = _cliente_con_datos()
    respuesta = cliente.get("/api/v1/impacto/PROD-PANEL")

    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    afectados_ids = [e["id"] for e in cuerpo["afectados"]]
    assert afectados_ids == ["PROD-BANCO"]
    assert cuerpo["total"] == 1
    # Predecesores no afectados
    assert "PROC-CORTE" not in afectados_ids
    assert "INS-BARRA" not in afectados_ids
    assert "PROV-ACERO" not in afectados_ids
    assert "INS-TORNILLO" not in afectados_ids


def test_ac_f2_07_dependiente_definido_por_arista_entrada_coherente() -> None:
    """AC-F2-07: un elemento es dependiente cuando tiene arista entrante; impacto no invierte."""
    cliente = _cliente_con_datos()
    # PROD-PANEL tiene aristas entrantes (es dependiente), pero su impacto va hacia adelante
    respuesta = cliente.get("/api/v1/impacto/PROD-PANEL")
    cuerpo = respuesta.json()
    assert cuerpo["total"] == 1
    assert cuerpo["afectados"][0]["id"] == "PROD-BANCO"


# ---------------------------------------------------------------------------
# RF-F2-02 / RN-F2-03, RN-F2-04, RN-F2-09 · Diferenciación de los casos
# ---------------------------------------------------------------------------

def test_ac_f2_03_elemento_inexistente_responde_404_err02() -> None:
    """AC-F2-03: identificador con formato válido pero inexistente → 404 ERR-02."""
    cliente = _cliente_con_datos()
    respuesta = cliente.get("/api/v1/impacto/INEXISTENTE")

    assert respuesta.status_code == 404
    cuerpo = respuesta.json()
    assert cuerpo["error"]["codigo"] == "ELEMENTO_NO_ENCONTRADO"
    assert "INEXISTENTE" in cuerpo["error"]["mensaje"]
    # No debe contener elemento, afectados ni total
    assert "elemento" not in cuerpo
    assert "afectados" not in cuerpo
    assert "total" not in cuerpo


def test_ac_f2_04_elemento_existente_sin_dependencias_responde_200_total_cero() -> None:
    """AC-F2-04: PROD-BANCO existe y no habilita a nadie → 200, total 0."""
    cliente = _cliente_con_datos()
    respuesta = cliente.get("/api/v1/impacto/PROD-BANCO")

    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    assert cuerpo["elemento"]["id"] == "PROD-BANCO"
    assert cuerpo["afectados"] == []
    assert cuerpo["total"] == 0


def test_ac_f2_11_identificador_mal_formado_responde_422_err05_nunca_404() -> None:
    """AC-F2-11: id mal formado en la ruta → 422 ERR-05, nunca 404."""
    cliente = _cliente_con_datos()
    respuesta = cliente.get("/api/v1/impacto/xx")

    assert respuesta.status_code == 422
    cuerpo = respuesta.json()
    assert cuerpo["error"]["codigo"] == "IDENTIFICADOR_INVALIDO"
    # No debe ser 404
    assert cuerpo["error"]["codigo"] != "ELEMENTO_NO_ENCONTRADO"


# ---------------------------------------------------------------------------
# RF-F2-03 / RN-F2-05, RN-F2-11 · Elementos alcanzados de manera comprensible
# ---------------------------------------------------------------------------

def test_ac_f2_05_impacto_ins_barra_incluye_directos_e_indirectos() -> None:
    """AC-F2-05: INS-BARRA afecta PROC-CORTE (directo) y PROD-PANEL, PROD-BANCO (indirectos)."""
    cliente = _cliente_con_datos()
    respuesta = cliente.get("/api/v1/impacto/INS-BARRA")

    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    afectados_ids = {e["id"] for e in cuerpo["afectados"]}
    assert afectados_ids == {"PROC-CORTE", "PROD-PANEL", "PROD-BANCO"}
    assert cuerpo["total"] == 3


def test_ac_f2_05b_cada_alcanzable_aparece_una_sola_vez() -> None:
    """AC-F2-05b: PROD-BANCO alcanzable por dos caminos desde INS-TORNILLO aparece una vez."""
    cliente = _cliente_con_datos()
    respuesta = cliente.get("/api/v1/impacto/INS-TORNILLO")

    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    afectados_ids = [e["id"] for e in cuerpo["afectados"]]
    # PROD-BANCO solo una vez
    assert afectados_ids.count("PROD-BANCO") == 1
    assert set(afectados_ids) == {"PROD-PANEL", "PROD-BANCO"}
    assert cuerpo["total"] == 2


def test_ac_f2_05c_con_ciclo_el_recorrido_termina_y_devuelve_sin_repetir() -> None:
    """AC-F2-05c: con ciclo (PROD-BANCO → PROD-PANEL), el recorrido termina sin duplicados."""
    cliente = _cliente_con_datos(dependencias=DEPENDENCIAS_CICLICAS)
    respuesta = cliente.get("/api/v1/impacto/INS-BARRA")

    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    afectados_ids = [e["id"] for e in cuerpo["afectados"]]
    # Debe terminar y no repetir
    assert len(afectados_ids) == len(set(afectados_ids))
    assert set(afectados_ids) == {"PROC-CORTE", "PROD-PANEL", "PROD-BANCO"}
    assert cuerpo["total"] == 3


# ---------------------------------------------------------------------------
# RF-F2-04 / RN-F2-02, RN-F2-13 · Significado de «alcanzar»
# ---------------------------------------------------------------------------

def test_ac_f2_02_alcanzar_significa_camino_dirigido_hacia_adelante() -> None:
    """AC-F2-02: alcanzar = camino dirigido desde el consultado siguiendo aristas hacia adelante."""
    cliente = _cliente_con_datos()
    respuesta = cliente.get("/api/v1/impacto/PROV-ACERO")
    cuerpo = respuesta.json()

    # Los afectados son exactamente los alcanzables hacia adelante
    alcanzados = {e["id"] for e in cuerpo["afectados"]}
    assert alcanzados == {"INS-BARRA", "PROC-CORTE", "PROD-PANEL", "PROD-BANCO"}
    # No filtra por tipo: incluye INSUMO, PROCESO, PRODUCTO
    tipos = {e["tipo"] for e in cuerpo["afectados"]}
    assert tipos == {"INSUMO", "PROCESO", "PRODUCTO"}


# ---------------------------------------------------------------------------
# RF-F2-05 / RN-F2-06 · Recorrido propio del proyecto (sin NetworkX)
# ---------------------------------------------------------------------------

def test_ac_f2_06_calculo_impacto_sin_networkx() -> None:
    """AC-F2-06: revisión estática confirma que no se usa NetworkX para el cálculo."""
    import ast

    modulos_importados: set[str] = set()
    for ruta in (RAIZ_BACKEND / "app").rglob("*.py"):
        arbol = ast.parse(ruta.read_text(encoding="utf-8"))
        for nodo in ast.walk(arbol):
            if isinstance(nodo, ast.Import):
                modulos_importados.update(alias.name.split(".")[0] for alias in nodo.names)
            elif isinstance(nodo, ast.ImportFrom) and nodo.module and nodo.level == 0:
                modulos_importados.add(nodo.module.split(".")[0])

    assert "networkx" not in modulos_importados


def test_ac_f2_06b_frontend_no_recalcula_alcanzables() -> None:
    """AC-F2-06b: nota de verificación para frontend (aquí solo documentamos la intención)."""
    # El frontend no debe implementar recorridos; se verifica en tests de frontend.
    pass


# ---------------------------------------------------------------------------
# RF-F2-06 / RN-F2-10 · Catálogo vacío
# ---------------------------------------------------------------------------

def test_ac_f2_12_catalogo_vacio_responde_404_err02_nunca_200_lista_vacia() -> None:
    """AC-F2-12: catálogo vacío → 404 ERR-02, nunca 200 con lista vacía."""
    cliente = _cliente_vacio()
    respuesta = cliente.get("/api/v1/impacto/PROV-ACERO")

    assert respuesta.status_code == 404
    cuerpo = respuesta.json()
    assert cuerpo["error"]["codigo"] == "ELEMENTO_NO_ENCONTRADO"
    assert "elemento" not in cuerpo


# ---------------------------------------------------------------------------
# RF-F2-07 / RN-F2-11 · Resultado determinista
# ---------------------------------------------------------------------------

def test_ac_f2_13_dos_consultas_id_producen_misma_respuesta_mismo_orden() -> None:
    """AC-F2-13: dos consultas idénticas consecutivas → misma respuesta y orden."""
    cliente = _cliente_con_datos()

    r1 = cliente.get("/api/v1/impacto/INS-BARRA")
    r2 = cliente.get("/api/v1/impacto/INS-BARRA")

    assert r1.status_code == r2.status_code == 200
    assert r1.json() == r2.json()
    # Orden estable por id ascendente
    afectados_ids = [e["id"] for e in r1.json()["afectados"]]
    assert afectados_ids == sorted(afectados_ids)


# ---------------------------------------------------------------------------
# RF-F2-08 / RN-F2-12 · Sin información de ciclos ni de orden
# ---------------------------------------------------------------------------

def test_ac_f2_14_respuesta_no_incluye_veredicto_ciclo_ni_orden() -> None:
    """AC-F2-14: respuesta de impacto sin campos de ciclo ni orden."""
    cliente = _cliente_con_datos(dependencias=DEPENDENCIAS_CICLICAS)
    respuesta = cliente.get("/api/v1/impacto/INS-BARRA")

    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    claves_prohibidas = {"ciclos", "ciclo", "tieneCiclo", "orden", "ordenProduccion", "nivel", "niveles"}
    assert claves_prohibidas.isdisjoint(cuerpo)
    for afectado in cuerpo["afectados"]:
        assert claves_prohibidas.isdisjoint(afectado)


# ---------------------------------------------------------------------------
# RF-F2-09 / RN-F2-13 · «Alcanzar» documentado
# ---------------------------------------------------------------------------

def test_ac_f2_15_readme_documenta_significado_alcanzar() -> None:
    """AC-F2-15: README.md explica qué significa 'alcanzar' con ejemplo."""
    raiz_proyecto = RAIZ_BACKEND.parent
    readme = (raiz_proyecto / "README.md").read_text(encoding="utf-8")
    readme_lower = readme.lower()
    assert "alcanzar" in readme_lower
    assert "camino dirigido" in readme_lower
    assert "origen" in readme_lower and "habilita" in readme_lower and "destino" in readme_lower
    assert "PROV-ACERO" in readme and "INS-BARRA" in readme


# ---------------------------------------------------------------------------
# RNF-F2-01 · Separación de capas
# ---------------------------------------------------------------------------

def test_ac_f2_09_recorrido_impacto_vive_en_dominio_no_en_http() -> None:
    """AC-F2-09: el recorrido está en dominio (Catalogo.obtener_impacto), no en rutas."""
    catalogo_codigo = (RAIZ_BACKEND / "app" / "dominio" / "catalogo.py").read_text(encoding="utf-8")
    assert "def obtener_impacto" in catalogo_codigo
    assert "_adyacencia_salida" in catalogo_codigo

    rutas_codigo = (RAIZ_BACKEND / "app" / "api" / "rutas.py").read_text(encoding="utf-8")
    # La ruta solo llama al caso de uso, no implementa recorrido
    assert "while" not in rutas_codigo or "pila" not in rutas_codigo


# ---------------------------------------------------------------------------
# RNF-F2-02 · Datos sintéticos y errores explícitos
# ---------------------------------------------------------------------------

def test_ac_f2_08_datos_sinteticos_errores_explicitos() -> None:
    """AC-F2-08: elementos sintéticos coherentes; errores no se ocultan."""
    cliente = _cliente_con_datos()

    # Caso inexistente → error explícito
    r1 = cliente.get("/api/v1/impacto/NOEXISTE")
    assert r1.status_code == 404
    assert r1.json()["error"]["codigo"] == "ELEMENTO_NO_ENCONTRADO"

    # Caso mal formado → error explícito
    r2 = cliente.get("/api/v1/impacto/xx")
    assert r2.status_code == 422
    assert r2.json()["error"]["codigo"] == "IDENTIFICADOR_INVALIDO"

    # Caso éxito → 200 con estructura completa
    r3 = cliente.get("/api/v1/impacto/PROV-ACERO")
    assert r3.status_code == 200
    cuerpo = r3.json()
    assert set(cuerpo.keys()) == {"elemento", "afectados", "total"}


# ---------------------------------------------------------------------------
# Casos límite adicionales de la tabla de acceptance-criteria.md
# ---------------------------------------------------------------------------

def test_limite_consulta_desde_proveedor() -> None:
    """Consulta desde PROVEEDOR respeta la dirección."""
    cliente = _cliente_con_datos()
    respuesta = cliente.get("/api/v1/impacto/PROV-ACERO")
    assert respuesta.status_code == 200
    assert respuesta.json()["total"] == 4


def test_limite_consulta_desde_insumo() -> None:
    """Consulta desde INSUMO respeta la dirección."""
    cliente = _cliente_con_datos()
    respuesta = cliente.get("/api/v1/impacto/INS-TORNILLO")
    assert respuesta.status_code == 200
    assert respuesta.json()["total"] == 2


def test_limite_consulta_desde_proceso() -> None:
    """Consulta desde PROCESO respeta la dirección."""
    cliente = _cliente_con_datos()
    respuesta = cliente.get("/api/v1/impacto/PROC-CORTE")
    assert respuesta.status_code == 200
    afectados = {e["id"] for e in respuesta.json()["afectados"]}
    assert afectados == {"PROD-PANEL", "PROD-BANCO"}


def test_limite_consulta_desde_producto() -> None:
    """Consulta desde PRODUCTO respeta la dirección."""
    cliente = _cliente_con_datos()
    respuesta = cliente.get("/api/v1/impacto/PROD-PANEL")
    assert respuesta.status_code == 200
    afectados = {e["id"] for e in respuesta.json()["afectados"]}
    assert afectados == {"PROD-BANCO"}


def test_limite_consulta_repetida_sobre_grafo_con_ciclo_sin_bucle_infinito() -> None:
    """Consulta repetida sobre grafo con ciclo: sin bucle infinito ni duplicados."""
    cliente = _cliente_con_datos(dependencias=DEPENDENCIAS_CICLICAS)

    for _ in range(5):
        respuesta = cliente.get("/api/v1/impacto/INS-BARRA")
        assert respuesta.status_code == 200
        afectados_ids = [e["id"] for e in respuesta.json()["afectados"]]
        assert len(afectados_ids) == len(set(afectados_ids))  # Sin duplicados
        assert set(afectados_ids) == {"PROC-CORTE", "PROD-PANEL", "PROD-BANCO"}