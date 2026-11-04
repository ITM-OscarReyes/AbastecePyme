"""RF-F2-01 a RF-F2-09 · Análisis de impacto (F2).

Cubre AC-F2-01 a AC-F2-15 y casos límite de la sección 7 de
acceptance-criteria.md.
"""

import ast
import re
import sys
import time
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
    ("PROV-ACERO", "INS-TORNILLO"),
    ("INS-BARRA", "PROC-CORTE"),
    ("INS-TORNILLO", "PROC-CORTE"),
    ("PROC-CORTE", "PROD-PANEL"),
    ("PROC-CORTE", "PROD-BANCO"),
)

# Conjunto cíclico: el anterior más PROC-CORTE → INS-BARRA
DEPENDENCIAS_CICLICAS: tuple[tuple[str, str], ...] = DEPENDENCIAS_PRUEBA + (
    ("PROC-CORTE", "INS-BARRA"),
)


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

def test_ac_f2_01_impacto_prov_acero_devuelve_cinco_afectados() -> None:
    """PROV-ACERO afecta a los dos suministros, al proceso y a los dos productos."""
    cliente = _cliente_con_datos()
    respuesta = cliente.get("/api/v1/impacto/PROV-ACERO")

    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    afectados_ids = [e["id"] for e in cuerpo["afectados"]]
    assert afectados_ids == [
        "INS-BARRA",
        "INS-TORNILLO",
        "PROC-CORTE",
        "PROD-BANCO",
        "PROD-PANEL",
    ]
    assert cuerpo["total"] == 5


def test_ac_f2_01b_impacto_no_invierte_grafo_producto_terminal_sin_afectados() -> None:
    """Un producto no habilita a otros elementos: no tiene afectados aguas abajo."""
    cliente = _cliente_con_datos()
    respuesta = cliente.get("/api/v1/impacto/PROD-PANEL")

    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    assert cuerpo["afectados"] == []
    assert cuerpo["total"] == 0
    # Predecesores no afectados
    assert "PROC-CORTE" not in [e["id"] for e in cuerpo["afectados"]]
    assert "INS-BARRA" not in [e["id"] for e in cuerpo["afectados"]]
    assert "PROV-ACERO" not in [e["id"] for e in cuerpo["afectados"]]
    assert "INS-TORNILLO" not in [e["id"] for e in cuerpo["afectados"]]


def test_ac_f2_07_dependiente_definido_por_arista_entrada_coherente() -> None:
    """Un elemento con aristas entrantes puede afectar a sus dependientes."""
    cliente = _cliente_con_datos()
    # PROC-CORTE tiene aristas entrantes (es dependiente) y afecta hacia adelante.
    respuesta = cliente.get("/api/v1/impacto/PROC-CORTE")
    cuerpo = respuesta.json()
    assert cuerpo["total"] == 2
    assert {e["id"] for e in cuerpo["afectados"]} == {"PROD-BANCO", "PROD-PANEL"}


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
    """PROD-BANCO y PROD-PANEL se alcanzan por varios caminos y aparecen una vez."""
    cliente = _cliente_con_datos()
    respuesta = cliente.get("/api/v1/impacto/INS-TORNILLO")

    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    afectados_ids = [e["id"] for e in cuerpo["afectados"]]
    assert afectados_ids.count("PROD-BANCO") == 1
    assert set(afectados_ids) == {"PROC-CORTE", "PROD-PANEL", "PROD-BANCO"}
    assert cuerpo["total"] == 3


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
    assert alcanzados == {
        "INS-BARRA",
        "INS-TORNILLO",
        "PROC-CORTE",
        "PROD-PANEL",
        "PROD-BANCO",
    }
    # No filtra por tipo: incluye INSUMO, PROCESO, PRODUCTO
    tipos = {e["tipo"] for e in cuerpo["afectados"]}
    assert tipos == {"INSUMO", "PROCESO", "PRODUCTO"}


# ---------------------------------------------------------------------------
# RF-F2-05 / RN-F2-06 · Recorrido propio del proyecto (sin NetworkX)
# ---------------------------------------------------------------------------

def test_ac_f2_06_calculo_impacto_sin_networkx() -> None:
    """AC-F2-06: revisión estática confirma que no se usa NetworkX para el cálculo."""
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
    """AC-F2-06b / AC-F2-09: revisión estática confirma que el frontend no calcula alcanzables."""
    raiz_frontend = RAIZ_BACKEND.parent / "frontend" / "src"
    patrones_prohibidos = [
        re.compile(r"\b(dfs|bfs|shortestPath|dijkstra)\b", re.IGNORECASE),
        re.compile(r"from\s+['\"]networkx['\"]"),
        re.compile(r"from\s+['\"]graphlib['\"]"),
    ]

    for archivo in raiz_frontend.rglob("*.ts*"):
        if "test" in archivo.parts:
            continue
        texto = archivo.read_text(encoding="utf-8")
        for patron in patrones_prohibidos:
            assert not patron.search(texto), (
                f"AC-F2-06b: Patrón de cálculo o biblioteca de grafo encontrado en {archivo.name}"
            )


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
    assert set(cuerpo.keys()) == {"elemento", "afectados", "total", "resumenStock"}
    assert set(cuerpo["resumenStock"].keys()) == {
        "totalSuministros",
        "suministrosBajoMinimo",
    }


# ---------------------------------------------------------------------------
# RNF-F2-03 · Trazabilidad documental de F2
# ---------------------------------------------------------------------------

def test_ac_f2_10_trazabilidad_necesidades_requisitos_criterios() -> None:
    """AC-F2-10: trazabilidad N9..N14 -> RF-F2-01..09, RNF-F2-01..03 -> AC-F2-01..15."""
    req_path = RAIZ_BACKEND.parent / "docs" / "requirements.md"
    ac_path = RAIZ_BACKEND.parent / "docs" / "acceptance-criteria.md"
    req_text = req_path.read_text(encoding="utf-8")
    ac_text = ac_path.read_text(encoding="utf-8")

    # Necesidades declaradas en requirements.md §9
    for necesidad in ("N9", "N10", "N11", "N12", "N13", "N14"):
        assert necesidad in req_text, f"Necesidad {necesidad} ausente en requirements.md"

    # Requisitos funcionales y no funcionales de F2
    for req in [f"RF-F2-{i:02d}" for i in range(1, 10)] + [f"RNF-F2-{i:02d}" for i in range(1, 4)]:
        assert req in req_text, f"Requisito {req} ausente en requirements.md"

    # Criterios de aceptación de F2 en acceptance-criteria.md
    for crit in [f"AC-F2-{i:02d}" for i in range(1, 16)]:
        assert crit in ac_text, f"Criterio {crit} ausente en acceptance-criteria.md"


# ---------------------------------------------------------------------------
# Normalización y Casos Límite de F2
# ---------------------------------------------------------------------------

def test_ac_f2_normalizacion_id_minusculas() -> None:
    """El id de ruta en minúsculas se normaliza a mayúsculas."""
    cliente = _cliente_con_datos()
    respuesta = cliente.get("/api/v1/impacto/prov-acero")
    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    assert cuerpo["elemento"]["id"] == "PROV-ACERO"
    assert cuerpo["total"] == 5


def test_ac_f2_elemento_aislado() -> None:
    """Un elemento existente sin dependencias entrantes ni salientes responde 200 con total 0."""
    catalogo = Catalogo()
    catalogo.registrar_elemento(Elemento.crear("PROD-AISLADO", "PRODUCTO", "Producto Aislado"))
    cliente = TestClient(crear_aplicacion(catalogo))

    respuesta = cliente.get("/api/v1/impacto/PROD-AISLADO")
    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    assert cuerpo["elemento"]["id"] == "PROD-AISLADO"
    assert cuerpo["afectados"] == []
    assert cuerpo["total"] == 0


def test_ac_f2_componentes_desconectadas() -> None:
    """Elementos de una componente disjunta no afectan a la otra."""
    catalogo = Catalogo()
    for id_valor, tipo in (
        ("PROC-A", "PROCESO"),
        ("INS-B", "INSUMO"),
        ("PROC-C", "PROCESO"),
        ("INS-D", "INSUMO"),
    ):
        catalogo.registrar_elemento(Elemento.crear(id_valor, tipo, f"Item {id_valor}"))
    # Componente 1: PROC-A -> INS-B
    catalogo.registrar_dependencia("PROC-A", "INS-B")
    # Componente 2: PROC-C -> INS-D
    catalogo.registrar_dependencia("PROC-C", "INS-D")

    cliente = TestClient(crear_aplicacion(catalogo))
    r_a = cliente.get("/api/v1/impacto/PROC-A")
    assert r_a.status_code == 200
    assert [e["id"] for e in r_a.json()["afectados"]] == ["INS-B"]

    r_c = cliente.get("/api/v1/impacto/PROC-C")
    assert r_c.status_code == 200
    assert [e["id"] for e in r_c.json()["afectados"]] == ["INS-D"]


def test_ac_f2_diamante_multiples_rutas() -> None:
    """Múltiples caminos convergentes (diamante) no duplican el elemento alcanzado."""
    catalogo = Catalogo()
    for id_valor, tipo in (
        ("PROC-ORIGEN", "PROCESO"),
        ("INS-RAMA-A", "INSUMO"),
        ("INS-RAMA-B", "INSUMO"),
        ("PROC-DESTINO", "PROCESO"),
    ):
        catalogo.registrar_elemento(Elemento.crear(id_valor, tipo, f"Item {id_valor}"))
    # Diamante: ORIGEN -> RAMA-A -> DESTINO y ORIGEN -> RAMA-B -> DESTINO
    catalogo.registrar_dependencia("PROC-ORIGEN", "INS-RAMA-A")
    catalogo.registrar_dependencia("PROC-ORIGEN", "INS-RAMA-B")
    catalogo.registrar_dependencia("INS-RAMA-A", "PROC-DESTINO")
    catalogo.registrar_dependencia("INS-RAMA-B", "PROC-DESTINO")

    cliente = TestClient(crear_aplicacion(catalogo))
    res = cliente.get("/api/v1/impacto/PROC-ORIGEN")
    assert res.status_code == 200
    afectados_ids = [e["id"] for e in res.json()["afectados"]]
    assert len(afectados_ids) == 3
    assert afectados_ids == sorted(afectados_ids)
    assert set(afectados_ids) == {"INS-RAMA-A", "INS-RAMA-B", "PROC-DESTINO"}


def test_ac_f2_cadena_larga() -> None:
    """Cadena secuencial de 7 eslabones verifica alcance transitivo completo."""
    catalogo = Catalogo()
    ids: list[str] = []
    for indice in range(1, 8):
        tipo = "PROCESO" if indice % 2 == 1 else "INSUMO"
        id_valor = f"PROC-PASO-{indice}" if tipo == "PROCESO" else f"INS-PASO-{indice}"
        ids.append(id_valor)
        catalogo.registrar_elemento(Elemento.crear(id_valor, tipo, f"Paso {id_valor}"))
    for i in range(len(ids) - 1):
        catalogo.registrar_dependencia(ids[i], ids[i + 1])

    cliente = TestClient(crear_aplicacion(catalogo))
    res1 = cliente.get(f"/api/v1/impacto/{ids[0]}")
    assert res1.status_code == 200
    assert res1.json()["total"] == 6

    res4 = cliente.get(f"/api/v1/impacto/{ids[3]}")
    assert res4.status_code == 200
    assert res4.json()["total"] == 3

    res_last = cliente.get(f"/api/v1/impacto/{ids[-1]}")
    assert res_last.status_code == 200
    assert res_last.json()["total"] == 0


def test_ac_f2_ciclo_con_ramificacion() -> None:
    """Ciclo con rama saliente: el nodo consultado no se incluye y la rama se alcanza."""
    catalogo = Catalogo()
    for id_valor, tipo in (
        ("PROC-A", "PROCESO"),
        ("INS-B", "INSUMO"),
        ("PROC-C", "PROCESO"),
        ("INS-D", "INSUMO"),
        ("INS-E", "INSUMO"),
    ):
        catalogo.registrar_elemento(Elemento.crear(id_valor, tipo, f"Item {id_valor}"))
    # Ciclo PROC-A -> INS-B -> PROC-C -> INS-D -> PROC-A
    catalogo.registrar_dependencia("PROC-A", "INS-B")
    catalogo.registrar_dependencia("INS-B", "PROC-C")
    catalogo.registrar_dependencia("PROC-C", "INS-D")
    catalogo.registrar_dependencia("INS-D", "PROC-A")
    # Rama PROC-A -> INS-E
    catalogo.registrar_dependencia("PROC-A", "INS-E")

    cliente = TestClient(crear_aplicacion(catalogo))
    res_a = cliente.get("/api/v1/impacto/PROC-A")
    assert res_a.status_code == 200
    cuerpo_a = res_a.json()
    ids_a = [e["id"] for e in cuerpo_a["afectados"]]
    assert ids_a == ["INS-B", "INS-D", "INS-E", "PROC-C"]
    assert "PROC-A" not in ids_a
    assert cuerpo_a["total"] == 4

    res_b = cliente.get("/api/v1/impacto/INS-B")
    assert res_b.status_code == 200
    cuerpo_b = res_b.json()
    ids_b = [e["id"] for e in cuerpo_b["afectados"]]
    assert ids_b == ["INS-D", "INS-E", "PROC-A", "PROC-C"]
    assert "INS-B" not in ids_b
    assert cuerpo_b["total"] == 4


def test_ac_f2_rendimiento_grafo_grande() -> None:
    """Con 200 elementos y 500 dependencias, la consulta responde en tiempo lineal."""
    catalogo = Catalogo()
    proveedores = [f"PROV-{i:04d}" for i in range(100)]
    suministros = [f"INS-{i:04d}" for i in range(100)]
    for id_valor in proveedores:
        catalogo.registrar_elemento(Elemento.crear(id_valor, "PROVEEDOR", f"Proveedor {id_valor}"))
    for id_valor in suministros:
        catalogo.registrar_elemento(Elemento.crear(id_valor, "INSUMO", f"Insumo {id_valor}"))

    registrados = 0
    for indice_suministro in range(100):
        for desplazamiento in range(5):
            proveedor = proveedores[(indice_suministro * 5 + desplazamiento) % 100]
            catalogo.registrar_dependencia(proveedor, suministros[indice_suministro])
            registrados += 1

    assert registrados == 500

    cliente = TestClient(crear_aplicacion(catalogo))
    t0 = time.perf_counter()
    respuesta = cliente.get("/api/v1/impacto/PROV-0000")
    t1 = time.perf_counter()
    duracion_ms = (t1 - t0) * 1000

    assert respuesta.status_code == 200
    assert duracion_ms < 50.0, f"Consulta tardó {duracion_ms:.2f} ms (esperado < 50ms)"


def test_ac_f2_metodo_no_permitido() -> None:
    """POST sobre /api/v1/impacto/{id} responde 405 Method Not Allowed."""
    cliente = _cliente_con_datos()
    respuesta = cliente.post("/api/v1/impacto/PROV-ACERO")
    assert respuesta.status_code == 405


def test_ac_f2_subruta_inexistente() -> None:
    """Subruta bajo /api/v1/impacto/... responde 404 ERR-09."""
    cliente = _cliente_con_datos()
    respuesta = cliente.get("/api/v1/impacto/PROV-ACERO/subruta")
    assert respuesta.status_code == 404
    assert respuesta.json()["error"]["codigo"] == "TIPO_NO_ENCONTRADO"


def test_ac_f2_parametros_consulta_ignorados() -> None:
    """Parámetros de consulta adicionales no provocan fallo ni alteran el resultado."""
    cliente = _cliente_con_datos()
    respuesta = cliente.get("/api/v1/impacto/PROV-ACERO?parametroExtra=ignorado")
    assert respuesta.status_code == 200
    assert respuesta.json()["total"] == 5


# ---------------------------------------------------------------------------
# Casos límite adicionales de la tabla de acceptance-criteria.md
# ---------------------------------------------------------------------------

def test_limite_consulta_desde_proveedor() -> None:
    """Consulta desde PROVEEDOR respeta la dirección."""
    cliente = _cliente_con_datos()
    respuesta = cliente.get("/api/v1/impacto/PROV-ACERO")
    assert respuesta.status_code == 200
    assert respuesta.json()["total"] == 5


def test_limite_consulta_desde_insumo() -> None:
    """Consulta desde INSUMO respeta la dirección."""
    cliente = _cliente_con_datos()
    respuesta = cliente.get("/api/v1/impacto/INS-TORNILLO")
    assert respuesta.status_code == 200
    assert respuesta.json()["total"] == 3


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
    assert afectados == set()


def test_limite_consulta_repetida_sobre_grafo_con_ciclo_sin_bucle_infinito() -> None:
    """Consulta repetida sobre grafo con ciclo: sin bucle infinito ni duplicados."""
    cliente = _cliente_con_datos(dependencias=DEPENDENCIAS_CICLICAS)

    for _ in range(5):
        respuesta = cliente.get("/api/v1/impacto/INS-BARRA")
        assert respuesta.status_code == 200
        afectados_ids = [e["id"] for e in respuesta.json()["afectados"]]
        assert len(afectados_ids) == len(set(afectados_ids))  # Sin duplicados
        assert set(afectados_ids) == {"PROC-CORTE", "PROD-PANEL", "PROD-BANCO"}
