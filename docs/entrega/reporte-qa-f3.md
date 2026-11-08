# Reporte QA — Feature 3 (F3: Orden de producción y ciclos)

Fecha: 2026-11-08  
Rama: `f3-order-and-cycles`  
Commit verificado: `76e6ef2` (merge de la implementación F3)  
Tester: `tester` (único autorizado a declarar PASS/FAIL)

## 1) Alcance de la verificación

Se verificó la versión de F3 incorporada en el pull reciente, con el contrato nuevo de dos consultas:

- `GET /api/v1/orden-produccion` — diagnóstico global; un ciclo es un resultado de negocio y la
  respuesta es siempre `200`.
- `GET /api/v1/plan-entrega?productos=A,B` — plan de preparación por producto o conjunto de
  productos.

Se re-ejecutaron las pruebas de F3, la regresión completa del backend, la integración del cliente de
API, la arquitectura estática del frontend, las pruebas E2E de F1/F2/F3 y el estado de catálogo vacío.
No se modificó código de producción. Los cambios realizados son exclusivamente de pruebas y
documentación de verificación.

## 2) Total de pruebas ejecutadas

| Ámbito | Ejecutadas | PASS | FAIL | BLOCKED | Evidencia |
| --- | ---: | ---: | ---: | ---: | --- |
| Backend QA F3 — `backend/tests/test_orden_produccion_f3_qa.py` | 27 | 24 | 0 | 3 | `python -m pytest tests/test_orden_produccion_f3_qa.py -v` → 24 passed, 3 xfailed (0.82 s) |
| Backend regresión completa — `python -m pytest` | 209 | 206 | 0 | 3 | `python -m pytest -v` → 206 passed, 3 xfailed (5.92 s), exit 0 |
| HTTP real F3 — `backend/tests/verificacion_http_f3.py` | 22 | 22 | 0 | 0 | `python tests/verificacion_http_f3.py` → 22/22 escenarios PASÓ, exit 0 |
| Frontend unitarias/arquitectura — `npm test` | 39 | 39 | 0 | 0 | 3 archivos, 39 passed (2.49 s) |
| Frontend E2E F3 — `npx playwright test e2e/f3.spec.ts` | 7 | 4 | 3 | 0 | 4 passed, 3 failed (20.9 s) |
| Frontend E2E completo — `npx playwright test` | 26 | 23 | 3 | 0 | 23 passed, 3 failed (45.8 s) |
| Frontend E2E catálogo vacío — `npm run test:e2e:vacio` | 5 | 5 | 0 | 0 | 5 passed (7.8 s) |
| Compilación frontend — `npm run build` | 1 | 1 | 0 | 0 | `tsc -b && vite build` exitoso (solo advertencia de tamaño de chunk) |

Los 3 `xfailed` del backend son fallos esperados con `xfail(strict=True)`: documentan una
contradicción entre la implementación y los criterios escritos. No son omisiones ni pruebas
saltadas; los 27 casos se ejecutaron. Se contabilizan como **BLOCKED** porque el criterio no puede
declararse PASS hasta que `analyst` resuelva la contradicción.

## 3) Matriz de criterios de aceptación

Criterios de `docs/acceptance-criteria.md` §8 (F3) y criterios de interfaz aplicables de §10.

| Criterio | Descripción | Resultado | Evidencia |
| --- | --- | --- | --- |
| AC-F3-01 | Diagnóstico global en DAG con Conjunto A | **PASS** | `test_qa_ac_f3_01_diagnostico_global_dag_conjunto_a`, `test_qa_ac_f3_01_precedencias_origen_antes_que_destino`; HTTP AC-F3-01 (orden, 27/27 pasos, precedencias 37/37). |
| AC-F3-01b | Catálogo vacío es DAG trivial | **PASS** | `test_qa_ac_f3_01b_catalogo_vacio_es_dag_trivial`; `GET /orden-produccion` → 200, `orden: []`, `totalPasos: 0`. |
| AC-F3-01c | Conjunto F: productos aislados ordenados | **BLOCKED** | `test_qa_ac_f3_01c_conjunto_f_productos_aislados_se_ordenan` → `xfail(strict)`; la implementación devuelve `orden: []` y marca los productos `INCOMPLETO`. Contradicción §5.1. |
| AC-F3-01d | Conjunto C: intercalado por `id` | **PASS** | `test_qa_ac_f3_01d_conjunto_c_intercala_listos_por_id`. |
| AC-F3-02 | Determinismo estricto y desempate por `id` | **PASS** | `test_qa_ac_f3_02_diez_llamadas_y_orden_de_registro_no_alteran_el_orden`; HTTP determinismo en 10 llamadas. |
| AC-F3-03 | Ciclo simple: 200, sin orden parcial | **PASS** | `test_qa_ac_f3_03_conjunto_b_responde_200_sin_orden_parcial`; HTTP ciclo `INS-PIEZA-CORTADA → PROC-ACABADO → INS-PIEZA-CORTADA`. |
| AC-F3-03b | Requisitos previos del ciclo no bloqueados | **PASS** | `test_qa_ac_f3_03b_requisitos_previos_del_ciclo_no_quedan_bloqueados`; HTTP AC-F3-03b. |
| AC-F3-04 | Dos ciclos independientes: uno por SCC | **PASS** | `test_qa_ac_f3_04_dos_ciclos_independientes_un_ciclo_por_scc`. |
| AC-F3-04b | Conjunto D: bloquea solo la rama cíclica | **PASS** | `test_qa_ac_f3_04b_conjunto_d_bloquea_solo_la_rama_ciclica`; HTTP AC-F3-04. |
| AC-F3-05 | Plan de entrega de producto planificable | **PASS** | `test_qa_ac_f3_05_plan_entrega_producto_planificable`; HTTP AC-F3-05 y precedencias del subgrafo. |
| AC-F3-05b | Producto sin requisitos: un único paso | **BLOCKED** | `test_qa_ac_f3_05b_producto_sin_requisitos_tiene_un_unico_paso` → `xfail(strict)`; `PROD-SOLO` queda `INCOMPLETO` con `pasos: []`. Contradicción §5.1. |
| AC-F3-05c | Plan multiproducto deduplicado | **PASS** | `test_qa_ac_f3_05c_plan_entrega_multiproducto_deduplica_y_respeta_orden_global`. |
| AC-F3-05d | Conjunto F: producto aislado con un paso | **BLOCKED** | `test_qa_ac_f3_05d_conjunto_f_producto_aislado_tiene_un_paso` → `xfail(strict)`; `PROD-B` queda `INCOMPLETO`. Contradicción §5.1. |
| AC-F3-05e | El orden de la selección no altera el plan | **PASS** | `test_qa_ac_f3_05e_el_orden_de_la_seleccion_no_altera_el_plan`; HTTP AC-F3-05e. |
| AC-F3-06 | Producto bloqueado: 200 sin pasos | **PASS** | `test_qa_ac_f3_06_producto_bloqueado_responde_200_sin_pasos`; HTTP AC-F3-06. |
| AC-F3-06b | Mezcla bloqueado + planificable | **PASS** | `test_qa_ac_f3_06b_mezcla_bloqueado_y_planificable_solo_devuelve_rama_planificable`. |
| AC-F3-07 | Ciclo en rama ajena no contamina el plan | **PASS** | `test_qa_ac_f3_07_ciclo_en_rama_ajena_no_contamina_el_plan`; HTTP AC-F3-07. |
| AC-F3-08 | Producto inexistente: 404 `ERR-02` | **PASS** | `test_qa_ac_f3_08_seleccion_invalida_falla_completa_sin_plan_parcial`; HTTP AC-F3-08. |
| AC-F3-08b | Elemento no producto: 422 `ERR-04` | **PASS** | Mismo test de selección inválida; HTTP AC-F3-08b. |
| AC-F3-08c | Lista vacía o parámetro ausente: 422 `ERR-04` | **PASS** | Mismo test; HTTP AC-F3-08c (dos escenarios). |
| AC-F3-08d | Identificador mal formado: 422 `ERR-05` | **PASS** | Mismo test; HTTP AC-F3-08d. |
| AC-F3-08e | Normalización y deduplicación | **PASS** | `test_qa_ac_f3_08e_normaliza_mayusculas_y_deduplica_la_seleccion`; HTTP AC-F3-08e. |
| AC-F3-08f | Mezcla válida/inválida falla completa | **PASS** | Mismo test de selección inválida; HTTP AC-F3-08f. |
| AC-F3-09 | Estado por producto y `esPlanificable` | **PASS con observación** | `test_qa_ac_f3_09_cada_producto_aparece_una_vez_con_su_estado`, `test_qa_ac_f3_09_es_planificable_solo_si_todos_lo_son`. El estado `INCOMPLETO` de productos aislados queda fuera del conjunto cerrado `PLANIFICABLE/BLOQUEADO` (contradicción §5.1). |
| AC-F3-10 | Interfaz del plan de entrega | **PASS** | `frontend/e2e/f3.spec.ts` → «AC-F3-10 muestra los pasos numerados y el estado del producto del backend». |
| AC-F3-10b | Interfaz del diagnóstico global y alerta de ciclo | **FAIL** | Las partes de DAG y de elementos bloqueados pasan; falla la alerta porque no muestra los productos bloqueados. Ver §4.1. |
| AC-F3-10c | Frontend no implementa Kahn, SCC, DFS ni cálculo | **PASS** | `frontend/src/test/arquitectura.test.ts` → 3 pruebas AC-F3-10c; `frontend/src/test/ordenProduccion.test.ts`. |
| AC-F3-11 | Backend sin NetworkX y con algoritmos propios | **PASS** | `test_qa_ac_f3_11_sin_networkx_ni_librerias_de_grafos`; HTTP AC-F3-11. |
| AC-F3-12 | Diagnóstico y plan < 100 ms | **PASS** | `test_qa_ac_f3_12_diagnostico_y_plan_en_menos_de_100_ms`; HTTP: diagnóstico 1.5 ms, plan 2.2 ms. |
| AC-F3-13 | Determinismo byte a byte | **PASS** | `test_qa_ac_f3_13_determinismo_byte_a_byte_con_ciclo_y_plan`. |
| AC-F3-14 | Separación de capas y errores explícitos | **PASS** | `test_qa_ac_f3_14_el_calculo_vive_en_el_dominio`; HTTP de errores 404/422. |
| AC-UI-01 | Sin términos técnicos prohibidos en textos visibles | **FAIL** | La guía visible contiene «determinista» en `ModalAyudaOperativa.tsx:246`. Ver §4.2. |
| AC-UI-04b | La guía explica plan de entrega y control general | **FAIL** | La guía no menciona «productos bloqueados» ni «productos planificables». Ver §4.3. |
| AC-UI-12 | Texto copiado del orden de producción en lenguaje natural | **PASS** | `frontend/e2e/f3.spec.ts` → «AC-UI-12 el orden global copiado está en español y sin términos técnicos». |

**Recuento de criterios evaluados:** 34 (31 de F3 + 3 de interfaz) → **28 PASS · 3 FAIL · 3 BLOCKED**.

## 4) Fallos encontrados

Los tres fallos son de interfaz, se reproducen en Chromium contra el backend y Vite reales y están
codificados como pruebas E2E ordinarias (no `test.fail()`), de modo que el fallo es explícito.

### 4.1 AC-F3-10b — La alerta de ciclo no muestra los productos bloqueados

- Prueba: `frontend/e2e/f3.spec.ts:247` → «AC-F3-10b con un ciclo muestra los productos bloqueados».
- Esperado: la alerta de ciclo nombra los productos bloqueados (`productosBloqueados`).
- Obtenido: `expect(locator).toBeVisible() failed`; `getByText('Productos bloqueados')` no existe.
- Causa: `frontend/src/components/VistaOrdenProduccion.tsx:720-732` solo renderiza
  `elementosBloqueados`; `productosBloqueados` está tipado pero no se usa en la vista.
- Evidencia: `frontend/test-results/f3-Plan-de-entrega-y-contr-74d59-ra-los-productos-bloqueados-chromium/error-context.md`
  y `trace.zip`; salida completa en `e2e-f3.log`.

### 4.2 AC-UI-01 — Término prohibido en la guía operativa

- Prueba: `frontend/e2e/f3.spec.ts:263` → «AC-UI-01 la vista y la guía no muestran términos técnicos prohibidos».
- Esperado: ningún término prohibido de `requirements.md` §12.2 en texto visible.
- Obtenido: la guía contiene «genera el orden determinista global de operaciones».
- Causa: `frontend/src/components/ModalAyudaOperativa.tsx:246` usa «determinista», incluido en la
  lista de términos prohibidos de AC-UI-01.
- Evidencia: `frontend/test-results/f3-Plan-de-entrega-y-contr-b6054-...-t-cnicos-prohibidos-chromium/error-context.md`;
  `e2e-f3.log`.

### 4.3 AC-UI-04b — La guía no explica productos bloqueados ni planificables

- Prueba: `frontend/e2e/f3.spec.ts:305` → «AC-UI-04b la guía explica el plan de entrega y el control general de planta».
- Esperado: la guía menciona el plan de entrega, el control general, las dependencias circulares,
  los productos bloqueados y los productos planificables.
- Obtenido: el texto de la guía solo describe el plan de entrega y el control general; fallan
  `expect.soft(texto).toMatch(/productos bloqueados/i)` y
  `expect.soft(texto).toMatch(/productos planificables/i)`.
- Causa: `frontend/src/components/ModalAyudaOperativa.tsx:236-249` no incluye esos dos conceptos.
- Evidencia: `frontend/test-results/f3-Plan-de-entrega-y-contr-b3fde-l-control-general-de-planta-chromium/error-context.md`;
  `e2e-f3.log`.

## 5) Contradicciones documentales y pruebas bloqueadas

### 5.1 Estado `INCOMPLETO` no documentado

La implementación introduce un tercer estado de negocio, `INCOMPLETO`, y dos campos de respuesta
(`elementosIncompletos`, `productosIncompletos`) que no existen en `docs/`:

- Dominio: `backend/app/dominio/catalogo.py:54,68-69,82-83,234-...` y `_calcular_incompletos`.
  Un `INSUMO` sin proveedor ni proceso predecesor, un `PROCESO` sin entrada y un `PRODUCTO` sin
  proceso quedan incompletos; la incompletitud se propaga hacia adelante.
- API: `backend/app/api/esquemas.py:209,222-223` y `backend/app/api/rutas.py:316-317` exponen
  `estado: INCOMPLETO` y las dos listas nuevas.
- Documentación: `docs/api-contract.md:100` define `estado` solo como `PLANIFICABLE` o `BLOQUEADO`;
  §3.7 (líneas 126-128) no lista `elementosIncompletos` ni `productosIncompletos`; no hay ninguna
  mención a `INCOMPLETO` en `docs/` (la única coincidencia de «incompleto» es `AMB-F3-05`, ajena).
- Criterios afectados: AC-F3-01c, AC-F3-05b y AC-F3-05d exigen que un producto aislado se ordene y
  tenga un plan de un paso; AC-F3-09 limita el estado a `PLANIFICABLE` o `BLOQUEADO`.

Consecuencia observada: con el Conjunto F, `GET /orden-produccion` devuelve `esDag: true`,
`orden: []` y `elementosIncompletos: [PROD-A, PROD-B, PROD-C]`; `GET /plan-entrega?productos=PROD-B`
devuelve `estado: INCOMPLETO`, `esPlanificable: false`, `pasos: []` y `productosIncompletos: [PROD-B]`.

Pruebas que lo evidencian:

- `test_qa_ac_f3_01c_conjunto_f_productos_aislados_se_ordenan` → `xfail(strict)`.
- `test_qa_ac_f3_05b_producto_sin_requisitos_tiene_un_unico_paso` → `xfail(strict)`.
- `test_qa_ac_f3_05d_conjunto_f_producto_aislado_tiene_un_paso` → `xfail(strict)`.
- `test_observacion_implementacion_reporta_incompletos_no_especificados` → PASS; registra el
  comportamiento actual sin declararlo criterio de aceptación.

**Decisión pendiente (`analyst`):** definir si los elementos aislados o incompletos deben poder
ordenarse/planificarse, o si `INCOMPLETO` es una regla de negocio válida que debe documentarse y
reflejarse en AC-F3-01c/05b/05d/09, en `requirements.md` §11 y en `api-contract.md` §3.7/§3.8.
No se asumió una resolución ni se alteró código de producción.

### 5.2 Ejemplo obsoleto en `api-contract.md` §3.8

El ejemplo de respuesta `200` de `docs/api-contract.md:433-451` muestra 4 pasos para `PROD-PANEL`
(`PROV-ACERO, INS-BARRA, PROC-CORTE, PROD-PANEL`) y omite `INS-TORNILLO`. AC-F3-05 exige 5 pasos
para ese mismo producto, e `INS-TORNILLO` es requisito de `PROC-CORTE`. La implementación cumple
AC-F3-05; el ejemplo del contrato quedó desactualizado. Es una corrección documental, no un fallo de
código.

### 5.3 Consecuencia de integración del estado `INCOMPLETO`

`frontend/src/types/index.ts:135-159` no declara `elementosIncompletos`, `productosIncompletos`,
`descripcion` ni el valor `INCOMPLETO`; `ProductoEntrega.estado` sigue siendo
`'PLANIFICABLE' | 'BLOQUEADO'`. En `frontend/src/components/VistaOrdenProduccion.tsx:501` todo
estado distinto de `PLANIFICABLE` se muestra como «Bloqueado». Si el backend devuelve `INCOMPLETO`,
la interfaz lo presentará como bloqueado, no como incompleto. Está ligado a la contradicción §5.1 y
debe resolverse junto con ella; no se añadió una prueba E2E separada para no fijar como contrato un
estado que la documentación aún no define.

## 6) Pruebas bloqueadas y motivos

| Prueba / criterio | Motivo | Evidencia |
| --- | --- | --- |
| AC-F3-01c | El criterio exige ordenar `[PROD-A, PROD-B, PROD-C]`; la implementación los marca `INCOMPLETO` y devuelve `orden: []`. Contradicción §5.1. | `xfail(strict)` en `backend/tests/test_orden_produccion_f3_qa.py` |
| AC-F3-05b | El criterio exige un plan de un paso para `PROD-SOLO`; la implementación devuelve `estado: INCOMPLETO` y `pasos: []`. Contradicción §5.1. | `xfail(strict)` |
| AC-F3-05d | El criterio exige un plan de un paso para `PROD-B`; la implementación lo marca `INCOMPLETO`. Contradicción §5.1. | `xfail(strict)` |

No hubo pruebas no ejecutables por entorno: el backend, el frontend, Playwright y el servidor de
catálogo vacío arrancaron correctamente. Los tres bloqueos son de contrato documental, no de
infraestructura.

AC-UI-04b estaba bloqueado por `AMB-UI-02` mientras el backend no expusiera el contrato nuevo. En
esta versión el backend ya lo expone, por lo que el criterio queda activo y se ejecutó; su resultado
es FAIL por contenido de la guía, no BLOCKED.

## 7) Cobertura

- **F3:** 31/31 criterios evaluados → 27 PASS, 1 FAIL (AC-F3-10b), 3 BLOCKED (AC-F3-01c, AC-F3-05b,
  AC-F3-05d).
- **Interfaz F3:** AC-F3-10, AC-F3-10b, AC-F3-10c, AC-UI-01, AC-UI-04b y AC-UI-12 evaluados →
  3 PASS, 3 FAIL.
- **Cobertura funcional:** DAG, precedencias, determinismo, ciclos directos e independientes,
  requisitos previos no bloqueados, plan de uno y varios productos, producto bloqueado, mezcla,
  ciclo en rama ajena, validación completa de la selección (404/422), normalización, deduplicación,
  rendimiento y determinismo byte a byte.
- **Integración:** regresión completa del backend (F1/F2/F3) y E2E completo de F1 (11 pruebas), F2
  (8 pruebas) y F3 (7 pruebas), más catálogo vacío (5 pruebas). El cliente de API y la arquitectura
  estática cubren AC-F3-10c y la ausencia de algoritmos duplicados.
- **No re-ejecutado en esta ronda:** AC-UI-02, AC-UI-03, AC-UI-04, AC-UI-05 a AC-UI-11 y AC-UI-13 a
  AC-UI-18 (criterios transversales de UI ajenos al delta de F3). No se declaran PASS ni FAIL aquí.

## 8) Cambios de pruebas y entorno

- `backend/tests/test_orden_produccion_f3_qa.py`: reescrito para el contrato nuevo (27 pruebas;
  24 PASS, 3 `xfail(strict)` por la contradicción `INCOMPLETO`, 1 observación).
- `backend/tests/verificacion_http_f3.py`: reescrito para los datos de demostración actuales y el
  contrato de ciclos `200`; 22 escenarios.
- `frontend/e2e/f3.spec.ts`: reescrito con 7 pruebas (plan de entrega, DAG global, ciclo con
  elementos bloqueados, ciclo con productos bloqueados, AC-UI-01, AC-UI-04b, AC-UI-12).
- `frontend/e2e/f1.spec.ts` y `frontend/e2e/vacio.spec.ts`: actualizados al rótulo «Crear relación» y
  a una arista válida `PROVEEDOR → INSUMO`.
- `frontend/e2e/f2.spec.ts`: actualizado a los identificadores y conteos reales del catálogo de
  demostración.
- `frontend/playwright.vacio.config.ts`: el comando del backend pasó de
  `.venv\Scripts\python.exe` (inexistente en este entorno) a `python`.
- `frontend/src/test/api.test.ts`: identificadores F2 actualizados y dos pruebas de integración F3.
- `frontend/src/test/arquitectura.test.ts`: pruebas AC-F3-10c y consumo de `/plan-entrega`.
- `frontend/src/test/ordenProduccion.test.ts`: contrato del cliente para `obtenerOrdenProduccion` y
  `obtenerPlanEntrega`.
- `docs/entrega/salida-aceptacion-f3.txt`: regenerado con la salida real de los 22 escenarios HTTP.
- Entorno: Python 3.14.7, pytest 9.1.1, Node/Vite y Chromium de Playwright. `requirements.txt` no
  declara las dependencias de prueba (`pytest`, `httpx2`); se usan las instaladas globalmente.
- El backend se reinició antes de las corridas finales para partir del catálogo de demostración
  limpio (27 elementos, 37 dependencias). El script HTTP crea y elimina
  `PROC-ACABADO → INS-PIEZA-CORTADA` para verificar el ciclo. La suite E2E completa deja elementos
  `E2E-*` en el servidor compartido; por eso la verificación HTTP final se ejecutó sobre un backend
  recién reiniciado.

## 9) Conclusión

**F3 no se declara PASS: 28 PASS · 3 FAIL · 3 BLOCKED sobre 34 criterios evaluados.**

El núcleo de F3 en el backend está sólido: el diagnóstico global responde `200` en DAG y en ciclo,
respeta precedencias, es determinista, detecta ciclos por SCC, no emite orden parcial ante
contradicciones, el plan de entrega valida la selección completa y responde `404`/`422` con los
códigos correctos, cumple rendimiento y no usa NetworkX. Las 24 pruebas ejecutables de la suite QA y
los 22 escenarios HTTP pasan.

Los 3 FAIL son reales y reproducibles en la interfaz:

1. AC-F3-10b: la alerta de ciclo no muestra los productos bloqueados.
2. AC-UI-01: la guía visible contiene el término prohibido «determinista».
3. AC-UI-04b: la guía no explica productos bloqueados ni productos planificables.

Los 3 BLOCKED provienen de la regla `INCOMPLETO` no documentada, que contradice AC-F3-01c,
AC-F3-05b, AC-F3-05d, el conjunto cerrado de estados de AC-F3-09 y el contrato §3.7/§3.8. Requiere
decisión de `analyst`; no se modificó código de producción para forzar los criterios.

**Acciones requeridas antes de re-declarar F3:**

- `frontend-builder`: mostrar `productosBloqueados` en la alerta de ciclo (AC-F3-10b); eliminar
  «determinista» de la guía (AC-UI-01); añadir productos bloqueados y planificables a la guía
  (AC-UI-04b).
- `analyst`: resolver y documentar `INCOMPLETO` y los campos `elementosIncompletos`/
  `productosIncompletos`, actualizar AC-F3-01c/05b/05d/09 y el ejemplo §3.8; decidir el estado
  visible en la interfaz.
- `tester`: re-ejecutar la suite completa y las pruebas E2E tras las correcciones.
