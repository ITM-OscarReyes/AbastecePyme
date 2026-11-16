# Reporte QA — Feature 4 (F4: Tablero de abastecimiento)

Fecha: 2026-11-15
Rama: `f4-supply-dashboard`
Commit verificado: `51e848f` (merge de la implementación F4)
Tester: `tester` (único autorizado a declarar PASS/FAIL)

## 1) Funcionalidades F4 identificadas

F4 **integra** F1, F2 y F3 en una única vista de demostración. No añade algoritmos ni endpoints de
cálculo; compone y presenta respuestas ya calculadas por el backend. Las funcionalidades
verificadas, derivadas de `docs/requirements.md` §13, `docs/acceptance-criteria.md` §11,
`docs/api-contract.md` §10 y `docs/architecture.md` §10, son:

| # | Funcionalidad | Requisito | Criterios |
| - | ------------- | --------- | --------- |
| 1 | Vista inicial «Tablero» y navegación de cinco secciones, usable de 360 a 1920 px | RF-F4-01 | AC-F4-01, AC-F4-01b |
| 2 | Composición real de grafo, impacto, plan y diagnóstico sin endpoints nuevos | RF-F4-02, RNF-F4-01 | AC-F4-02, AC-F4-02b |
| 3 | Resumen de la cadena con totales, clasificación de productos y alerta de stock | RF-F4-03 | AC-F4-03, AC-F4-03b, AC-F4-03c |
| 4 | Consulta de impacto desde el tablero (afectados, producto terminal, inexistente, backend caído) | RF-F4-04 | AC-F4-04, AC-F4-04b, AC-F4-04c, AC-F4-04d |
| 5 | Plan de entrega y diagnóstico global, incluida la alerta de ciclo | RF-F4-05 | AC-F4-05, AC-F4-05b, AC-F4-05c |
| 6 | Red dirigida `origen habilita destino` con leyenda | RF-F4-06 | AC-F4-06 |
| 7 | Perfiles de demostración y ciclo de sesión en memoria | RF-F4-07, RNF-F4-03 | AC-F4-07, AC-F4-07b, AC-F4-07c, AC-F4-07d |
| 8 | Autorización de las seis rutas de escritura por perfil | RF-F4-08, RNF-F4-02 | AC-F4-08, AC-F4-08b..f |
| 9 | Interfaz condicionada por perfil (acciones y mensajes de permiso) | RF-F4-09 | AC-F4-09, AC-F4-09b, AC-F4-09c, AC-F4-09d |
| 10 | Resaltado del elemento y de sus afectados / requisitos en la red | RF-F4-10 | AC-F4-10, AC-F4-10b |
| 11 | Cuatro escenarios de aceptación sobre el backend real | RF-F4-11, RNF-F4-03 | AC-F4-11, AC-F4-11b..e |
| 12 | Entregables documentales de F4 | RF-F4-12 | AC-F4-12, AC-F4-12b, AC-F4-12c |
| 13 | Lenguaje, temas, rendimiento (<2 s) y separación de capas | RF-F4-13, RNF-F4-04, RNF-F4-05 | AC-F4-13, AC-F4-13b, AC-F4-13c, AC-F4-14, AC-F4-15 |

No se modificó código de producción. Todos los cambios son de pruebas y de documentación de
verificación.

## 2) Archivos de prueba creados o modificados

Solo se crearon archivos de prueba nuevos de F4. No se modificó ningún archivo de prueba de F1, F2
o F3, ni `backend/tests/conftest.py`.

| Archivo | Tipo | Estado | Contenido |
| ------- | ---- | ------ | --------- |
| `backend/tests/test_tablero_f4_qa.py` | pytest (backend) | Nuevo | 79 casos (78 PASS, 1 `xfail(strict)`) sobre perfiles, sesión, autorización de escrituras, composición del tablero, impacto, plan/diagnóstico, rendimiento y arquitectura. |
| `backend/tests/verificacion_http_f4.py` | script HTTP (`urllib`) | Nuevo | 53 escenarios de extremo a extremo contra `uvicorn` real en `127.0.0.1:8000`. |
| `frontend/src/test/tableroF4.test.ts` | vitest (frontend) | Nuevo | 19 pruebas con dobles autocontenidos del cliente de API (sin backend levantado). |
| `frontend/e2e/f4.spec.ts` | Playwright (E2E) | Nuevo | 14 pruebas en Chromium contra Vite (3000) y FastAPI (8000) reales. |
| `docs/entrega/reporte-qa-f4.md` | Documento | Nuevo | Este reporte. |
| `docs/decisions/tester.md` | Documento | Modificado | Decisiones de estrategia de verificación de F4 (se anexan al archivo del `tester`). |

Los conjuntos sintéticos (§11.1) se reutilizan: Conjunto A (cadena válida), Conjunto B (ciclo),
Conjunto E (`PROD-SOLO`) y Conjunto F (`PROD-A/B/C`), además del catálogo de demostración de 27
elementos y 37 dependencias. Las pruebas de F4 autentican sus propias escrituras; no dependen de
`conftest.py`.

## 3) Casos de prueba y qué valida cada uno

### 3.1 Backend — `backend/tests/test_tablero_f4_qa.py`

| Caso | Criterio | Qué valida |
| ---- | -------- | ---------- |
| `test_qa_ac_f4_07_perfiles_dos_y_su_capacidad_de_escritura` | AC-F4-07 | `GET /perfiles` → `200` con exactamente `COMPRAS` («Responsable de compras», escritura) y `PRODUCCION` («Coordinador de producción», solo lectura). |
| `test_qa_ac_f4_07_perfiles_no_requiere_sesion` | AC-F4-07 | `/perfiles` es lectura abierta. |
| `test_qa_ac_f4_07b_crear_consultar_y_cerrar_sesion` | AC-F4-07b | `POST /sesion` → `201` con token opaco; `GET /sesion` describe la sesión; `DELETE /sesion` → `204` e invalida el token. |
| `test_qa_ac_f4_07b_sesion_produccion_sin_permiso_de_escritura` | AC-F4-07b | La sesión de `PRODUCCION` se crea pero no habilita escritura. |
| `test_qa_ac_f4_07b_cerrar_sesion_repetido_o_sin_token_falla` | AC-F4-07b | Cerrar sesión sin token o dos veces → `401 ERR-11`. |
| `test_qa_ac_f4_07c_perfil_invalido_responde_422_sin_crear_sesion` | AC-F4-07c | Perfil inexistente → `422 ERR-04`. |
| `test_qa_ac_f4_07c_perfil_invalido_no_queda_autenticado` | AC-F4-07c | Tras el error no se emite token utilizable. |
| `test_qa_ac_f4_07d_token_deja_de_ser_valido_tras_reiniciar_el_backend` | AC-F4-07d | Una instancia nueva de la aplicación rechaza el token anterior (sesión en memoria). |
| `test_qa_extraccion_token_*` (3) | RF-F4-07 | El esquema `Bearer` es case-insensitive, tolera espacios extra y una cabecera inválida → `401`. |
| `test_qa_ac_f4_08_sin_sesion_responde_401` | AC-F4-08 | `POST /elementos` sin sesión → `401 ERR-11`; el catálogo no cambia. |
| `test_qa_ac_f4_08b_con_produccion_responde_403` | AC-F4-08b | `POST /elementos` con `PRODUCCION` → `403 ERR-12`; el catálogo no cambia. |
| `test_qa_ac_f4_08c_con_compras_escribe` | AC-F4-08c | `POST /elementos` con `COMPRAS` → `201` y crea el elemento. |
| `test_qa_ac_f4_08d_token_desconocido_responde_401_en_toda_escritura` | AC-F4-08d | La matriz sin sesión/`PRODUCCION`/`COMPRAS` se aplica a las seis rutas de escritura (`POST/PUT/DELETE` de elementos y dependencias). |
| `test_qa_ac_f4_08e_lecturas_abiertas` | AC-F4-08e | Las ocho rutas de lectura responden sin sesión y con ambos perfiles. |
| `test_qa_ac_f4_08f_catalogo_intacto_tras_denegar_escrituras` | AC-F4-08f | Tras las denegaciones, elementos y dependencias siguen siendo exactamente los mismos. |
| `test_qa_ac_f4_08f_denegacion_no_crea_elemento_ni_relacion` | AC-F4-08f | Una denegación concreta no persiste el recurso. |
| `test_observacion_content_type_se_valida_antes_que_la_autorizacion` | Observación | Registra que `_verificar_content_type_json` corre antes que `_autorizar_escritura`: sin `Content-Type` y sin sesión → `400 ERR-03`, no `401`. |
| `test_qa_ac_f4_02_el_tablero_compone_grafo_impacto_plan_y_diagnostico` | AC-F4-02 | Las cuatro consultas que compone el tablero (`/grafo`, `/impacto`, `/plan-entrega`, `/orden-produccion`) responden `200` y son suficientes para el tablero; no hay endpoint agregador. |
| `test_qa_ac_f4_02_catalogo_de_demostracion_totales_documentados` | AC-F4-02 | El catálogo de demostración tiene 27 elementos y 37 dependencias. |
| `test_qa_ac_f4_03_resumen_clasifica_productos_planificables` | AC-F4-03 | El resumen clasifica los productos planificables de acuerdo con `/orden-produccion`. |
| `test_qa_ac_f4_04_impacto_de_ins_barra_coincide_con_la_api` | AC-F4-04 | El impacto coincide con `/impacto/{id}` en total y orden por `id`. |
| `test_qa_ac_f4_04b_producto_terminal_sin_afectados` | AC-F4-04b | Un producto terminal devuelve `total: 0` con `afectados: []`, distinto de «no existe». |
| `test_qa_ac_f4_04c_impacto_de_elemento_inexistente_falla` | AC-F4-04c | Id inexistente → `404 ERR-02`, sin lista vacía ni plan inventado. |
| `test_qa_ac_f4_05_plan_y_diagnostico_del_conjunto_a` | AC-F4-05 | Con el Conjunto A el plan tiene 5 pasos y el diagnóstico `esDag: true` con el orden completo. |
| `test_qa_ac_f4_05b_conjunto_b_alerta_de_ciclo_sin_orden_falso` | AC-F4-05b | Con el Conjunto B se reporta el ciclo y no se devuelve orden parcial. |
| `test_qa_ac_f4_05c_conjunto_e_producto_sin_requisitos_un_paso` | AC-F4-05c | **`xfail(strict)`**: el criterio exige un plan de un paso para `PROD-SOLO`; la implementación lo marca `INCOMPLETO` con `pasos: []` (contradicción F3 §5.1). |
| `test_observacion_ac_f4_05c_estado_actual_producto_aislado` | Observación | Registra el comportamiento real de un producto aislado (`esDag:true`, `orden:[]`, `estado:INCOMPLETO`, `pasos:[]`) sin convertirlo en criterio. |
| `test_qa_ac_f4_14_composicion_del_tablero_en_menos_de_2s` | AC-F4-14 | La composición de las cuatro consultas responde en menos de 2 s sobre la demostración. |
| `test_qa_ac_f4_15_las_seis_rutas_de_escritura_autorizan` | AC-F4-15 | La autorización vive en el backend: las seis rutas de escritura la aplican. |
| `test_qa_ac_f4_15_la_logica_de_sesion_no_vive_en_la_capa_http` | AC-F4-15 | La sesión/perfil se resuelve en una capa distinta de los manejadores HTTP (separación de capas). |

### 3.2 HTTP real — `backend/tests/verificacion_http_f4.py` (53 escenarios)

Contra un `uvicorn` real, sin dobles: perfiles y ciclo de sesión (AC-F4-07/07b/07c), matriz de
autorización de las seis rutas de escritura en los tres estados de sesión (AC-F4-08/08b/08c/08d),
catálogo intacto tras denegaciones (AC-F4-08f), ocho lecturas abiertas con tres estados (AC-F4-08e),
composición del tablero sobre la demostración (AC-F4-02/04/05) y rendimiento (AC-F4-14).

### 3.3 Frontend — `frontend/src/test/tableroF4.test.ts` (19 pruebas)

| Caso | Criterio | Qué valida |
| ---- | -------- | ---------- |
| muestra el diagnóstico y el plan de `PROD-PANEL` | AC-F4-02/05 | `VistaTablero` llama a `obtenerOrdenProduccion`/`obtenerPlanEntrega` y pinta diagnóstico, plan y 5 operaciones. |
| consulta de impacto muestra los afectados | AC-F4-04 | El bloque de impacto refleja el total y los afectados de la API. |
| alerta de stock del backend | AC-F4-03c | «1 bajo mín.» proviene del backend; el frontend no recalcula. |
| catálogo vacío | AC-F4-03b | Estado vacío comprensible sin productos de ejemplo. |
| ciclo sin orden falso | AC-F4-05b | Alerta de ciclo y «Bloqueado», sin «Cadena sin dependencias circulares». |
| error aislado por bloque | AC-F4-14 | El fallo del diagnóstico no oculta el plan. |
| impacto no disponible | AC-F4-04d | Si la API falla, «No se pudo evaluar el impacto:» y ninguna lista de afectados simulada. |
| estados con texto | AC-F4-13c | Stock, plan y diagnóstico llevan etiqueta textual además del color. |
| sin permiso deshabilita acciones | AC-F4-09 | «Nuevo Componente» y «Crear relación» deshabilitados. |
| mensaje de permiso | AC-F4-09d | El mensaje nombra el perfil de compras y no muestra códigos HTTP. |
| con permiso habilita acciones | AC-F4-09b | Las acciones de escritura se habilitan y disparan sus modales. |
| selector de perfil | AC-F4-09c | Muestra el perfil activo y permite cambiarlo. |
| selector con `PRODUCCION` | AC-F4-09c | Indica «Solo consulta». |
| token Bearer | AC-F4-09b / RNF-F4-02 | El interceptor inyecta `Authorization: Bearer` y lo retira al cerrar sesión. |
| `crearSesion` guarda el token | AC-F4-07b | El token devuelto se conserva en memoria. |
| `VistaTablero` no calcula | AC-F4-02b | Revisión estática: consume servicios y no contiene Kahn/SCC/DFS/topológico. |
| frontend solo refleja el permiso | AC-F4-15 | `HeaderNavbar` usa `disabled={!puedeEscribir}` y no decide la autorización. |
| `App` delega en el cliente | AC-F4-15 | Perfiles y sesión se delegan en el cliente de API. |
| sin códigos HTTP | AC-F4-13 | Los componentes de F4 no muestran `401`/`403`. |

### 3.4 E2E — `frontend/e2e/f4.spec.ts` (14 pruebas)

| Caso | Criterio | Qué valida |
| ---- | -------- | ---------- |
| sección activa y cinco secciones | AC-F4-01 | Al abrir, la sección activa es «Tablero» y hay cinco secciones. |
| totales reales del backend | AC-F4-02/03 | Los totales por tipo y de red coinciden con `/grafo` y `/orden-produccion`. |
| alerta de stock | AC-F4-03c | Los insumos en alerta del backend se señalan. |
| plan y diagnóstico | AC-F4-05 | Plan del primer producto (pasos y códigos) y diagnóstico global reales. |
| impacto real | AC-F4-04 | El total y los afectados coinciden con `/impacto/INS-BARNIZ`. |
| producto terminal | AC-F4-04b | «0 afectados» y mensaje que distingue de «no existe». |
| red dirigida | AC-F4-06 | Leyenda «Relaciones origen habilita destino» y flechas `origen → destino` con etiqueta «habilita». |
| resaltado de impacto | AC-F4-10 | El elemento consultado y exactamente sus afectados quedan resaltados en la red. |
| línea del producto | AC-F4-10b | Los requisitos resaltados coinciden con los pasos del plan de la API. |
| perfil condiciona acciones | AC-F4-09/09c | Cambiar a `PRODUCCION` deshabilita la escritura con mensaje de permiso; volver a `COMPRAS` la habilita. |
| sin términos prohibidos | AC-F4-13 | Ni términos técnicos prohibidos ni códigos HTTP en el texto visible. |
| tema claro/oscuro | AC-F4-13b | Un único control alterna `dark`. |
| 360–1920 px | AC-F4-01b | Sin desborde horizontal en cinco anchos. |
| menú móvil | AC-F4-01b | Las cinco secciones son alcanzables a 360 px. |

## 4) Resultados de ejecución

| Ámbito | Ejecutadas | PASS | FAIL | BLOCKED | Evidencia |
| --- | ---: | ---: | ---: | ---: | --- |
| Backend QA F4 — `test_tablero_f4_qa.py` | 79 | 78 | 0 | 1 | `pytest --junitxml` → 79 tests, 0 failures, 1 skipped (2.1 s) |
| HTTP real F4 — `verificacion_http_f4.py` | 53 | 53 | 0 | 0 | `python tests/verificacion_http_f4.py` → 53/53 PASÓ (catálogo limpio 27/37) |
| Frontend unitarias F4 — `tableroF4.test.ts` | 19 | 19 | 0 | 0 | `npx vitest run src/test/tableroF4.test.ts` → 19 passed (0.8 s) |
| Frontend E2E F4 — `e2e/f4.spec.ts` | 14 | 14 | 0 | 0 | `npx playwright test e2e/f4.spec.ts` → 14 passed (21.8 s) |
| Backend regresión completa — `python -m pytest` | 288 | 235 | 49 | 4 | `pytest --junitxml` → 288 tests, 49 failures, 4 skipped (7.8 s), exit 1 |
| Frontend vitest completo — `npx vitest run` | 66 | 47 | 0 | 19 | 5 archivos, 1 suite fallida, 47 passed, 19 skipped (3.8 s), exit 1 |
| Frontend E2E completo — `npx playwright test` | 40 | 33 | 7 | 0 | 33 passed, 7 failed (2.0 m), exit 1 |

El único BLOCKED es `AC-F4-05c`, codificado como `xfail(strict=True)`: el criterio exige un plan de
un paso para `PROD-SOLO`, pero F3 devuelve `INCOMPLETO` con `pasos: []` (contradicción documentada
en `docs/entrega/reporte-qa-f3.md` §5.1). No es una omisión: el caso se ejecuta y falla de forma
controlada.

**Los 49 fallos de la regresión de backend y los 7 fallos del E2E completo son preexistentes, no de
F4, y no se corrigieron.** Se detallan en §5. Ninguna suite de F4 falla.

## 5) Errores encontrados y causa probable

### 5.1 Regresiones preexistentes atribuibles a F4 (reportadas, no corregidas)

F4 introduce autorización en las rutas de escritura y cambia la sección inicial a «Tablero». Eso
rompe pruebas antiguas que asumían escrituras abiertas o la sección inicial «Cadena de suministro».
No se modificó ningún archivo de prueba de F1/F2/F3.

| Origen | Pruebas que fallan | Causa | Detalle |
| ------ | ------------------ | ----- | ------- |
| `test_alta_elementos.py`, `test_dependencias.py`, `test_gestion_inventario_y_relaciones.py`, `test_grafo.py`, `test_no_funcional_y_arquitectura.py`, `test_validacion_y_errores.py` | 49 | Escriben sin sesión y esperan `201`/`409`/`422`; ahora reciben `401 ERR-11` | Las suites de F1 usan `conftest.py`, que hace `POST` sin `Authorization`. F4 exige sesión `COMPRAS`. |
| `frontend/src/test/api.test.ts` | 1 suite | `crearElemento` sin sesión recibe `401` | Prueba de integración de F1 que asume escritura abierta. |
| `frontend/e2e/f1.spec.ts` | 3 | La sección inicial es «Tablero», no el lienzo | «los KPI coinciden…», «el lienzo dibuja…» y «cada flecha va de origen a destino» no navegan a «Cadena de suministro», por lo que no encuentran el `canvas`. |
| `frontend/e2e/f3.spec.ts` | 4 | 2 crean un ciclo por API sin sesión (`401`); 2 son los FAIL ya reportados de F3 | `AC-F3-10b` (×2) por `POST /dependencias` sin sesión; `AC-UI-01` («determinista» en la guía) y `AC-UI-04b` (faltan «productos planificables»), ambos ya documentados en `reporte-qa-f3.md`. |

Estas regresiones no invalidan F4, pero deben resolverse en un ciclo coordinado por `orchestrator`:
las suites de F1/F2/F3 necesitan autenticar sus escrituras y navegar explícitamente a la sección que
prueban.

### 5.2 Observación — `GraphCanvas` calcula la línea del producto en el cliente

- Criterio relacionado: AC-F4-10b («se resaltan sus requisitos según los pasos devueltos por la API,
  **sin que el frontend calcule el subgrafo**»).
- Evidencia: `frontend/src/components/GraphCanvas.tsx:174-188` calcula `nodosLineaFiltro` con un
  recorrido hacia atrás (`destino → origen`) sobre las dependencias, y lo usa para aislar/atenuar la
  cadena (`:209-219`). El archivo fue modificado por F4 en el commit `b27efda` («…aislar cadena en
  mapa…»).
- Resultado: el **efecto visible** es correcto — la prueba E2E `AC-F4-10b` confirma que los nodos
  resaltados coinciden exactamente con los pasos de `GET /plan-entrega` — pero el conjunto se
  **recalcula en el cliente** en lugar de derivarse de los pasos ya devueltos por la API. La
  revisión estática `AC-F4-02b`/`AC-F4-15` solo inspecciona `VistaTablero`, `HeaderNavbar` y
  `App`, por lo que no lo detecta.
- Clasificación: **PASS con observación** en AC-F4-10b. Es una posible duplicación de un algoritmo
  de recorrido en el frontend (prohibida por `AGENTS.md` y por la letra de AC-F4-10b). Se reporta
  para decisión de `analyst`/`auditor`; no se modificó código de producción.

### 5.3 Observación — orden de validación `Content-Type` antes que autorización

`test_observacion_content_type_se_valida_antes_que_la_autorizacion` documenta que, en las rutas con
cuerpo, `_verificar_content_type_json` corre antes que `_autorizar_escritura`. Una petición sin
`Content-Type` y sin sesión recibe `400 ERR-03`, no `401 ERR-11`. El contrato no especifica el orden
entre ambos errores; se registra el comportamiento real sin declararlo criterio.

## 6) Cobertura

- **Criterios de F4 evaluados:** 40 de 40 (AC-F4-01 a AC-F4-15c). Recuento: **38 PASS · 1 PASS con
  observación · 1 BLOCKED · 0 FAIL**.
- **Criterios de interfaz reutilizados:** AC-UI-01 y AC-UI-04b (regresión de F3) siguen en FAIL,
  ajenos a F4 y ya documentados.
- **Cobertura funcional:** vista inicial y responsive; composición real de grafo/impacto/plan/
  diagnóstico; resumen y alerta de stock; impacto (afectados, terminal, inexistente, no
  disponibilidad); plan y ciclo; red dirigida y resaltado; perfiles y sesión; matriz de autorización
  de las seis rutas de escritura; interfaz por perfil; lenguaje, temas, rendimiento y separación de
  capas.
- **Cobertura de integración:** regresión completa del backend (F1/F2/F3 + F4) y E2E completo de F1,
  F2, F3 y F4. El script HTTP de F4 verifica el contrato sobre el servidor real que consume el
  cliente.
- **Herramientas:** `pytest` 9.1.1 (`--junitxml` para los conteos), `vitest` 3.2.7 y Playwright con
  Chromium. `requirements.txt` no declara dependencias de prueba; se usan las instaladas
  globalmente (Python 3.14.7, Node 24.18.0).
- **No hay medición de cobertura de líneas:** el proyecto no configura `coverage`/`nyc`; no se
  añadió herramienta para no alterar el entorno.

## 7) Requisitos F4 no verificados y por qué

| Criterio | Estado | Motivo |
| -------- | ------ | ------ |
| AC-F4-05c | BLOCKED (`xfail`) | Contradicción documental de F3 (`INCOMPLETO`) que impide el plan de un paso de `PROD-SOLO`. Requiere decisión de `analyst`. |
| AC-F4-12 | No verificado por `tester` | Es coherencia documental entre siete documentos; corresponde a `auditor`, no a una prueba ejecutable del `tester`. |
| AC-F4-12b | Verificado por inspección | `docs/entrega/bitacora-ia-f4.md` existe. No se escribió una prueba automatizada de existencia de entregables para no fijar como contrato una ruta de documentación. |
| AC-F4-12c | Verificado por inspección | `docs/entrega/guia-exposicion-f4.md` existe y describe los cuatro escenarios. Misma razón que 12b. |
| AC-F4-11c | PASS con evidencia reutilizada | La interfaz ya muestra los errores de dato duplicado/mal formado y no inventa datos; lo cubren las pruebas E2E de F1 «el duplicado de elemento se muestra como error del backend» y «un rechazo del backend se muestra sin inventar datos», que pasan en la corrida completa. No se duplicó el escenario en F4. |

Todos los demás criterios de F4 tienen al menos un escenario propio ejecutado. No hubo pruebas
inejecutables por entorno: backend, Vite, Playwright y el script HTTP arrancaron correctamente.

## 8) Conclusión

**F4 se declara PASS: 38 PASS · 1 PASS con observación · 1 BLOCKED · 0 FAIL sobre 40 criterios.**

El tablero integra F1, F2 y F3 con datos reales: composición de las cuatro consultas sin endpoints
nuevos, resumen y alerta de stock, impacto (incluido terminal, inexistente y backend caído), plan y
alerta de ciclo, red dirigida con leyenda y resaltado, perfiles y sesión en memoria, matriz de
autorización de las seis rutas de escritura, interfaz condicionada por perfil, lenguaje, temas,
rendimiento (<2 s) y separación de capas. Las 79 pruebas de backend (78 PASS + 1 `xfail`), los 53
escenarios HTTP, las 19 pruebas de frontend y las 14 pruebas E2E de F4 pasan.

Pendientes y observaciones:

1. **AC-F4-05c (BLOCKED):** depende de la decisión de `analyst` sobre el estado `INCOMPLETO` de F3.
2. **AC-F4-10b (observación):** `GraphCanvas` recalcula la línea del producto en el cliente
   (`GraphCanvas.tsx:174-188`), aunque el resultado visible coincide con el plan de la API.
3. **Regresiones preexistentes:** 49 pruebas de backend de F1 y las pruebas E2E de F1/F3 que asumen
   escrituras abiertas o la sección inicial antigua fallan; requieren un ciclo de corrección
   coordinado por `orchestrator` sin tocar el comportamiento de F4.
