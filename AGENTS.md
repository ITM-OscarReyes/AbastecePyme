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

## Calidad de código y arquitectura

Estos principios son obligatorios para todo el código del proyecto, incluidos el de pruebas:

- Respetar los principios SOLID: responsabilidad única, abierto/cerrado, sustitución de Liskov, segregación de interfaces e inversión de dependencias.
- Aplicar buenas prácticas de Clean Code.
- Respetar Clean Architecture.
- Mantener una separación clara de responsabilidades.
- Utilizar nombres descriptivos y consistentes.
- Respetar las convenciones de nomenclatura del lenguaje.
- Evitar código duplicado.
- Evitar clases y métodos innecesariamente grandes.
- No mezclar lógica de negocio con acceso a datos, presentación o infraestructura.
- Mantener bajo acoplamiento y alta cohesión.
- Utilizar interfaces cuando aporten una abstracción real.
- Mantener las dependencias orientadas hacia las capas internas.
- Evitar complejidad innecesaria.
- Reutilizar componentes existentes cuando sea apropiado.
- No modificar funcionalidades existentes sin una razón justificada.

Convenciones de nomenclatura:

- **Python** (backend y pruebas): `snake_case` para módulos, funciones, métodos y variables; `PascalCase` para clases y excepciones; `UPPER_SNAKE_CASE` para constantes; prefijo `_` para elementos privados; anotaciones de tipo con nombres en `PascalCase`.
- **TypeScript/TSX** (frontend y pruebas): `camelCase` para funciones, variables y hooks; `PascalCase` para componentes, tipos e interfaces; `UPPER_SNAKE_CASE` para constantes y miembros de `enum`; prefijo `use` para hooks.

Aplicación por agente:

| Agente | Aplicación |
| ------ | ---------- |
| `analyst` | Especifica estas restricciones en la documentación técnica y las hace verificables. |
| `backend-builder` | Las aplica en toda la implementación Python. |
| `frontend-builder` | Las aplica en toda la implementación React + TypeScript. |
| `tester` | Verifica su cumplimiento y las aplica en el código de prueba que escribe. |
| `auditor` | Audita su cumplimiento y reporta hallazgos. |
| `orchestrator` | No implementa ni revisa código; no le aplican. |

## Casos que el sistema debe manejar

Datos válidos; datos duplicados; datos mal formados; pesos inválidos; elementos inexistentes; relaciones inexistentes; grafo vacío; elementos existentes sin dependencias; cadenas de dependencias; ciclos; configuraciones que no permitan producir un orden válido. Los errores no deben ocultarse ni convertirse en resultados aparentemente válidos.

## Alcance

No se inventan funcionalidades fuera del alcance. No forman parte del producto: inventario real, compras reales, facturación, pagos, pronósticos, datos personales reales ni funcionalidades externas innecesarias. Ante una posible mejora no contemplada: identificarla, explicar su impacto, documentarla como propuesta o decisión pendiente y no implementarla automáticamente. Debe preferirse la solución más simple que cumpla el requisito.

## Registro de decisiones

El registro centralizado de decisiones del proyecto se encuentra en `docs/decisions/`, con un archivo por agente. `docs/decisions/decisions.md` es el índice y no contiene decisiones. Cada agente registra exclusivamente en su propio archivo:

| Archivo | Agente responsable |
| ------- | ------------------ |
| `docs/decisions/architect.md` | `architect` (configuración del proyecto y de los agentes) |
| `docs/decisions/analyst.md` | `analyst` |
| `docs/decisions/orchestrator.md` | `orchestrator` |
| `docs/decisions/backend-builder.md` | `backend-builder` |
| `docs/decisions/frontend-builder.md` | `frontend-builder` |
| `docs/decisions/tester.md` | `tester` |
| `docs/decisions/auditor.md` | `auditor` |

Toda decisión relevante (representación del grafo, dirección de las relaciones, elección de algoritmos, estructuras de datos, arquitectura, contratos de API, manejo de casos límite, decisiones de integración, cambios de diseño, resoluciones de ambigüedad) se registra en el archivo del agente que la decide, con la estructura:

| Fecha | Agente | Feature | Decisión o pieza | Problema o necesidad | Decisión adoptada | Motivo | Cómo se verificó |

Un agente no escribe en el archivo de otro agente. No se registran acciones triviales, cambios menores de código ni operaciones mecánicas. Cuando una decisión provenga de otro agente, se conserva la trazabilidad de su origen.

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