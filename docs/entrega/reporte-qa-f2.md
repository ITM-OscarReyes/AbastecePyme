# Reporte QA — Feature 2 (F2: Análisis de impacto)

Fecha: 2026-10-27  
Rama: f2-functional-changes  
Tester: tester (único autorizado a declarar PASS/FAIL)

## 1) Total de pruebas
| Ámbito | Ejecutadas | PASS | FAIL | BLOCKED | Notas |
| --- | --- | --- | --- | --- | --- |
| Backend unit/integración (pytest, TestClient) — backend/tests/test_impacto.py | 34 | 34 | 0 | 0 | `pytest backend/tests/test_impacto.py -v` → 34 passed, 1 warning (httpx/starlette deprecation). |
| Backend E2E HTTP real — backend/tests/verificacion_http_f2.py | 16 | 0 | 0 | 16 | Requiere Uvicorn real en `http://127.0.0.1:8000` con datos demo. No ejecutado en esta verificación. |
| Frontend unitarias con backend real — frontend/src/test/api.test.ts (casos F2) | 7 | 0 | 0 | 7 | Requieren backend real. Sin servidor → Network Error. BLOCKED por entorno. |
| Frontend arquitectura — frontend/src/test/arquitectura.test.ts | 14 | 14 | 0 | 0 | Pasaron en `npm run test`. |
| Frontend E2E Playwright — frontend/e2e/f2.spec.ts | 8 | 0 | 0 | 8 | Requieren backend (8000) + frontend (3000) levantados. No ejecutados. |

## 2) Matriz de criterios de aceptación F2
| Criterio | Descripción | Resultado | Evidencia |
| --- | --- | --- | --- |
| AC-F2-01 | PROV-ACERO afecta a la cadena esperada | PASS (backend) / BLOCKED (live) | test_ac_f2_01_impacto_prov_acero_devuelve_afectados_esperados |
| AC-F2-01b | No invierte el grafo | PASS | test_ac_f2_01b_recorrido_no_invierte_grafo |
| AC-F2-02 | Alcanzar = camino dirigido hacia adelante | PASS | test_ac_f2_02_alcanzar_significa_camino_dirigido_hacia_adelante |
| AC-F2-03 | Inexistente con formato válido → 404 ERR-02 | PASS (backend) / BLOCKED (live) | test_ac_f2_03_elemento_inexistente_responde_404_err02 |
| AC-F2-04 | PROD-BANCO sin salientes → 200 total 0 | PASS (backend) / BLOCKED (live) | test_ac_f2_04_elemento_existente_sin_dependencias_responde_200_total_cero |
| AC-F2-05 | INS-BARRA incluye directos/indirectos | PASS | test_ac_f2_05_impacto_ins_barra_incluye_directos_e_indirectos |
| AC-F2-05b | Sin duplicados ante múltiples caminos | PASS (backend) / BLOCKED (live) | test_ac_f2_05b_cada_alcanzable_aparece_una_sola_vez, test_ac_f2_diamante_multiples_rutas |
| AC-F2-05c | Ciclo permitido → termina sin duplicados/bucle infinito | PASS | test_ac_f2_05c_con_ciclo_el_recorrido_termina_y_devuelve_sin_repetir, test_ac_f2_ciclo_con_ramificacion, test_limite_consulta_repetida_sobre_grafo_con_ciclo_sin_bucle_infinito |
| AC-F2-06 | Recorrido propio, sin NetworkX | PASS | test_ac_f2_06_calculo_impacto_sin_networkx |
| AC-F2-06b | Frontend no recalcula alcanzables | PASS | test_ac_f2_06b_frontend_no_recalcula_alcanzables + frontend/src/test/arquitectura.test.ts |
| AC-F2-07 | Dependiente definido por arista entrante | PASS | test_ac_f2_07_dependiente_definido_por_arista_entrada_coherente |
| AC-F2-08 | Datos sintéticos coherentes; errores explícitos | PASS | test_ac_f2_08_datos_sinteticos_errores_explicitos |
| AC-F2-09 | Recorrido en dominio/aplicación, no en HTTP | PASS | test_ac_f2_09_recorrido_impacto_vive_en_dominio_no_en_http |
| AC-F2-10 | Trazabilidad completa en requirements.md §9 | PASS | test_ac_f2_10_trazabilidad_necesidades_requisitos_criterios |
| AC-F2-11 | Mal formado en ruta → 422 ERR-05, nunca 404 | PASS (backend) / BLOCKED (live) | test_ac_f2_11_identificador_mal_formado_responde_422_err05_nunca_404 |
| AC-F2-12 | Catálogo vacío → 404 ERR-02, nunca 200 con lista vacía | PASS | test_ac_f2_12_catalogo_vacio_responde_404_err02_nunca_200_lista_vacia |
| AC-F2-13 | Consultas idénticas consecutivas → misma respuesta y orden | PASS (backend) / BLOCKED (live) | test_ac_f2_13_dos_consultas_id_producen_misma_respuesta_mismo_orden |
| AC-F2-14 | Sin campos de ciclo/orden/ordenProduccion | PASS (backend) / BLOCKED (live) | test_ac_f2_14_respuesta_no_incluye_veredicto_ciclo_ni_orden |
| AC-F2-15 | README.md explica qué significa "alcanzar" | PASS | test_ac_f2_15_readme_documenta_significado_alcanzar |

## 3) Fallos encontrados
Ninguno. No se modificó código de producción. Todos los tests ejecutados realmente pasaron.

## 4) Pruebas bloqueadas y motivos
| Prueba | Motivo |
| --- | --- |
| backend/tests/verificacion_http_f2.py (16 escenarios) | Requiere backend Uvicorn real en http://127.0.0.1:8000 con datos demo. No levantado en esta ejecución. |
| frontend/src/test/api.test.ts F2 (7 casos) | Requieren backend real. Sin servidor → Network Error. BLOCKED por entorno, no por lógica. |
| frontend/e2e/f2.spec.ts (8 tests) | Requieren backend (8000) y frontend (3000) levantados simultáneamente. No ejecutados. |

## 5) Cobertura de criterios de aceptación
100% de AC-F2-01..AC-F2-15 cubiertos. Las verificaciones live E2E/frontend quedan BLOCKED por disponibilidad de servicios en este entorno.

## 6) Conclusión
**F2 CUMPLE los requisitos verificados.** La implementación respeta la dirección origen → habilita destino, el recorrido es propio del dominio (sin NetworkX), se deduplican alcanzables con visited set (manejo correcto de ciclos), errores distinguen inexistente (404 ERR-02) vs mal formado (422 ERR-05), elemento sin salientes retorna 200 con total 0, la respuesta no expone campos de ciclo/orden, el frontend no recalcula alcanzables y README.md documenta "alcanzar". No se encontraron fallos. No se declara aprobación únicamente por inspección; la validación funcional clave se realizó con pytest en verde.
