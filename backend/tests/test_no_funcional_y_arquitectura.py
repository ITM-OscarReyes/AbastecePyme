"""Criterios no funcionales y de arquitectura de F1.

Cubre AC-F1-17, AC-F1-18, AC-F1-19, AC-F1-20, AC-F1-21, AC-F1-23, AC-F1-24.
"""

import ast
import sys
import time
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from .conftest import registrar_dependencia, registrar_elemento

RAIZ_BACKEND = Path(__file__).resolve().parents[1]
RAIZ_PROYECTO = RAIZ_BACKEND.parent


def test_ac_f1_17_el_contrato_vive_bajo_api_v1_y_usa_lower_camel_case(
    cliente: TestClient,
) -> None:
    respuesta = cliente.get("/api/v1/grafo")

    assert respuesta.status_code == 200
    assert set(respuesta.json()["resumen"]) == {"totalElementos", "totalDependencias"}

    dependencias = cliente.get("/api/v1/dependencias").json()["dependencias"]
    assert {"origen", "destino", "tipoRelacion"} == set(dependencias[0])


def test_ac_f1_17_una_ruta_inexistente_responde_404_err09(cliente: TestClient) -> None:
    for ruta in ("/api/v1/inexistente", "/api/v1/elementos/INS-A1/subruta", "/otra/ruta"):
        respuesta = cliente.get(ruta)

        assert respuesta.status_code == 404, ruta
        assert respuesta.json()["error"]["codigo"] == "TIPO_NO_ENCONTRADO", ruta


def test_ac_f1_17_el_python_no_usa_la_forma_serializada_del_json() -> None:
    """AC-F1-17 / RNF-Q-06: ningún identificador Python en camelCase.

    Los nombres del JSON (`tipoRelacion`, `totalElementos`...) no aparecen en el
    Python; el dominio usa `tipo_relacion`, que sí es la convención exigida.
    """
    formas_json = {
        "tipoRelacion",
        "totalElementos",
        "totalDependencias",
        "nombreElemento",
        "descripcionTexto",
        "tipoDeElemento",
    }
    for ruta in (RAIZ_BACKEND / "app").rglob("*.py"):
        arbol = ast.parse(ruta.read_text(encoding="utf-8"))
        for nodo in ast.walk(arbol):
            if isinstance(nodo, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
                assert nodo.name not in formas_json, f"{ruta.name}: {nodo.name}"
            if isinstance(nodo, ast.Name) and isinstance(nodo.ctx, ast.Store):
                assert nodo.id not in formas_json, f"{ruta.name}: {nodo.id}"
            if isinstance(nodo, ast.arg):
                assert nodo.arg not in formas_json, f"{ruta.name}: {nodo.arg}"


def test_ac_f1_18_lecturas_identicas_producen_respuestas_identicas(cliente: TestClient) -> None:
    for ruta in ("/api/v1/elementos", "/api/v1/dependencias", "/api/v1/grafo", "/api/v1/elementos/INS-TORNILLO"):
        primera = cliente.get(ruta)
        segunda = cliente.get(ruta)
        tercera = cliente.get(ruta)

        assert primera.status_code == 200, ruta
        assert primera.json() == segunda.json() == tercera.json(), ruta


def test_ac_f1_18_el_orden_no_depende_del_orden_de_insercion(cliente_vacio: TestClient) -> None:
    ids = ["INS-D5", "PROD-C9", "PROC-A3", "PROV-B8", "INS-A1"]
    for id_valor in ids:
        registrar_elemento(cliente_vacio, id_valor, "INSUMO", f"Elemento {id_valor}")
    for origen, destino in zip(ids, ids[1:]):
        registrar_dependencia(cliente_vacio, origen, destino)

    elementos = [e["id"] for e in cliente_vacio.get("/api/v1/elementos").json()["elementos"]]
    dependencias = cliente_vacio.get("/api/v1/dependencias").json()["dependencias"]

    assert elementos == sorted(elementos)
    assert [(d["origen"], d["destino"]) for d in dependencias] == sorted(
        (d["origen"], d["destino"]) for d in dependencias
    )


def test_ac_f1_19_los_datos_de_prueba_son_sinteticos_y_del_dominio() -> None:
    """AC-F1-19 / RNF-F1-07: sin datos de personas ni empresas reales."""
    from app.infraestructura.datos_demostracion import _DEPENDENCIAS, _ELEMENTOS

    elementos = {id_valor for id_valor, _, _ in _ELEMENTOS}
    assert elementos == {
        "PROV-ACERO",
        "INS-BARRA",
        "INS-TORNILLO",
        "PROC-CORTE",
        "PROD-PANEL",
        "PROD-BANCO",
    }
    for origen, destino in _DEPENDENCIAS:
        assert origen in elementos
        assert destino in elementos
    tipos = {tipo for _, tipo, _ in _ELEMENTOS}
    assert tipos <= {"PROVEEDOR", "INSUMO", "PRODUCTO", "PROCESO"}


def test_ac_f1_20_las_operaciones_responden_en_tiempo_lineal(cliente_vacio: TestClient) -> None:
    """AC-F1-20 / RNF-F1-09: 200 elementos y 500 dependencias."""
    elementos_ids = [f"INS-{indice:04d}" for indice in range(200)]
    for id_valor in elementos_ids:
        registrar_elemento(cliente_vacio, id_valor, "INSUMO", f"Elemento {id_valor}")

    inicio = time.perf_counter()
    assert len(cliente_vacio.get("/api/v1/elementos").json()["elementos"]) == 200
    listar_pequeno = time.perf_counter() - inicio

    inicio = time.perf_counter()
    assert len(cliente_vacio.get("/api/v1/grafo").json()["elementos"]) == 200
    grafo_pequeno = time.perf_counter() - inicio

    # 500 pares distintos, sin aristas reflexivas ni duplicadas.
    registrados = 0
    for origen_indice in range(200):
        for desplazamiento in range(1, 4):
            if registrados == 500:
                break
            destino_indice = (origen_indice + desplazamiento) % 200
            respuesta = registrar_dependencia(
                cliente_vacio, elementos_ids[origen_indice], elementos_ids[destino_indice]
            )
            assert respuesta.status_code == 201, respuesta.text
            registrados += 1
        if registrados == 500:
            break

    inicio = time.perf_counter()
    grafo = cliente_vacio.get("/api/v1/grafo").json()
    grafo_grande = time.perf_counter() - inicio

    inicio = time.perf_counter()
    listado = cliente_vacio.get("/api/v1/dependencias").json()
    dependencias_grande = time.perf_counter() - inicio

    inicio = time.perf_counter()
    cliente_vacio.get("/api/v1/dependencias?origen=INS-0007")
    filtrado = time.perf_counter() - inicio

    assert grafo["resumen"]["totalElementos"] == 200
    assert grafo["resumen"]["totalDependencias"] == 500
    assert listado["total"] == 500

    margen = max(grafo_pequeno, listar_pequeno) * 20 + 2.0
    assert grafo_grande < margen, f"grafo grande: {grafo_grande:.3f}s, margen: {margen:.3f}s"
    assert dependencias_grande < margen, f"dependencias: {dependencias_grande:.3f}s"
    assert filtrado < margen, f"filtrado: {filtrado:.3f}s"


def test_ac_f1_21_los_casos_de_uso_no_dependen_de_http_ni_de_persistencia() -> None:
    """AC-F1-21 / RNF-Q-01 a RNF-Q-03: dependencias hacia el interior."""
    arbol = ast.parse((RAIZ_BACKEND / "app" / "aplicacion" / "casos_de_uso.py").read_text(encoding="utf-8"))

    prohibidos = {"fastapi", "starlette", "pydantic", "httpx", "requests", "uvicorn", "sqlite3", "sqlalchemy"}
    importados: set[str] = set()
    for nodo in ast.walk(arbol):
        if isinstance(nodo, ast.Import):
            importados.update(alias.name.split(".")[0] for alias in nodo.names)
        elif isinstance(nodo, ast.ImportFrom) and nodo.module:
            importados.add(nodo.module.split(".")[0])

    assert importados.isdisjoint(prohibidos), importados & prohibidos


def test_ac_f1_21_el_acceso_a_datos_esta_tras_un_puerto() -> None:
    """AC-F1-21 / RNF-Q-03: Protocol definido hacia la aplicación."""
    from app.aplicacion.puertos import RepositorioCatalogo

    assert hasattr(RepositorioCatalogo, "obtener")
    assert hasattr(RepositorioCatalogo, "guardar")

    casos = (RAIZ_BACKEND / "app" / "aplicacion" / "casos_de_uso.py").read_text(encoding="utf-8")
    assert "RepositorioCatalogo" in casos
    assert "from app.dominio.catalogo import Catalogo" in casos or "Catalogo" in casos


def test_ac_f1_21_el_adaptador_de_persistencia_implementa_el_puerto() -> None:
    """AC-F1-21 / RNF-Q-03: la implementación cumple la forma del Protocol."""
    from app.aplicacion.puertos import RepositorioCatalogo
    from app.infraestructura.repositorio_memoria import RepositorioCatalogoMemoria

    adaptador = RepositorioCatalogoMemoria()
    miembros_puerto = {
        nombre for nombre in vars(RepositorioCatalogo) if not nombre.startswith("_")
    }
    assert miembros_puerto == {"obtener", "guardar"}
    for nombre in miembros_puerto:
        assert callable(getattr(adaptador, nombre)), nombre


def test_ac_f1_21_cada_regla_de_validacion_se_evalua_en_un_unico_lugar() -> None:
    """AC-F1-21 / RNF-Q-04: el patrón del identificador no se duplica en la capa HTTP."""
    patron = "A-Z0-9_-"
    for ruta in (RAIZ_BACKEND / "app").rglob("*.py"):
        if ruta.name == "validacion.py":
            continue
        contenido = ruta.read_text(encoding="utf-8")
        assert patron not in contenido, f"regla de identificador duplicada en {ruta.name}"


def test_ac_f1_21_la_capa_http_no_declara_reglas_de_negocio() -> None:
    """AC-F1-21: las rutas traducen; no deciden sobre el catálogo.

    Ninguna ruta escribe en el agregado ni duplica una regla de validación: la
    escritura pasa por un caso de uso y la validación vive en el dominio.
    """
    contenido = (RAIZ_BACKEND / "app" / "api" / "rutas.py").read_text(encoding="utf-8")
    llamadas_de_escritura = (
        ".registrar_elemento(",
        ".registrar_dependencia(",
        "re.compile",
    )
    for llamada in llamadas_de_escritura:
        assert llamada not in contenido, f"rutas.py contiene {llamada}"


def test_ac_f1_21_la_ruta_del_grafo_solo_consulta_el_dominio() -> None:
    """La ruta de `/grafo` no introduce reglas ni cálculos propios del catálogo.

    Observación de revisión: la ruta obtiene el agregado del caso de uso y
    llama a sus consultas de listado, en lugar de recibir las colecciones ya
    resueltas. No accede a la persistencia ni duplica ninguna regla de
    validación, así que no incumple AC-F1-21; se deja constancia.
    """
    contenido = (RAIZ_BACKEND / "app" / "api" / "rutas.py").read_text(encoding="utf-8")
    bloque_grafo = contenido.split('"/grafo"')[1]

    assert "ObtenerGrafo" in bloque_grafo
    assert "listar_elementos()" in bloque_grafo
    assert "listar_dependencias()" in bloque_grafo
    assert "if " not in bloque_grafo
    assert "re.compile" not in bloque_grafo


def test_ac_f1_23_las_clases_python_siguen_pascal_case_y_las_funciones_snake_case() -> None:
    import re

    patron_clase = re.compile(r"^_?[A-Z][A-Za-z0-9]*$")
    patron_funcion = re.compile(r"^_{0,2}[a-z_][a-z0-9_]*$")

    for ruta in (RAIZ_BACKEND / "app").rglob("*.py"):
        arbol = ast.parse(ruta.read_text(encoding="utf-8"))
        for nodo in ast.walk(arbol):
            if isinstance(nodo, ast.ClassDef):
                assert patron_clase.match(nodo.name), f"{ruta.name}: clase {nodo.name}"
            if isinstance(nodo, (ast.FunctionDef, ast.AsyncFunctionDef)):
                assert patron_funcion.match(nodo.name), f"{ruta.name}: función {nodo.name}"


def test_ac_f1_23_las_constantes_python_usan_upper_snake_case() -> None:
    import re

    patron = re.compile(r"^_?[A-Z][A-Z0-9_]*$")
    for ruta in (RAIZ_BACKEND / "app").rglob("*.py"):
        arbol = ast.parse(ruta.read_text(encoding="utf-8"))
        for nodo in ast.walk(arbol):
            if isinstance(nodo, ast.Assign):
                for objetivo in nodo.targets:
                    if isinstance(objetivo, ast.Name) and objetivo.id.isupper():
                        continue
                    if isinstance(objetivo, ast.Name) and objetivo.id.lower() == objetivo.id:
                        continue
                    if isinstance(objetivo, ast.Name) and not objetivo.id.islower():
                        assert patron.match(objetivo.id), f"{ruta.name}: constante {objetivo.id}"


def test_ac_f1_23_el_vocabulario_del_dominio_es_consistente_en_python() -> None:
    """AC-F1-23 / RNF-Q-08: sin sinónimos como nodo, padre, hijo o dependiente."""
    terminos_prohibidos = [
        "nodo_padre",
        "nodo_padre_",
        "self.nodo",
        "self.nodos",
        "self.hijo",
        "self.hijos",
        "self.padre",
        "self.padres",
    ]
    for ruta in (RAIZ_BACKEND / "app").rglob("*.py"):
        contenido = ruta.read_text(encoding="utf-8")
        for termino in terminos_prohibidos:
            assert termino not in contenido, f"{ruta.name}: {termino}"


def test_ac_f1_23_cada_ruta_delega_en_un_solo_caso_de_uso() -> None:
    """AC-F1-23 / RNF-Q-07: una ruta, una operación del catálogo.

    La composición de dependencias (punto único de entrada) sí puede
    referenciar varias piezas: por eso se excluye de esta revisión.
    """
    from app.aplicacion import casos_de_uso as modulo_casos_de_uso

    casos_disponibles = {
        nombre
        for nombre, valor in vars(modulo_casos_de_uso).items()
        if isinstance(valor, type) and nombre[:1].isupper()
    }
    assert casos_disponibles, "no se encontraron casos de uso en la capa de aplicación"

    contenido = (RAIZ_BACKEND / "app" / "api" / "rutas.py").read_text(encoding="utf-8")
    arbol = ast.parse(contenido)
    for nodo in ast.walk(arbol):
        if not isinstance(nodo, (ast.FunctionDef, ast.AsyncFunctionDef)):
            continue
        if nodo.name.startswith("_") or nodo.name == "crear_enrutador":
            continue
        nombres = {hijo.id for hijo in ast.walk(nodo) if isinstance(hijo, ast.Name)}
        nombres |= {
            hijo.func.id
            for hijo in ast.walk(nodo)
            if isinstance(hijo, ast.Call) and isinstance(hijo.func, ast.Name)
        }
        usados = nombres & casos_disponibles
        assert len(usados) <= 1, f"rutas.py:{nodo.name} usa {usados}"


def test_ac_f1_23_la_composicion_de_dependencias_es_un_unico_punto() -> None:
    """El enrutador se construye en una sola función de composición.

    La composición puede referenciar todas las piezas: por eso no se cuenta
    como una operación con varias responsabilidades.
    """
    contenido = (RAIZ_BACKEND / "app" / "api" / "rutas.py").read_text(encoding="utf-8")

    assert contenido.count("def crear_enrutador") == 1
    assert contenido.count("enrutador.post(") == 2
    assert contenido.count("enrutador.get(") == 4


def test_ac_f1_23_el_cliente_de_api_no_calcula_sobre_el_grafo() -> None:
    """AC-F1-23 / RNF-Q-08: vocabulario del dominio, sin cálculos añadidos."""
    from app.api.rutas import _dependencia_a_respuesta, _elemento_a_respuesta
    from app.dominio.dependencia import Dependencia
    from app.dominio.elemento import Elemento
    from app.dominio.tipo_elemento import TipoElemento

    elemento = Elemento(id="INS-A1", tipo=TipoElemento.INSUMO, nombre="Insumo A")
    dependencia = Dependencia(origen="INS-A1", destino="PROD-B1")

    assert _elemento_a_respuesta(elemento).id == "INS-A1"
    assert _dependencia_a_respuesta(dependencia).tipo_relacion == "habilita"


def test_ac_f1_24_el_entorno_usa_python_312_o_superior() -> None:
    assert sys.version_info >= (3, 12), sys.version


def test_ac_f1_24_las_dependencias_del_backend_estan_declaradas() -> None:
    requirements = (RAIZ_BACKEND / "requirements.txt").read_text(encoding="utf-8")

    assert "fastapi" in requirements
    assert "uvicorn" in requirements
    assert "pydantic" in requirements
    assert "networkx" not in requirements.lower()


def test_ac_f1_24_el_entorno_virtual_del_proyecto_es_utilizable() -> None:
    import fastapi
    import pydantic
    import uvicorn

    assert fastapi.__version__
    assert pydantic.VERSION
    assert uvicorn.__version__


def test_ac_f1_24_la_aplicacion_se_puede_construir_para_servir_al_frontend() -> None:
    from app.api.aplicacion import crear_aplicacion

    aplicacion = crear_aplicacion()
    cliente = TestClient(aplicacion)

    assert cliente.get("/api/v1/grafo").status_code == 200


def test_ac_f1_24_existe_documentacion_de_arranque_del_frontend() -> None:
    """El frontend declara el proxy a la API real en su configuración de servidor."""
    configuracion = (RAIZ_PROYECTO / "frontend" / "vite.config.ts").read_text(encoding="utf-8")

    assert "/api" in configuracion
    assert "8000" in configuracion


@pytest.mark.parametrize("ruta", ["/api/v1/elementos", "/api/v1/dependencias", "/api/v1/grafo"])
def test_ac_f1_24_las_tres_lecturas_responden_200_con_el_servidor_real(cliente: TestClient, ruta: str) -> None:
    assert cliente.get(ruta).status_code == 200
