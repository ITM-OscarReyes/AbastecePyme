# Reporte QA — Feature 3 (F3: Orden de producción y ciclos)

Fecha: 2026-11-07  
Rama: `f3-order-and-cycles`  
Tester: `tester` (único autorizado a declarar PASS/FAIL)

## 1) Total de pruebas ejecutadas

| Ámbito | Ejecutadas | PASS | FAIL | BLOCKED | Evidencia |
| --- | ---: | ---: | ---: | ---: | --- |
| Backend F3 existente — `backend/tests/test_orden_produccion.py` | 14 | 14 | 0 | 0 | 14 passed (0.38s) |
| Backend QA F3 — `backend/tests/test_orden_produccion_f3_qa.py` | 19 | 19 | 0 | 0 | `python -m pytest tests/test_orden_produccion_f3_qa.py -v` → 19 passed (0.68s) |
| Backend regresión completa — `python -m pytest` | 199 | 199 | 0 | 0 | 199 passed (5.55s) |
| Frontend unitarias/arquitectura — `npm test` | 37 | 37 | 0 | 0 | 3 archivos, 37 passed (2.51s) |
| Frontend E2E F3 — `npx playwright test e2e/f3.spec.ts` | 2 | 2 | 0 | 0 | Chromium contra Vite (3000) + FastAPI (8000) reales; 2 passed (2.6s) |
| HTTP real F3 — `python tests/verificacion_http_f3.py` | 8 | 8 | 0 | 0 | 8 escenarios PASÓ, 0 FALLÓ |
| Compilación frontend — `npm run build` | 1 | 1 | 0 | 0 | `tsc -b && vite build` exitoso (solo advertencia de tamaño de chunk) |

No se modificó código de producción. Los cambios realizados son exclusivamente de pruebas y documentación de verificación.

## 2) Matriz de criterios de aceptación F3

| Criterio | Descripción | Resultado | Evidencia |
| --- | --- | --- | --- |
| AC-F3-01 | Caso acíclico estándar Gherkin | **BLOCKED** (literal) / PASS (intención) | El `Given` literal no es registrable por la API: `INS-TORNILLO -> PROD-PANEL` exige asociación previa del insumo y `PROD-PANEL -> PROD-BANCO` es PRODUCTO→PRODUCTO, prohibida (F1). Además, el orden listado (`PROV-ACERO` antes que `INS-TORNILLO`) contradice AC-F3-02. La intención se verificó con un DAG válido equivalente: `test_qa_f3_01_dag_valido_respeta_precedencias_y_total_pasos` y `test_qa_f3_01_documentacion_el_ejemplo_literal_no_es_registrable`. |
| AC-F3-02 | Determinismo estricto de Kahn | PASS | `test_qa_f3_02_desempate_ascendente_por_id_y_repeticion`, `test_qa_f3_02_desempate_en_cada_nivel_del_dag`; `INS-TORNILLO` < `PROV-ACERO` y respuestas consecutivas idénticas. |
| AC-F3-03 | Ciclo simple → 409 + sobre `CONFIGURACION_CICLICA` | PASS | `test_qa_f3_03_ciclo_directo_responde_409_con_reporte_completo`; ciclo `INS-BARRA -> PROC-CORTE -> INS-BARRA`, detalles `ciclo` y `elementosBloqueados`. |
| AC-F3-04 | Ciclo complejo / subgrafo con ciclo | **BLOCKED** (literal) / PASS (intención) | Un ciclo de 3 elementos `A -> B -> C -> A` es imposible con las reglas de tipo de F1 (solo INSUMO↔PROCESO forman ciclos, que siempre tienen longitud par). La intención se verificó con un ciclo de 4 nodos y un nodo desconectado: `test_qa_f3_04_ciclo_indirecto_de_cuatro_nodos_y_nodo_desconectado`, `test_qa_f3_04_documentacion_ciclo_de_tres_elementos_no_es_registrable`. |
| AC-F3-05 | Prohibición de orden falso | PASS | `test_qa_f3_05_multiples_escenarios_ciclicos_nunca_emiten_orden` (4 escenarios) y `test_qa_f3_05_multiples_ciclos_reportan_el_primero_determinista`; el cuerpo 409 no contiene `orden`, `esDag` ni `totalPasos`. |
| AC-F3-06 | Grafo vacío | PASS | `test_qa_f3_06_grafo_vacio_es_dag_trivial`; 200, `esDag: true`, `orden: []`, `totalPasos: 0`. |
| AC-F3-06b | Elementos aislados sin dependencias | PASS | `test_qa_f3_06b_elementos_aislados_en_orden_alfabetico`; `PROD-A`, `PROD-B`, `PROD-C`. |
| AC-F3-06c | Grafos disconexos acíclicos con cadenas paralelas | **BLOCKED** (literal) / PASS (intención) | Las cadenas literales `CAD1-INS -> CAD1-PROD` requieren que el insumo esté asociado a un proveedor o proceso; el `Given` no lo incluye. La intención se verificó con cadenas `PROV -> INS -> PROD`: `test_qa_f3_06c_dos_cadenas_independientes_orden_global`, `test_qa_f3_06c_documentacion_las_cadenas_literales_requieren_proveedor`. |
| AC-F3-07 | Visualización frontend de la lista numerada | PASS | `frontend/e2e/f3.spec.ts` → “AC-F3-07 muestra la lista numerada con los pasos del backend”. Comprueba `Paso 1..N`, `id`, tipo y nombre contra `GET /api/v1/orden-produccion`. |
| AC-F3-07b | Alerta de ciclos en frontend | PASS | `frontend/e2e/f3.spec.ts` → “AC-F3-07b alerta del ciclo y muestra los elementos involucrados”. El ciclo se crea por API (`PROC-CORTE -> INS-BARRA`) y se elimina al finalizar. |
| AC-F3-08 | Sin NetworkX para algoritmos | PASS | `test_qa_f3_08_sin_networkx_y_con_algoritmos_propios` (AST sobre `backend/app`) y `verificacion_http_f3.py` (8/8). |
| AC-F3-09 | Complejidad lineal / < 100 ms | PASS | `test_qa_f3_09_grafo_200_elementos_500_dependencias_bajo_100_ms`; medición adicional: mínimo 2.886 ms, máximo 3.762 ms, media 3.154 ms para 200 elementos y 500 dependencias. |
| AC-F3-10 | Determinismo byte a byte | PASS | `test_qa_f3_10_diez_ejecuciones_byte_a_byte_en_dag_y_ciclo`; 10 respuestas DAG y 10 de ciclo idénticas byte a byte. |
| AC-F3-11 | Frontend no duplica algoritmos | PASS | `frontend/src/test/arquitectura.test.ts` (3 pruebas AC-F3-11) y `verificacion_http_f3.py`; consume `/api/v1/orden-produccion` y no implementa Kahn/DFS. |

**Recuento de criterios:** 11 PASS · 0 FAIL · 3 BLOCKED (AC-F3-01, AC-F3-04, AC-F3-06c, todos por contradicción documental, no por defecto de implementación).

## 3) Fallos encontrados

Ninguno en la implementación de F3. Todas las pruebas ejecutables pasaron.

## 4) Pruebas bloqueadas y motivos

| Prueba / criterio | Motivo |
| --- | --- |
| AC-F3-01 literal | El `Given` viola las reglas de dependencia de F1 y el orden esperado contradice AC-F3-02. No es un fallo de código; requiere corrección documental por `analyst`. |
| AC-F3-04 literal | El ciclo de 3 elementos es imposible con las reglas de tipo de F1. La intención (ciclo complejo + nodo desconectado) sí se verificó con 4 nodos. |
| AC-F3-06c literal | Las cadenas `INS -> PROD` requieren una asociación previa del insumo; el `Given` no la declara. La intención se verificó con cadenas `PROV -> INS -> PROD`. |

## 5) Contradicciones documentales reportadas

1. **AC-F3-01 vs AC-F3-02:** AC-F3-01 lista `PROV-ACERO` antes que `INS-TORNILLO` y afirma un “desempate alfabético” a favor de `PROV-ACERO`; AC-F3-02 establece que `INS-TORNILLO < PROV-ACERO`. La implementación sigue AC-F3-02, que es la regla determinista explícita.
2. **AC-F3-01 Given inválido:** `INS-TORNILLO -> PROD-PANEL` no se puede registrar sin asociar `INS-TORNILLO` a un proveedor o proceso; `PROD-PANEL -> PROD-BANCO` es PRODUCTO→PRODUCTO, prohibida por F1.
3. **AC-F3-04 Given inválido:** un ciclo de 3 elementos no es construible con las reglas de tipo de F1.
4. **AC-F3-06c Given incompleto:** `CAD1-INS -> CAD1-PROD` y `CAD2-INS -> CAD2-PROD` no se pueden registrar sin proveedor o proceso que asocie los insumos.

No se asumió una resolución ni se alteró el código para forzar estos escenarios.

## 6) Cobertura de criterios de aceptación

- Cobertura literal: 11/14 criterios ejecutados y aprobados; 3/14 bloqueados por contradicciones documentales.
- Cobertura de intención: 14/14 criterios cubiertos con escenarios equivalentes válidos.
- Casos adicionales cubiertos: ciclos directos e indirectos, múltiples ciclos, ciclos que comparten nodos, nodos aislados, un solo elemento, componentes disconexas, integración F1/F2 (alta HTTP, grafo, impacto, creación y eliminación de la arista cíclica), determinismo y rendimiento.

## 7) Cambios de pruebas y entorno

- Nuevo `backend/tests/test_orden_produccion_f3_qa.py` (19 pruebas).
- Nuevo `frontend/e2e/f3.spec.ts` (2 pruebas E2E).
- `frontend/src/test/arquitectura.test.ts`: 3 pruebas nuevas de AC-F3-11.
- `backend/tests/test_no_funcional_y_arquitectura.py`: expectativa de rutas GET actualizada de 6 a 7 por el endpoint legítimo de F3 (`/orden-produccion`). Es mantenimiento de prueba, no cambio de producción.
- `backend/tests/verificacion_http_f3.py`: se corrigió el manejo de respuestas `204 No Content` sin cuerpo (el script fallaba al intentar `json.loads` de una respuesta vacía).
- Entorno: se instalaron dependencias de prueba (`pytest`, `httpx2`) y `node_modules`; `requirements.txt` no las declara. El backend se reinició antes de la verificación E2E para partir del catálogo de demostración limpio, porque `api.test.ts` deja elementos `TEST-*` en el servidor compartido.
- `prompts/prompts.md`: se añadió la sección §14 con el prompt de verificación de F3.

## 8) Conclusión

**F3 no se declara PASS pleno: 11 PASS · 0 FAIL · 3 BLOCKED.**

La implementación de F3 cumple todo el comportamiento ejecutable verificado: DAG, precedencias, determinismo, ciclos directos/indirectos/múltiples, casos límite, errores 409, ausencia de orden falso, rendimiento, no uso de NetworkX y frontend sin duplicación de algoritmos. Los 3 bloqueos provienen de criterios de aceptación que no pueden ejecutarse literalmente por contradicciones con las reglas de F1 y con AC-F3-02. Se requiere que `analyst` corrija AC-F3-01, AC-F3-04 y AC-F3-06c antes de declarar F3 aprobada; no se requiere cambio de código de producción.
