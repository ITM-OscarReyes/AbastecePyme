# Arquitectura y calidad — AbastecePyme (F1)

Este documento operacionaliza para F1 las reglas obligatorias de `AGENTS.md` (Clean Architecture,
SOLID, Clean Code, nomenclatura y prohibición de NetworkX) y las hace verificables.

- Requisitos de calidad asociados: `requirements.md`, sección 5 (`RNF-Q-01` a `RNF-Q-08`).
- Verificación: `acceptance-criteria.md` (AC-F1-21 a AC-F1-23).

No se define aquí ninguna estructura de clases ni de archivos: esas decisiones corresponden a
`backend-builder` y `frontend-builder`. Se definen responsabilidades, límites y dependencias entre
capas.

## 1. Capas del backend

Tres capas con una regla única: **las dependencias apuntan hacia el interior**. Ninguna capa interna
conoce a las externas.

```
infraestructura  ──▶  aplicación  ──▶  dominio
```

| Capa | Responsabilidad | Contenido esperado | No debe contener |
| ---- | --------------- | ------------------ | ---------------- |
| **Dominio** | Reglas de negocio de F1 y estructura del grafo | Modelo de elemento y tipo, modelo de dependencia, representación del grafo con sus invariantes, reglas de validación del catálogo, catálogo de errores de negocio, puertos de salida | Conocimiento del framework HTTP, del sistema de archivos o de la base de datos; formato de la petición o de la respuesta |
| **Aplicación** | Orquestación de casos de uso | Casos de uso de F1 (crear elemento, listar elementos, obtener elemento, registrar dependencia, listar dependencias, obtener grafo), objetos de entrada y salida de aplicación | Validación duplicada del dominio, decisiones de transporte (códigos HTTP, cabeceras), detalles de persistencia |
| **Infraestructura** | Adaptación a tecnología externa | Presentación HTTP (rutas, esquemas de entrada y salida, traducción de errores a códigos HTTP), adaptador de persistencia del catálogo, composición de dependencias al arrancar | Reglas de negocio, decisiones de validación del dominio |

### 1.1 Dónde vive cada cosa

| Aspecto | Ubicación obligatoria |
| ------- | ---------------------- |
| Dirección de la relación «origen habilita destino» | Dominio |
| Invariantes del grafo (sin nodos huérfanos, sin aristas reflexivas, sin duplicados) | Dominio |
| Validación de formato de `id`, `tipo`, `nombre` y `descripcion` | Dominio |
| Comprobación de duplicados de elemento y de dependencia | Dominio |
| Existencia de los extremos de una dependencia | Dominio, consulta al catálogo del dominio |
| Reglas de normalización (mayúsculas, recorte) | Dominio |
| Códigos HTTP, `Content-Type`, `Location`, sobre de error | Infraestructura |
| Traducción de un error de dominio a su código HTTP | Infraestructura |
| Traducción entre `snake_case` de Python y `lowerCamelCase` del JSON | Infraestructura (sección 3.1) |
| Persistencia y carga de datos sintéticos | Infraestructura |
| Recorridos, ciclos y órdenes | **Fuera de F1** |

### 1.2 Abstracciones que F1 necesita

F1 es pequeño y no justifica abstracciones especulativas. Se requieren exactamente estas, porque
cada una aporta algo real:

| Abstracción | Propósito | Por qué es necesaria |
| ----------- | --------- | -------------------- |
| Modelo de dominio de elemento, dependencia y grafo | Expresar las reglas sin dependencias externas | Sin ella, las reglas vivirían en el framework HTTP y no serían reutilizables ni verificables |
| Puerto de persistencia del catálogo | Guardar y recuperar elementos y dependencias | Desacopla el dominio del lugar donde viven los datos y permite ejercitar las reglas sin infraestructura |
| Casos de uso de aplicación | Expresar las operaciones del catálogo | Evita que las rutas HTTP contengan lógica de negocio y permite probar las reglas sin servidor |
| Sobre de error único | Representar el fallo de forma uniforme en toda la API | Un error presentado de tres maneras distintas obligaría al frontend a conocer cada caso |

No se requieren otras abstracciones en F1: no hay Domain Events, ni Unit of Work obligatorio, ni
servicios de dominio adicionales, ni una capa de CQRS. Si una implementación los necesita, debe
justificarlo y registrarlo en `docs/decisions/backend-builder.md`.

## 2. Frontend

| Capa | Responsabilidad | No debe contener |
| ---- | --------------- | ---------------- |
| **Cliente de API** | Hablar con `/api/v1`: construir peticiones, aplicar el sobre de error y exponer resultados tipados | Reglas de negocio, validación propia del catálogo, decisiones sobre la dirección de las relaciones |
| **Estado** | Mantener lo que devuelve la API y el estado de la interfaz (cargando, vacío, error, con datos) | Cálculos sobre el grafo, deduplicación de dependencias, reordenación de elementos |
| **Componentes** | Presentar el catálogo, los formularios de alta y la visualización de la red | Validar reglas de negocio, deducir la dirección de una relación, filtrar elementos por reglas del dominio |

Reglas transversales:

- El frontend **no** valida las reglas de F1: las valida el backend y el frontend muestra el error
  recibido. Una validación duplicada en el frontend sería una segunda versión de la regla.
- El frontend **no** calcula nada sobre el grafo. Para F1 recibe la red ya calculada desde
  `GET /api/v1/grafo` y la dibuja. Cualquier recorrido, nivel o ciclo que aparezca en el futuro
  debe venir calculado por el backend.
- La dirección de las relaciones no se deduce en el frontend: viaja en la respuesta como
  `tipoRelacion` y en la nomenclatura `origen`/`destino`.
- Si se usa una biblioteca de grafos para el dibujo, dibuja el resultado que entrega el backend. No
  calcula recorridos, ciclos ni órdenes con ella, y el cálculo sigue prohibiendo su uso para los
  algoritmos principales (`AGENTS.md`).

## 3. Convenciones de nomenclatura

| Lenguaje | Reglas |
| -------- | ------ |
| Python (backend y pruebas) | `snake_case` para módulos, funciones, métodos, atributos y variables. `PascalCase` para clases y excepciones. `UPPER_SNAKE_CASE` para constantes. Prefijo `_` para elementos privados. Anotaciones de tipo con nombres en `PascalCase`. |
| TypeScript y TSX (frontend y pruebas) | `camelCase` para funciones, variables y hooks. `PascalCase` para componentes, tipos e interfaces. `UPPER_SNAKE_CASE` para constantes y miembros de `enum`. Prefijo `use` para hooks. |
| JSON en el contrato HTTP | `lowerCamelCase` para los campos de la API (regla del contrato, no del lenguaje). Ver 3.1. |

### 3.1 Frontera entre el código Python y el JSON de la API

El backend escribe en `snake_case` y el JSON viaja en `lowerCamelCase`. Son dos convenciones
distintas porque pertenecen a capas distintas, y la traducción ocurre **solo en la capa
de infraestructura HTTP**:

| Elemento | Forma en Python | Forma en el JSON de la API |
| -------- | --------------- | -------------------------- |
| Identificador de elemento | `elemento.id` | `id` |
| Tipo | `elemento.tipo` | `tipo` |
| Nombre | `elemento.nombre` | `nombre` |
| Descripción | `elemento.descripcion` | `descripcion` |
| Extremo que habilita | `dependencia.origen` | `origen` |
| Extremo habilitado | `dependencia.destino` | `destino` |
| Nombre de la relación | `dependencia.tipo_relacion` | `tipoRelacion` |
| Colección de elementos | `resultado.elementos` | `elementos` |
| Total de elementos | `resultado.total` | `total` |
| Resumen del grafo | `resumen.total_elementos` | `resumen.totalElementos` |
| Resumen del grafo | `resumen.total_dependencias` | `resumen.totalDependencias` |
| Código de error | `error.codigo` | `codigo` |
| Detalles de error | `error.detalles[].campo` | `detalles[].campo` |

Reglas que se derivan de esta frontera:

1. Ningún identificador de Python (módulo, clase, función, método, atributo, constante, parámetro)
   se escribe en `camelCase`. Los modelos de la capa HTTP que reciben y devuelven JSON también
   usan nombres Python en `snake_case`; el `camelCase` es únicamente la formaserializada.
2. La traducción entre `snake_case` y `lowerCamelCase` ocurre en un solo lugar de la capa de
   infraestructura y no se repite en cada ruta ni en cada esquema.
3. El dominio no conoce los nombres del JSON: no aparece `tipoRelacion` en el modelo de dominio,
   sino `tipo_relacion`. Los nombres del contrato no se propagan hacia adentro.
4. El frontend consume directamente los nombres `lowerCamelCase` de la API, que coinciden con su
   convención `camelCase`, de modo que no necesita una conversión adicional.
5. Los nombres del sobre de error (`codigo`, `mensaje`, `detalles`, `campo`) también cumplen
   `lowerCamelCase`, pero no llevan separador de palabras, por lo que la traducción es la identidad.

Motivo de la elección: `lowerCamelCase` es el estándar de facto de las APIs JSON y coincide con la
convención `camelCase` del frontend exigida en `AGENTS.md`, mientras que el backend conserva
`snake_case` intacto. La alternativa snake_case en el JSON obligaría al frontend a apartarse de su
convención o a añadir una conversión que no aporta valor.

Vocabulario obligatorio y coherente en código, API, pruebas y textos de la interfaz:

| Concepto | Nombre en Python y en el dominio | Nombre en el JSON de la API |
| -------- | --------------------------------- | --------------------------- |
| Elemento del catálogo | `elemento` / `Elemento` | `elementos` |
| Tipo | `tipo` / `TipoElemento` | `tipo` |
| Dependencia | `dependencia` / `Dependencia` | `dependencias` |
| Extremo que habilita | `origen` | `origen` |
| Extremo habilitado | `destino` | `destino` |
| Nombre de la relación | `tipo_relacion` | `tipoRelacion` |
| Total de elementos | `total_elementos` | `totalElementos` |
| Total de dependencias | `total_dependencias` | `totalDependencias` |

No se usan términos intercambiables como «nodo», «nodo raíz», «padre», «hijo» o «dependiente» para
designar un elemento del catálogo.

## 4. Restricciones técnicas

| ID | Restricción | Origen |
| -- | ----------- | ------ |
| C-01 | Backend en Python 3.12 o superior, con entorno virtual y dependencias declaradas en `requirements.txt`. | `AGENTS.md` |
| C-02 | API REST consumida por el frontend; backend y frontend deben poder ejecutarse juntos. | `AGENTS.md` |
| C-03 | Frontend en React y TypeScript. | `AGENTS.md` |
| C-04 | La representación del grafo y sus operaciones se implementan en el proyecto. NetworkX no se usa para recorridos, ciclos, impactos, caminos, ordenamientos topológicos ni ningún algoritmo principal; solo para visualizar resultados ya calculados. | `AGENTS.md`, `brief.md` |
| C-05 | Solo datos sintéticos y coherentes con el dominio. | `AGENTS.md`, `brief.md` |
| C-06 | Cada funcionalidad es trazable de extremo a extremo: regla de negocio → modelo → backend → API → frontend → resultado observable. | `AGENTS.md` |
| C-07 | Los errores no se ocultan ni se convierten en resultados aparentemente válidos. | `AGENTS.md` |

## 5. Trazabilidad de extremo a extremo de F1

| Regla de negocio | Modelo | Caso de uso | API | Interfaz | Resultado observable |
| ---------------- | ------ | ----------- | --- | -------- | -------------------- |
| Un elemento tiene identificador único, tipo y nombre | Modelo de elemento y catálogo del dominio | Crear elemento | `POST /api/v1/elementos` | Formulario de alta de elemento | El nuevo elemento aparece en el listado y en la red |
| Una dependencia solo existe entre elementos válidos | Grafo dirigido e invariantes | Registrar dependencia | `POST /api/v1/dependencias` | Formulario de alta de dependencia | La arista aparece en la red con `origen` y `destino` visibles |
| No hay relaciones duplicadas | Adyacencias con semántica de conjunto | Registrar dependencia | `POST /api/v1/dependencias` | Mensaje de error mostrado | El total de dependencias no cambia |
| Los datos mal formados se rechazan | Reglas de validación del dominio | Todos los casos de uso | Todos los endpoints | Mensaje de error con el campo | El formulario señala el campo y el catálogo queda intacto |
| La red se puede consultar | Representación del grafo con adyacencias | Obtener grafo | `GET /api/v1/grafo` | Visualización de la red | Nodos y flechas en la dirección `origen → destino` |
| La dirección de las relaciones es explícita | Metadato `tipoRelacion` | Listar dependencias | `GET /api/v1/dependencias` | Rotulación de las flechas | Cada flecha indica qué habilita a qué |

## 6. Decisiones relacionadas

Las decisiones que sustentan estas restricciones están registradas en `docs/decisions/analyst.md`.
Las decisiones de estructura de código, elección de framework y de persistencia concreta
corresponden a `backend-builder` y `frontend-builder` en sus propios archivos de registro.