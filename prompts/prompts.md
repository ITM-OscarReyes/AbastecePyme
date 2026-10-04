# Prompts

## 01 — Calidad de código y arquitectura

Tengo este proyecto llamado AbastecePyme y necesito que me ayudes con los siguiente:

Al desarrollar o modificar el proyecto, quiero que se respeten principios de Clean Code, SOLID y Clean Architecture, además de las convenciones de nomenclatura del lenguaje (PascalCase, camelCase, etc.) que en este caso es Python.

Analiza primero los agentes existentes y determina cuáles deberían cumplir estas reglas según las responsabilidades que tengan.

Añade estas reglas únicamente a los agentes que consideres que deben aplicarlas, sin modificar innecesariamente los agentes que no las necesiten.

Las reglas que deben aplicarse cuando correspondan son:

- Respetar los principios SOLID.
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

Antes de realizar cambios, revisa la estructura actual del proyecto y de los agentes. Indica qué agentes consideras que deben incorporar estas reglas y por qué. Después realiza los cambios necesarios.

## 02 — Documentación y requisitos de F1 con el agente analyst

Ejecuta el agente `analyst` para generar toda la documentación y requisitos necesarios para desarrollar la **únicamente la Feature 1 (F1 — Catálogo de dependencias)**, únicamente se debe hacer la documentación de la primera feature, las demás features aún no. Adicional debe generar solo la documentación, no debe empezar a implementar ni generar código.

---

Tarea: generar TODA la documentación y requisitos necesarios para desarrollar la **únicamente la Feature 1 (F1 — Catálogo de dependencias)** de AbastecePyme.

Contexto del proyecto:

- Directorio de trabajo: `E:\Repositories\AbastecePyme`
- `AGENTS.md` del proyecto ya define las reglas: `docs/brief.md` es la fuente de verdad. Features: F1 Catálogo de dependencias, F2 Análisis de impacto, F3 Orden de producción y ciclos, F4 Dashboard integrado.
- Registro de decisiones: cada agente escribe exclusivamente en su propio archivo, en este caso `docs/decisions/analyst.md`, con columnas: Fecha | Agente | Feature | Decisión o pieza | Problema o necesidad | Decisión adoptada | Motivo | Cómo se verificó.
- `docs/decisions/decisions.md` es índice y no contiene decisiones.

REQUISITOS ESTRICTOS:

1. **Solo documentación de F1.** No documentar, no especificar, no esbozar F2, F3 ni F4 (salvo mencionar dependencias o encadenamiento con F2/F3 de forma mínima y sin especificar su contenido). Si detectas que parte de F1 requiere una regla de negocio que pertenece a F2 o F3, NO la inventes: documéntala como ambigüedad o decisión pendiente y escala.
2. **Cero implementación.** No escribas código Python, TypeScript, SQL, JSON de ejemplo ejecutable, ni scaffolds de archivos de código. No crees archivos `.py`, `.ts`, `.tsx`, `requirements.txt` ni `package.json`. Escribe únicamente Markdown de especificación. Los fragmentos ilustrativos en JSON o YAML deben ser puramente ilustrativos dentro de documentos markdown, no archivos de código ejecutable.
3. **Respeta Clean Architecture, SOLID, Clean Code y la prohibición de NetworkX** (NetworkX solo para visualización de resultados ya calculados por el backend).
4. No redefinas reglas de negocio del brief. Ante ambigüedad: documéntala explícitamente como decisión pendiente.

Antes de empezar:

- Lee `docs/brief.md` completo.
- Lee los documentos existentes en `docs/` (por ejemplo `docs/requirements.md`, `docs/graph-model.md`, `docs/api-contract.md`, `docs/architecture.md`, `docs/acceptance-criteria.md`) para respetar el formato, la convención de nombres, la ubicación y la estructura ya establecida por ejecuciones anteriores del analyst. Reutiliza la estructura existente en lugar de inventar una nueva; si no existe, crea la estructura coherente con lo que ya haya.
- Lee `AGENTS.md` y cualquier `docs/decisions/analyst.md` existente.

Entregables esperados (ajústalos a la estructura ya existente en el repositorio):

- Especificación técnica de F1 en detalle: requisitos funcionales y no funcionales verificables (REQ IDs únicos), modelo de dominio del elemento y de la relación de dependencia, y **definición explícita de la dirección de cada relación** y de la representación del grafo (nodos, aristas, adyacencia), que es requisito explícito de F1.
- Contrato de API REST de F1 (endpoints, métodos, request y response, códigos de estado, esquema de errores, nombres de campos, ejemplos ilustrativos en markdown).
- Reglas de validación de entrada y catálogo de errores de F1.
- Criterios de aceptación de F1 (verificables, con IDs) y casos límite: datos válidos, duplicados, mal formados, pesos inválidos, elementos inexistentes, relaciones inexistentes, grafo vacío, elementos sin dependencias.
- Trazabilidad: cada requisito mapea a feature y a endpoint o capa correspondiente.
- Registra en `docs/decisions/analyst.md` todas las decisiones tomadas, usando la tabla y el formato existentes en el repositorio.
- Actualiza el índice `docs/decisions/decisions.md` si el formato del repositorio lo requiere.

Al finalizar, devuelve un resumen conciso con: (1) lista de archivos creados o modificados con su ruta, (2) IDs de requisitos y criterios de aceptación definidos, (3) lista de ambigüedades o decisiones pendientes escaladas, (4) confirmación explícita de que no se escribió código.
