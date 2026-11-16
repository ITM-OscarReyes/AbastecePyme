"""Verificación HTTP de extremo a extremo de F4 (tablero, perfiles y sesión).

Comprueba el contrato de ``docs/api-contract.md`` §10 contra el servidor
levantado con ``uvicorn app.main:app``, que es el proceso que consume el
frontend. Uso:

    python tests/verificacion_http_f4.py [http://127.0.0.1:8000]

Precondición: servidor arrancado con el catálogo sintético de demostración
intacto. La verificación crea un conjunto temporal de elementos ``QA-F4-*`` y
lo elimina al terminar, de modo que el catálogo queda como estaba.

La salida declara por cada escenario qué se esperaba, qué se obtuvo y si pasó o
falló. El código de salida es 1 si algún escenario falla.
"""

import json
import sys
import time
from typing import Any
from urllib.error import HTTPError
from urllib.request import Request, urlopen

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8000"

PROV = "QA-F4-PROV"
INS_A = "QA-F4-INS-A"
INS_B = "QA-F4-INS-B"
INS_C = "QA-F4-INS-C"
INS_D = "QA-F4-INS-D"
INS_E = "QA-F4-INS-E"
INS_F = "QA-F4-INS-F"
INS_NUEVO = "QA-F4-INS-NUEVO"

TEMPORALES = (PROV, INS_A, INS_B, INS_C, INS_D, INS_E, INS_F, INS_NUEVO)

resultados: list[tuple[str, str, str, bool]] = []


def llamar(
    metodo: str,
    ruta: str,
    cuerpo: Any = None,
    cabecera: str | None = None,
) -> tuple[int, Any]:
    datos = json.dumps(cuerpo).encode("utf-8") if cuerpo is not None else None
    peticion = Request(f"{BASE}{ruta}", data=datos, method=metodo)
    if datos is not None:
        peticion.add_header("Content-Type", "application/json")
    if cabecera is not None:
        peticion.add_header("Authorization", cabecera)
    try:
        with urlopen(peticion) as respuesta:
            texto = respuesta.read().decode("utf-8")
            return respuesta.status, json.loads(texto) if texto else None
    except HTTPError as error:
        texto = error.read().decode("utf-8")
        return error.code, json.loads(texto) if texto else None


def verificar(nombre: str, esperado: str, obtenido: Any, condicion: bool) -> None:
    resultados.append((nombre, esperado, repr(obtenido), condicion))
    estado = "PASÓ" if condicion else "FALLÓ"
    print(f"[{estado}] {nombre}")
    print(f"        esperado: {esperado}")
    print(f"        obtenido: {obtenido}")


def abrir_sesion(perfil: str) -> tuple[str, int]:
    estado, cuerpo = llamar("POST", "/api/v1/sesion", {"perfil": perfil})
    token = cuerpo.get("token") if isinstance(cuerpo, dict) else None
    return (f"Bearer {token}" if token else "", estado)


def codigo_error(cuerpo: Any) -> Any:
    return cuerpo.get("error", {}).get("codigo") if isinstance(cuerpo, dict) else None


def limpiar_temporales(cabecera: str) -> None:
    for identificador in (INS_A, INS_B, INS_C, INS_D, INS_E, INS_F, INS_NUEVO, PROV):
        llamar("DELETE", f"/api/v1/elementos/{identificador}?eliminarCadena=true", None, cabecera)


def preparar_temporales(cabecera: str) -> None:
    limpiar_temporales(cabecera)
    for identificador, tipo, nombre in (
        (PROV, "PROVEEDOR", "Proveedor temporal F4"),
        (INS_A, "INSUMO", "Insumo temporal A"),
        (INS_B, "INSUMO", "Insumo temporal B"),
        (INS_C, "INSUMO", "Insumo temporal C"),
        (INS_D, "INSUMO", "Insumo temporal D"),
        (INS_E, "INSUMO", "Insumo temporal E"),
        (INS_F, "INSUMO", "Insumo temporal F"),
    ):
        estado, _ = llamar(
            "POST",
            "/api/v1/elementos",
            {"id": identificador, "tipo": tipo, "nombre": nombre},
            cabecera,
        )
        if estado != 201:
            raise RuntimeError(f"No se pudo preparar {identificador}: HTTP {estado}")
    for destino in (INS_A, INS_B):
        estado, _ = llamar(
            "POST",
            "/api/v1/dependencias",
            {"origen": PROV, "destino": destino},
            cabecera,
        )
        if estado != 201:
            raise RuntimeError(f"No se pudo preparar {PROV}->{destino}: HTTP {estado}")


def escenario_matriz(
    nombre: str,
    metodo: str,
    ruta: str,
    cuerpo: Any,
    estado_permitido: int,
    cabecera_sin: str | None,
    cabecera_produccion: str,
    cabecera_compras: str,
) -> None:
    """Comprueba sin sesión (401), PRODUCCION (403) y COMPRAS (éxito)."""
    estado, respuesta = llamar(metodo, ruta, cuerpo, cabecera_sin)
    verificar(
        f"{nombre}: sin sesión responde 401 SESION_REQUERIDA",
        "401 SESION_REQUERIDA",
        f"{estado} {codigo_error(respuesta)}",
        estado == 401 and codigo_error(respuesta) == "SESION_REQUERIDA",
    )
    estado, respuesta = llamar(metodo, ruta, cuerpo, cabecera_produccion)
    verificar(
        f"{nombre}: con PRODUCCION responde 403 PERMISO_DENEGADO",
        "403 PERMISO_DENEGADO",
        f"{estado} {codigo_error(respuesta)}",
        estado == 403 and codigo_error(respuesta) == "PERMISO_DENEGADO",
    )
    estado, _ = llamar(metodo, ruta, cuerpo, cabecera_compras)
    verificar(
        f"{nombre}: con COMPRAS se permite",
        f"{estado_permitido}",
        f"{estado}",
        estado == estado_permitido,
    )


def main() -> int:
    print("=" * 70)
    print("VERIFICACIÓN DE CRITERIOS DE ACEPTACIÓN — F4 (TABLERO Y SESIÓN)")
    print("=" * 70)

    cabecera_compras, estado_compras = abrir_sesion("COMPRAS")
    cabecera_produccion, estado_produccion = abrir_sesion("PRODUCCION")
    verificar(
        "AC-F4-07b POST /sesion crea sesión para COMPRAS y PRODUCCION",
        "201 con token en ambos perfiles",
        f"COMPRAS: {estado_compras}, PRODUCCION: {estado_produccion}",
        estado_compras == 201 and estado_produccion == 201,
    )

    # ------------------------------------------------------------------
    # AC-F4-07 / 07b / 07c — Perfiles y ciclo de sesión
    # ------------------------------------------------------------------
    estado, perfiles = llamar("GET", "/api/v1/perfiles")
    ids_perfiles = [perfil["id"] for perfil in perfiles.get("perfiles", [])] if estado == 200 else []
    verificar(
        "AC-F4-07 GET /perfiles responde 200 con COMPRAS y PRODUCCION",
        "200 con exactamente [COMPRAS, PRODUCCION]",
        f"{estado} {ids_perfiles}",
        estado == 200 and ids_perfiles == ["COMPRAS", "PRODUCCION"] and perfiles["total"] == 2,
    )
    capacidades = (
        {perfil["id"]: perfil["puedeEscribir"] for perfil in perfiles["perfiles"]}
        if estado == 200
        else {}
    )
    verificar(
        "AC-F4-07 COMPRAS escribe y PRODUCCION no",
        "COMPRAS true, PRODUCCION false",
        capacidades,
        capacidades == {"COMPRAS": True, "PRODUCCION": False},
    )

    estado, sesion_actual = llamar("GET", "/api/v1/sesion", None, cabecera_compras)
    verificar(
        "AC-F4-07b GET /sesion describe la sesión activa",
        "200 con perfil COMPRAS",
        f"{estado} {sesion_actual.get('perfil', {}).get('id') if estado == 200 else None}",
        estado == 200 and sesion_actual["perfil"]["id"] == "COMPRAS",
    )

    estado, respuesta = llamar("POST", "/api/v1/sesion", {"perfil": "NOEXISTE"})
    verificar(
        "AC-F4-07c POST /sesion con perfil inexistente responde 422 ERR-04",
        "422 VALIDACION_FALLIDA sin token",
        f"{estado} {codigo_error(respuesta)}",
        estado == 422
        and codigo_error(respuesta) == "VALIDACION_FALLIDA"
        and not (isinstance(respuesta, dict) and "token" in respuesta),
    )

    # Sesión desechable para probar el cierre sin afectar a las de la matriz.
    cabecera_desechable, _ = abrir_sesion("COMPRAS")
    estado_cierre, _ = llamar("DELETE", "/api/v1/sesion", None, cabecera_desechable)
    estado_post_cierre, respuesta_cierre = llamar(
        "GET", "/api/v1/sesion", None, cabecera_desechable
    )
    verificar(
        "AC-F4-07b DELETE /sesion responde 204 e invalida el token",
        "204 y luego 401 SESION_REQUERIDA",
        f"{estado_cierre} y luego {estado_post_cierre} {codigo_error(respuesta_cierre)}",
        estado_cierre == 204
        and estado_post_cierre == 401
        and codigo_error(respuesta_cierre) == "SESION_REQUERIDA",
    )

    # ------------------------------------------------------------------
    # AC-F4-08 / 08b / 08c / 08d — Matriz de autorización de escrituras
    # ------------------------------------------------------------------
    try:
        preparar_temporales(cabecera_compras)

        escenario_matriz(
            "AC-F4-08 POST /elementos",
            "POST",
            "/api/v1/elementos",
            {"id": INS_NUEVO, "tipo": "INSUMO", "nombre": "Insumo temporal nuevo"},
            201,
            None,
            cabecera_produccion,
            cabecera_compras,
        )
        escenario_matriz(
            "AC-F4-08d PUT /elementos/{id}",
            "PUT",
            f"/api/v1/elementos/{INS_A}",
            {"nombre": "Insumo temporal A editado"},
            200,
            None,
            cabecera_produccion,
            cabecera_compras,
        )
        escenario_matriz(
            "AC-F4-08d DELETE /elementos/{id}",
            "DELETE",
            f"/api/v1/elementos/{INS_C}",
            None,
            204,
            None,
            cabecera_produccion,
            cabecera_compras,
        )
        escenario_matriz(
            "AC-F4-08d POST /dependencias",
            "POST",
            "/api/v1/dependencias",
            {"origen": PROV, "destino": INS_F},
            201,
            None,
            cabecera_produccion,
            cabecera_compras,
        )
        escenario_matriz(
            "AC-F4-08d PUT /dependencias/{origen}/{destino}",
            "PUT",
            f"/api/v1/dependencias/{PROV}/{INS_A}",
            {"origen": PROV, "destino": INS_E},
            200,
            None,
            cabecera_produccion,
            cabecera_compras,
        )
        escenario_matriz(
            "AC-F4-08d DELETE /dependencias/{origen}/{destino}",
            "DELETE",
            f"/api/v1/dependencias/{PROV}/{INS_B}",
            None,
            204,
            None,
            cabecera_produccion,
            cabecera_compras,
        )

        # AC-F4-08f — Tras una denegación el catálogo no cambia.
        _, grafo_antes = llamar("GET", "/api/v1/grafo")
        totales_antes = (
            grafo_antes["resumen"]["totalElementos"],
            grafo_antes["resumen"]["totalDependencias"],
        )
        llamar(
            "POST",
            "/api/v1/elementos",
            {"id": "QA-F4-DENEGADO", "tipo": "INSUMO", "nombre": "Denegado"},
            cabecera_produccion,
        )
        llamar("DELETE", f"/api/v1/elementos/{INS_D}", None, cabecera_produccion)
        _, grafo_despues = llamar("GET", "/api/v1/grafo")
        totales_despues = (
            grafo_despues["resumen"]["totalElementos"],
            grafo_despues["resumen"]["totalDependencias"],
        )
        verificar(
            "AC-F4-08f el catálogo queda intacto tras peticiones denegadas",
            f"totales {totales_antes} sin cambios",
            f"{totales_despues}",
            totales_antes == totales_despues,
        )
    finally:
        limpiar_temporales(cabecera_compras)

    # ------------------------------------------------------------------
    # AC-F4-08e — Lecturas abiertas con cualquier sesión
    # ------------------------------------------------------------------
    lecturas = (
        "/api/v1/elementos",
        "/api/v1/elementos/PROV-ACERO",
        "/api/v1/dependencias",
        "/api/v1/grafo",
        "/api/v1/reglas-dependencia",
        "/api/v1/impacto/INS-TORNILLO",
        "/api/v1/plan-entrega?productos=PROD-MESA-TRABAJO",
        "/api/v1/orden-produccion",
    )
    for ruta in lecturas:
        for etiqueta, cabecera in (
            ("sin sesión", None),
            ("COMPRAS", cabecera_compras),
            ("PRODUCCION", cabecera_produccion),
        ):
            estado, _ = llamar("GET", ruta, None, cabecera)
            verificar(
                f"AC-F4-08e GET {ruta} ({etiqueta})",
                "200",
                f"{estado}",
                estado == 200,
            )

    # ------------------------------------------------------------------
    # AC-F4-02 / 03 / 04 / 05 — Composición del tablero sobre la demostración
    # ------------------------------------------------------------------
    _, grafo = llamar("GET", "/api/v1/grafo")
    resumen = grafo["resumen"]
    verificar(
        "AC-F4-02 el tablero compone los totales de GET /grafo",
        "27 elementos y 37 dependencias",
        f"{resumen['totalElementos']} elementos, {resumen['totalDependencias']} dependencias",
        resumen == {"totalElementos": 27, "totalDependencias": 37},
    )

    estado, impacto = llamar("GET", "/api/v1/impacto/INS-TORNILLO")
    verificar(
        "AC-F4-04 GET /impacto devuelve afectados reales",
        "200 con al menos un afectado y total coherente",
        f"{estado}, total: {impacto.get('total') if estado == 200 else None}",
        estado == 200
        and impacto["total"] == len(impacto["afectados"])
        and impacto["total"] > 0,
    )

    estado, diagnostico = llamar("GET", "/api/v1/orden-produccion")
    verificar(
        "AC-F4-05 GET /orden-produccion es DAG sobre la demostración",
        "200 con esDag true y productos planificables",
        f"{estado}, esDag: {diagnostico.get('esDag') if estado == 200 else None}",
        estado == 200
        and diagnostico["esDag"] is True
        and len(diagnostico["productosPlanificables"]) > 0,
    )

    # ------------------------------------------------------------------
    # AC-F4-14 — Rendimiento de la composición
    # ------------------------------------------------------------------
    inicio = time.perf_counter()
    llamar("GET", "/api/v1/grafo")
    llamar("GET", "/api/v1/impacto/INS-TORNILLO")
    llamar("GET", "/api/v1/plan-entrega?productos=PROD-MESA-TRABAJO")
    llamar("GET", "/api/v1/orden-produccion")
    duracion_ms = (time.perf_counter() - inicio) * 1000
    verificar(
        "AC-F4-14 las cuatro consultas del tablero responden en menos de 2 s",
        "< 2000 ms",
        f"{duracion_ms:.1f} ms",
        duracion_ms < 2000.0,
    )

    # ------------------------------------------------------------------
    # Resumen
    # ------------------------------------------------------------------
    aprobados = sum(1 for _, _, _, paso in resultados if paso)
    print()
    print("=" * 70)
    print(f"RESUMEN: {aprobados}/{len(resultados)} escenarios PASARON")
    print("=" * 70)
    return 0 if aprobados == len(resultados) else 1


if __name__ == "__main__":
    sys.exit(main())
