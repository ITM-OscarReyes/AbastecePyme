# Registro de decisiones — AbastecePyme

Registro centralizado de decisiones relevantes del proyecto, distribuido en un archivo por agente.

Cada agente registra exclusivamente en su propio archivo. Este archivo es el índice: no contiene decisiones nuevas y no debe usarse como registro.

Reglas y responsables: `AGENTS.md`.

## Archivos

| Archivo | Agente | Ámbito |
| ------- | ------ | ------ |
| `architect.md` | `architect` | Configuración del proyecto y de los agentes, decisiones de proceso, estructura de la documentación |
| `analyst.md` | `analyst` | Modelo del grafo, dirección de relaciones, decisiones de modelado, contratos, casos límite, resolución de ambigüedades técnicas |
| `orchestrator.md` | `orchestrator` | Coordinación, resolución de conflictos entre agentes, decisiones que afectan el flujo o el estado del trabajo |
| `backend-builder.md` | `backend-builder` | Estructuras de datos, representación del grafo, algoritmos, contratos de API, casos límite, integración y arquitectura del backend |
| `frontend-builder.md` | `frontend-builder` | Integración con la API, presentación, estructura de interfaz, comportamiento de estados, visualización |
| `tester.md` | `tester` | Criterios de prueba, estrategia de verificación, interpretación documentada de una prueba, cambios en la estrategia de aceptación |
| `auditor.md` | `auditor` | Decisiones derivadas de hallazgos de auditoría o de problemas de trazabilidad |

## Estructura común

Todos los archivos usan la misma estructura de tabla:

`Fecha | Agente | Feature | Decisión o pieza | Problema o necesidad | Decisión adoptada | Motivo | Cómo se verificó`

## Reglas

- Cada agente escribe únicamente en su propio archivo, con su propio nombre en la columna `Agente`.
- No se registran acciones triviales, cambios menores de código ni operaciones mecánicas.
- Cuando una decisión provenga de otro agente o de una resolución coordinada, se conserva la trazabilidad de su origen y no se registra como decisión propia.
- Si un archivo no existe, créalo con el encabezado y la tabla de este índice antes de registrar la primera decisión.
- No crees archivos de otros agentes ni modifiques decisiones ya registradas.