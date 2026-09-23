# AbastecePyme — Reglas de proyecto

## Producto

AbastecePyme es una solución para una pequeña empresa manufacturera que depende de proveedores, materias primas, insumos y procesos internos. Permite identificar qué elementos dependen de un proveedor o insumo, qué productos se afectan, cómo se relacionan los elementos, en qué orden prepararlos y si existe una configuración imposible por dependencias circulares. Utiliza únicamente datos sintéticos y coherentes con el dominio.

## Fuente de verdad

`docs/brief.md` es la fuente de verdad para las necesidades, alcance y reglas de negocio del proyecto.

Jerarquía de referencia:

1. `docs/brief.md`
2. Especificación técnica derivada del brief
3. Decisiones técnicas documentadas
4. Implementación
5. Pruebas y evidencias

La especificación técnica puede agregar precisión técnica, pero **no puede cambiar el significado** de las necesidades o reglas de negocio de `docs/brief.md`. Ante una ambigüedad o contradicción: identificarla, documentarla, no inventar una regla de negocio, dejar explícita la decisión pendiente y escalarla. Ningún agente redefine reglas de negocio por iniciativa propia.

## Features

- **F1 — Catálogo de dependencias**: crear y listar elementos con ID único y tipo; registrar dependencias solo entre elementos válidos; evitar relaciones duplicadas; validar datos mal formados; representar y consultar la red; mostrar la red mediante la API y una interfaz mínima. Debe quedar definida la dirección de cada relación y la representación del grafo.
- **F2 — Análisis de impacto**: consultar el impacto de un elemento respetando la dirección definida para el grafo; diferenciar entre elemento inexistente, elemento existente sin dependencias y elemento que afecta o depende de una cadena.
- **F3 — Orden de producción y ciclos**: obtener un orden de preparación válido cuando no hay ciclos; detectar y reportar los ciclos de manera útil; no devolver un orden falso cuando existe contradicción. Puede usar conceptos como DAG y ordenamiento topológico.
- **F4 — Dashboard integrado**: integrar catálogo, análisis de impacto, orden de producción, alerta de ciclos y visualización de dependencias usando resultados reales del backend, sin datos falsos.

## Restricciones técnicas

- **Backend**: Python 3.12 o superior, API REST, entorno virtual, dependencias documentadas en `requirements.txt`, backend funcional y conectado al frontend.
- **Grafo**: la representación del grafo y sus algoritmos se implementan en el propio proyecto. **NetworkX no debe utilizarse** para calcular recorridos, detectar ciclos, calcular impactos, calcular caminos, realizar ordenamientos topológicos ni resolver los algoritmos principales. NetworkX solo puede usarse para visualizar resultados ya calculados por el backend.
- **Frontend**: React y TypeScript; consume la API real; no duplica los algoritmos del backend ni implementa una segunda versión de las reglas de negocio.
- **Datos**: solo sintéticos y coherentes con el dominio.
- **Integración**: cada funcionalidad debe funcionar de extremo a extremo: regla de negocio → modelo → backend → API → frontend → resultado observable.

## Casos que el sistema debe manejar

Datos válidos; datos duplicados; datos mal formados; pesos inválidos; elementos inexistentes; relaciones inexistentes; grafo vacío; elementos existentes sin dependencias; cadenas de dependencias; ciclos; configuraciones que no permitan producir un orden válido. Los errores no deben ocultarse ni convertirse en resultados aparentemente válidos.

## Alcance

No se inventan funcionalidades fuera del alcance. No forman parte del producto: inventario real, compras reales, facturación, pagos, pronósticos, datos personales reales ni funcionalidades externas innecesarias. Ante una posible mejora no contemplada: identificarla, explicar su impacto, documentarla como propuesta o decisión pendiente y no implementarla automáticamente. Debe preferirse la solución más simple que cumpla el requisito.

## Registro de decisiones

Existe un único registro centralizado de decisiones del proyecto en `docs/decisions.md`. Toda decisión relevante (representación del grafo, dirección de las relaciones, elección de algoritmos, estructuras de datos, arquitectura, contratos de API, manejo de casos límite, decisiones de integración, cambios de diseño, resoluciones de ambigüedad) se registra con la estructura:

| Fecha | Agente | Feature | Decisión o pieza | Problema o necesidad | Decisión adoptada | Motivo | Cómo se verificó |

No se registran acciones triviales, cambios menores de código ni operaciones mecánicas. Cuando una decisión provenga de otro agente, se conserva la trazabilidad de su origen.

## Agentes

| Agente | Rol |
| ------ | --- |
| `analyst` | Analizar y especificar (fuente de la especificación técnica derivada del brief) |
| `orchestrator` | Coordinar el flujo de trabajo entre agentes |
| `backend-builder` | Implementar el backend |
| `frontend-builder` | Implementar el frontend |
| `tester` | Verificar (único autorizado a declarar PASS/FAIL) |
| `auditor` | Auditar trazabilidad y coherencia (revisa y reporta; no corrige) |

Flujo general por feature: `analyst` → `backend-builder` → `frontend-builder` → `tester` → `auditor`. 

Los ciclos de corrección se coordinan a través de `orchestrator`: `tester` → `orchestrator` → agente responsable → `tester`; y `auditor` → `orchestrator` → agente responsable → `tester` → `auditor`.

Los agentes permanecen disponibles de forma independiente y pueden invocarse individualmente cuando la tarea lo requiera. El `orchestrator` coordina el flujo completo y los ciclos de corrección cuando sea necesario.