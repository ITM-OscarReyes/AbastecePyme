# Arquitectura y calidad — AbastecePyme (F1, F2 y F3)

Este documento operacionaliza para F1, F2 y F3 las reglas obligatorias de `AGENTS.md` (Clean
Architecture, SOLID, Clean Code, nomenclatura y prohibición de NetworkX) y las hace verificables.

- Requisitos de calidad asociados: `requirements.md`, sección 5 (`RNF-Q-01` a `RNF-Q-08`) para F1,
  `requirements.md` §9 (`RNF-F2-01` a `RNF-F2-03`) para F2, `requirements.md` §11
  (`RNF-F3-01` a `RNF-F3-05`) para F3 y `requirements.md` §12 (`RF-UI-01` a `RNF-UI-06`) para la
  presentación transversal.
- Verificación: `acceptance-criteria.md` (AC-F1-21 a AC-F1-23 para F1; AC-F2-09 para F2;
  AC-F3-11 a AC-F3-14 para F3; AC-UI-01 a AC-UI-18 para la presentación).
- Las secciones 1 a 6 son de F1, la sección 7 es de F2, la sección 8 es de F3 y la sección 9 es
  transversal a la presentación de F1, F2 y F3. F2 y F3 no modifican ninguna regla de F1, y la
  sección 9 no modifica reglas de negocio, modelo ni contrato.

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
| **Dominio** | Reglas de negocio de F1, F2 y F3, y estructura del grafo | Modelo de elemento y tipo, modelo de dependencia, representación del grafo con sus invariantes, matriz de tipos y asociación del insumo, reglas de validación del catálogo, catálogo de errores de negocio, recorrido de impacto, DAG, Kahn, SCC y plan de entrega, puertos de salida | Conocimiento del framework HTTP, del sistema de archivos o de la base de datos; formato de la petición o de la respuesta |
| **Aplicación** | Orquestación de casos de uso | Casos de uso de F1 (crear elemento, listar elementos, obtener elemento, registrar dependencia, listar dependencias, obtener grafo, obtener reglas de dependencia), F2 (consultar impacto) y F3 (diagnóstico global y plan de entrega), objetos de entrada y salida de aplicación | Validación duplicada del dominio, decisiones de transporte (códigos HTTP, cabeceras), detalles de persistencia |
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
| Matriz de tipos permitida y comprobación de asociación del `INSUMO` | Dominio (definición única, `RNF-F1-10`) |
| Exposición de la matriz (`GET /reglas-dependencia`) | Infraestructura (rutas API), derivada de la definición de dominio |
| Cálculo de DAG y orden de producción topológico (Kahn) | Dominio |
| Detección de SCC y reporte de un ciclo representativo por región cíclica | Dominio |
| Cálculo del subgrafo de requisitos y del plan de entrega | Dominio |
| Exposición de `/orden-produccion` y `/plan-entrega` | Infraestructura (rutas API) |
| Casos de uso `ObtenerDiagnosticoGlobal` y `ObtenerPlanEntrega` | Aplicación |
| Recorridos de impacto (F2) | Dominio (F2); F3 no los reutiliza |

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
- Para F3, el frontend consume `GET /api/v1/plan-entrega` y `GET /api/v1/orden-produccion` y
  representa los pasos, los estados de producto, el orden global y la alerta de ciclos tal como
  llegan. No calcula el plan, no detecta ciclos, no ordena topológicamente y no decide qué producto
  está bloqueado (`RNF-F3-04`).
- Los textos visibles se rigen por `requirements.md` §12: lenguaje natural de operación de planta,
  sin jerga técnica. La traducción de códigos y resultados a lenguaje de negocio es una
  responsabilidad de presentación y no puede cambiar el significado de la respuesta ni introducir
  reglas. La guía integrada se mantiene coherente con la matriz vigente y no es una segunda fuente
  de la matriz. La estrategia de presentación se detalla en la sección 9.

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
| Es DAG | `es_dag` | `esDag` |
| Orden de producción | `orden` | `orden` |
| Paso de producción | `paso` | `paso` |
| Total de pasos | `total_pasos` | `totalPasos` |
| Ciclo detectado | `ciclo` / `CicloDetectado` | `ciclos[].secuencia` |
| Secuencia de un ciclo | `secuencia` | `secuencia` |
| Elementos bloqueados | `elementos_bloqueados` | `elementosBloqueados` |
| Productos bloqueados | `productos_bloqueados` | `productosBloqueados` |
| Productos planificables | `productos_planificables` | `productosPlanificables` |
| Plan de entrega | `plan_entrega` | `plan-entrega` (ruta); respuesta sin campo contenedor |
| Producto solicitado en una entrega | `producto_entrega` / `ProductoEntrega` | `productos[]` |
| Estado del producto en la entrega | `estado` (`PLANIFICABLE`, `BLOQUEADO`) | `estado` |
| Indicador del conjunto | `es_planificable` | `esPlanificable` |
| Matriz de tipos | `reglas_dependencia` | `reglas` |

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
| Solo se permiten las combinaciones de tipos de la matriz | Definición única de matriz y asociación en el dominio | Registrar y editar dependencia; obtener reglas | `POST/PUT /api/v1/dependencias`; `GET /api/v1/reglas-dependencia` | Selector de tipos y motivo del rechazo | La relación se rechaza o se registra según la matriz, y la interfaz muestra el mismo veredicto |

## 6. Decisiones relacionadas

Las decisiones que sustentan estas restricciones están registradas en `docs/decisions/analyst.md`.

Las decisiones de estructura de código, elección de framework y de persistencia concreta
corresponden a `backend-builder` y `frontend-builder` en sus propios archivos de registro.

## 7. Relevancia para F2 — Análisis de impacto

F2 no abre capas nuevas: reutiliza el catálogo, el grafo, los casos de uso y los puertos de
persistencia de F1. Lo único que añade es un cálculo sobre el grafo ya existente.

| Aspecto | Ubicación obligatoria |
| ------- | ---------------------- |
| Regla «alcanzar» y definición del conjunto de afectados | Dominio |
| Recorrido de alcanzables hacia adelante y manejo de visitados | Dominio |
| Definición de dependiente (existencia de arista entrante) | Dominio |
| Orquestación de la consulta de impacto | Aplicación (caso de uso) |
| Forma del JSON `Impacto` y traducción de `snake_case` a `lowerCamelCase` | Infraestructura (sección 3.1) |
| Traducción de `ERR-02` y `ERR-05` a `404` y `422` | Infraestructura |
| Detección de ciclos y orden de preparación | **Fuera de F2** (F3) |

Reglas transversales de F2:

- El caso de uso de aplicación **no** implementa el recorrido: expresa la consulta y el resultado
  en términos del dominio.
- La capa HTTP no decide qué elementos son afectados, no invierte la dirección y no filtra por tipo.
- El recorrido es propio del proyecto: no se introduce ninguna biblioteca de grafos para el cálculo.
  NetworkX solo puede usarse para visualizar un resultado ya calculado.
- Si el frontend llega a exponer el impacto, consume el resultado del backend y no recalcula los
  alcanzables, no invierte la dirección y no filtra por reglas propias.
- El cálculo de impacto no altera el modelo de F1: no añade elementos, aristas ni atributos, y no
  modifica la dirección definida.

## 8. Relevancia para F3 — Orden de producción y ciclos

F3 tampoco abre capas nuevas: reutiliza el catálogo, el grafo y los puertos de F1. Añade dos
cálculos sobre el grafo existente y dos casos de uso.

| Aspecto | Ubicación obligatoria |
| ------- | ---------------------- |
| Verificación de DAG y ordenamiento topológico (Kahn) | Dominio |
| Cálculo de SCC y ciclo representativo por región cíclica | Dominio |
| Subgrafo de requisitos de un producto y plan de entrega | Dominio |
| Determinismo: desempate por `id` y orden de ciclos por menor `id` de la SCC | Dominio |
| Orquestación del diagnóstico global y del plan de entrega | Aplicación (casos de uso) |
| Forma del JSON `OrdenProduccionRespuesta` y `PlanEntregaRespuesta` | Infraestructura (sección 3.1) |
| Traducción de `ERR-02`, `ERR-04` y `ERR-05` | Infraestructura |
| Ciclos como resultado de negocio (`200`) | Infraestructura: no los convierte en error HTTP |
| Cálculo de orden o de ciclos en el frontend | **Prohibido** (`RNF-F3-04`) |

Reglas transversales de F3:

- El dominio calcula; la aplicación orquesta; la infraestructura solo valida el transporte, traduce
  errores y serializa.
- Un ciclo no es un fallo de la petición: el diagnóstico global y el plan de entrega responden `200`
  con `esDag: false` o `esPlanificable: false` y las listas estructuradas. `ERR-10` no se emite.
- El plan de entrega y el diagnóstico global son consultas distintas: el primero calcula el
  subgrafo de los productos solicitados; el segundo evalúa la red completa.
- No se usa NetworkX ni otra biblioteca de grafos para DAG, Kahn, SCC, ciclos ni planes. Solo puede
  usarse para dibujar un resultado ya calculado.
- El frontend representa el plan, los estados, el orden global y la alerta de ciclos tal como llegan
  de la API; no recalcula ni reinterpreta las reglas.
- El determinismo es verificable: mismo catálogo y misma selección producen el mismo JSON.

## 9. Estrategia de presentación (transversal a F1, F2 y F3)

Esta sección aplica a la presentación de F1, F2 y F3. No añade capas nuevas ni cambia las reglas de
negocio: define cómo se organiza la interfaz para cumplir `requirements.md` §12 y
`acceptance-criteria.md` §10. La implementación concreta (componentes, valores de color y estructura
de archivos) corresponde a `frontend-builder`.

### 9.1 Límites de responsabilidad

- El frontend conserva las tres responsabilidades de la sección 2: cliente de API, estado y
  componentes. Ninguna de ellas incorpora reglas de negocio ni algoritmos del backend.
- **Los textos visibles son una responsabilidad de presentación.** Un catálogo centralizado de
  textos puede mapear códigos estables (`ERR-nn`), estados y resultados estructurados a lenguaje de
  negocio. Ese mapeo no reinterpreta el resultado, no lo convierte en éxito y no inventa reglas: el
  significado sigue viniendo del backend.
- **La guía integrada es contenido explicativo, no una segunda fuente de la matriz.** Sus
  afirmaciones sobre las relaciones permitidas deben coincidir con `GET /api/v1/reglas-dependencia`,
  cuya definición única vive en el dominio (`RNF-F1-10`). Puede consumir el endpoint o mantener texto
  estático, pero en ambos casos se verifica contra la misma definición.
- La presentación de F3 consume las dos consultas reales y no calcula orden, ciclos, estados ni
  planes. La expectativa de interfaz y su dependencia del contrato nuevo están en
  `requirements.md` §11.9 y en la sección 9.5.

### 9.2 Shell, ancho de datos y ancho de lectura

| Elemento | Regla de layout |
| -------- | --------------- |
| Shell de la aplicación | Ocupa todo el ancho y todo el alto del viewport. El header, el fondo y las barras no usan un contenedor global centrado (`max-w-7xl mx-auto`). El área principal usa `flex-1 min-h-0` o equivalente |
| Vistas de datos | Catálogo/tabla, red de dependencias y pasos de producción usan el ancho disponible del shell, con el padding definido |
| Bloques de lectura | Párrafos, formularios y mensajes conservan un ancho máximo de lectura (objetivo 60 a 75 caracteres por línea, rango 45 a 80) y se alinean dentro del shell, no se centran como página |
| Header | Se reorganiza en dos filas o con navegación colapsable; no amontona logo, pestañas, estado, ayuda, tema y las dos acciones en una fila |
| Navegación móvil | Por debajo de 768 px existe un menú accesible para las cuatro secciones; no se acepta `hidden md:flex` sin alternativa |
| Alturas | El grafo y los paneles usan `flex`, `min-h-0`, `dvh` o porcentajes, sin alturas fijas en píxeles |

La distinción entre «ancho completo» y «ancho de lectura» es deliberada: los datos se benefician del
espacio disponible, pero el texto corrido no debe superar una medida legible.

### 9.3 Tokens semánticos de color

Los colores se definen una sola vez como **variables CSS semánticas** por tema, no como valores
repetidos en componentes. Las categorías mínimas son: superficies, texto, bordes, acentos y estados
(selección, alerta de stock, impacto y dependencia circular), además del anillo de foco. Los nombres
concretos y los valores los decide `frontend-builder`.

Reglas:

1. Tailwind referencia las variables CSS (directamente o mediante su configuración de tema). No se
   escriben colores hexadecimales, `rgb` o `hsl` en los componentes.
2. La paleta de Cytoscape lee las mismas variables semánticas. El grafo no mantiene una segunda
   paleta hardcodeada ni colores del tema anterior tras el cambio de tema.
3. El tema oscuro conserva sus valores aprobados. El tema claro se ajusta dentro de los criterios de
   sobriedad y contraste de `requirements.md` §12.4.
4. El cambio de tema actualiza la interfaz y el grafo de forma consistente; no hay componentes que
   queden con colores del tema anterior.

### 9.4 Accesibilidad y responsive

- Contraste WCAG AA en el tema claro: 4.5:1 para texto normal y 3:1 para texto grande y componentes
  de interfaz. Foco visible en todos los elementos interactivos.
- Los estados no dependen solo del color: selección, alerta de stock, impacto y dependencia circular
  incluyen icono, texto, borde, patrón o etiqueta.
- Breakpoints de verificación: 360, 768, 1024, 1440 y 1920 px de ancho; alturas de referencia 640,
  800 y 1080 px.
- Sin scroll horizontal no intencional en la página. Una tabla puede tener desplazamiento interno
  intencional, pero la página no se desplaza horizontalmente.
- Objetivos táctiles principales de al menos 44 × 44 px CSS en móvil.

### 9.5 Presentación de F3 y dependencia del backend

La vista de F3 debe presentar dos resultados distintos: el **plan de entrega** de uno o varios
productos y el **control general de planta**. El detalle funcional está en `requirements.md` §11.9.
Reglas de presentación:

- El plan de entrega muestra pasos numerados, el estado `PLANIFICABLE` o `BLOQUEADO` de cada
  producto solicitado y, si hay bloqueo, una alerta visible con lo que se puede preparar igual.
- El control general muestra el orden global cuando la planta es planificable y, cuando no lo es,
  una alerta visible con las dependencias circulares, los elementos y productos bloqueados y los
  productos planificables. No muestra un orden parcial.
- La vista no calcula ni simula esos resultados. Mientras el backend no implemente
  `api-contract.md` §3.7 y §3.8, el rediseño de la vista y la sección de F3 de la guía quedan
  bloqueados (`AMB-UI-02`). La guía no describe como disponible un comportamiento que la interfaz no
  ofrece.

### 9.6 Verificación

La verificación de esta estrategia corresponde a `tester` mediante `acceptance-criteria.md` §10. La
revisión de tokens, textos y separación de responsabilidades es estática; las comprobaciones de
layout, contraste y navegación se hacen sobre la interfaz renderizada en los breakpoints indicados.
`auditor` puede auditar la trazabilidad entre `requirements.md` §12, esta sección y los criterios
AC-UI.