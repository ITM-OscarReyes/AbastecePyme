# Requisitos técnicos — AbastecePyme

Especificación técnica derivada de `docs/brief.md`.

- **Fuente de verdad:** `docs/brief.md`.
- **Alcance de este documento:** **F1 — Catálogo de dependencias**, **F2 — Análisis de impacto**,
  **F3 — Orden y ciclos de producción** y los **requisitos transversales de interfaz de usuario** de
  la sección 12, que aplican a la presentación de F1, F2 y F3 sin alterar sus reglas de negocio.
- **Features fuera de este documento:** F4 **no** se especifica aquí. Solo se menciona como
  consumidor del modelo de datos cuando F1, F2 o F3 dejan una consecuencia que debe respetarse. Su
  especificación requerirá una ampliación posterior de este documento por `analyst`.
- **Documentos relacionados:** `graph-model.md` (dirección, representación, DAG y algoritmos de orden y ciclos),
  `api-contract.md` (contrato HTTP), `architecture.md` (capas, calidad y estrategia de presentación),
  `acceptance-criteria.md` (verificación).

## 1. Convenciones de identificación

| Prefijo | Elemento |
| ------- | -------- |
| `RF-F1-nn` | Requisito funcional de F1 |
| `RNF-F1-nn` | Requisito no funcional de F1 |
| `RF-F3-nn` | Requisito funcional de F3 |
| `RNF-F3-nn` | Requisito no funcional de F3 |
| `RNF-Q-nn` | Requisito de calidad y arquitectura, verificable |
| `RF-UI-nn` | Requisito funcional de presentación, transversal a F1, F2 y F3 |
| `RNF-UI-nn` | Requisito no funcional de presentación, transversal a F1, F2 y F3 |
| `AC-F1-nn` | Criterio de aceptación de F1 (ver `acceptance-criteria.md`) |
| `AC-F3-nn` | Criterio de aceptación de F3 (ver `acceptance-criteria.md`) |
| `AC-UI-nn` | Criterio de aceptación de presentación (ver `acceptance-criteria.md` §10) |
| `ERR-nn` | Error del catálogo o de producción (ver `api-contract.md`) |
| `AMB-F1-nn` | Ambigüedad o decisión pendiente de F1 |
| `AMB-F3-nn` | Ambigüedad o decisión pendiente de F3 |
| `AMB-UI-nn` | Ambigüedad o decisión pendiente de presentación |

## 2. Necesidades de negocio de F1

Extraídas literalmente del brief y de los usuarios declarados.

| Necesidad | Origen |
| --------- | ------ |
| N1. El equipo puede registrar productos, insumos, proveedores y procesos con tipo e identificador único | brief F1, valor de negocio y primer punto de «Debe permitir» |
| N2. Solo se registran dependencias entre elementos válidos (existentes) | brief F1, segundo punto de «Debe permitir» |
| N3. Se validan relaciones repetidas y datos mal formados | brief F1, tercer punto de «Debe permitir» |
| N4. La red de dependencias se muestra mediante API e interfaz mínima | brief F1, cuarto punto de «Debe permitir» |
| N5. La dirección de las aristas y la representación del grafo quedan justificadas y documentadas | brief F1, quinto punto de «Debe permitir» y sección «Alcance» |
| N6. Cada relación tiene una interpretación clara del tipo «A requiere B» / «B habilita A» | brief, sección «Alcance» |
| N7. El responsable de compras registra proveedores, insumos y dependencias | brief, «Usuarios» |
| N8. Se usan únicamente datos sintéticos y coherentes con el dominio | brief, «Alcance»; `AGENTS.md`, restricciones |

## 3. Requisitos funcionales de F1

| ID | Requisito | Necesidad | Criterio |
| -- | --------- | --------- | -------- |
| RF-F1-01 | El sistema debe permitir crear un elemento del catálogo con identificador, tipo y nombre. | N1 | AC-F1-01 |
| RF-F1-02 | El identificador de un elemento debe ser único en todo el catálogo, con independencia de su tipo. | N1 | AC-F1-02 |
| RF-F1-03 | El tipo de un elemento debe pertenecer a un conjunto cerrado y definido: `PROVEEDOR`, `INSUMO`, `PRODUCTO`, `PROCESO`. La matriz de combinaciones de tipos permitida se define en RF-F1-17. | N1 | AC-F1-03 |
| RF-F1-04 | El sistema debe permitir listar los elementos del catálogo, con orden determinista y filtro opcional por tipo. | N1 | AC-F1-04 |
| RF-F1-05 | El sistema debe permitir consultar un elemento por su identificador y distinguir entre existente e inexistente. | N1 | AC-F1-05 |
| RF-F1-06 | El sistema debe permitir registrar una dependencia dirigida entre dos elementos existentes, con la dirección definida en `graph-model.md` y respetando la matriz de tipos de RF-F1-17. | N2, N5, N6 | AC-F1-06 |
| RF-F1-07 | El sistema no debe registrar una dependencia cuyo origen y destino sean el mismo elemento. | N2 | AC-F1-07 |
| RF-F1-08 | El sistema no debe registrar dos dependencias con el mismo par (origen, destino); la red no admite relaciones duplicadas. | N3 | AC-F1-08 |
| RF-F1-09 | El sistema debe permitir listar las dependencias registradas indicando en cada una su origen, su destino y el tipo de relación. | N4, N5 | AC-F1-09 |
| RF-F1-10 | El sistema debe exponer la representación del grafo (nodos y aristas) derivada del estado real del catálogo, para su visualización. | N4, N5 | AC-F1-10 |
| RF-F1-11 | El sistema debe validar y normalizar los datos de entrada y rechazar los mal formados, indicando el campo afectado. | N3 | AC-F1-11 |
| RF-F1-12 | El sistema debe responder con errores explícitos y diferenciados ante datos duplicados, elementos inexistentes y datos inválidos; un error nunca se presenta como un resultado vacío o un resultado válido. | N3 | AC-F1-12 |
| RF-F1-13 | Un catálogo vacío o un elemento sin dependencias deben responder correctamente como resultado vacío, no como error. | N1, N3 | AC-F1-13 |
| RF-F1-14 | La interfaz mínima debe permitir dar de alta elementos y dependencias, listar el catálogo y visualizar la red, consumiendo exclusivamente resultados reales de la API. | N4, N8 | AC-F1-14 |
| RF-F1-15 | La representación del grafo debe estar disponible tanto en la capa de dominio como a través de la API, de modo que F1 no dependa de una estructura de terceros para exponer la red. | N5 | AC-F1-15 |
| RF-F1-16 | F1 debe registrar sin rechazo las dependencias que formen un ciclo; no las detecta, no las advierte y no reordena el catálogo por esa condición, porque la detección y el reporte de ciclos pertenecen a F3. | N3, N5 | AC-F1-16 |
| RF-F1-17 | El sistema debe permitir únicamente las combinaciones de tipos de la matriz vigente: `PROVEEDOR → INSUMO`, `INSUMO → PROCESO`, `PROCESO → INSUMO` y `PROCESO → PRODUCTO`. Cualquier otra combinación se rechaza. | N2, N5 | AC-F1-25, AC-F1-26 |
| RF-F1-18 | Un `INSUMO` debe tener al menos una arista entrante de un `PROVEEDOR` o de un `PROCESO` antes de poder ser origen de una dependencia hacia un `PROCESO`. Sin esa asociación, la relación se rechaza. | N2, N5 | AC-F1-28 |
| RF-F1-19 | Un `PRODUCTO` es terminal: no puede ser origen de ninguna dependencia. | N2, N5 | AC-F1-27 |
| RF-F1-20 | Las aristas entrantes de un elemento son requisitos conjuntos (semántica AND): si tiene varias, requiere todas. El modelo no representa alternativas OR. | N2, N5 | AC-F1-30 |
| RF-F1-21 | No se admite una dependencia directa `PROCESO → PROCESO`; la secuencia entre procesos se modela con un `INSUMO` intermedio (`PROCESO → INSUMO → PROCESO`). | N2, N5 | AC-F1-29 |
| RF-F1-22 | El sistema debe exponer la matriz completa de las 16 combinaciones de tipos, con su veredicto y su motivo, para que la interfaz la muestre antes de crear o editar una relación. | N5, N6 | AC-F1-31 |

### 3.1 Detalle de los requisitos funcionales

**RF-F1-01 — Creación de elementos.** Un elemento es la unidad del catálogo. Campos:

| Campo | Obligatorio | Regla |
| ----- | ----------- | ----- |
| `id` | Sí | Texto. Se normaliza recortando espacios y pasando a mayúsculas. Debe cumplir el patrón `^[A-Z0-9][A-Z0-9_-]{2,39}$` (entre 3 y 40 caracteres). |
| `tipo` | Sí | Texto. Se normaliza a mayúsculas. Debe ser uno de `PROVEEDOR`, `INSUMO`, `PRODUCTO`, `PROCESO`. |
| `nombre` | Sí | Texto. Se normaliza recortando espacios. Entre 3 y 80 caracteres y no vacío tras recortar. |
| `descripcion` | No | Texto opcional de hasta 300 caracteres. Puede ser nulo o ausente. |

F1 no define ningún otro atributo. Cualquier campo no reconocido en la entrada se rechaza (ver
RF-F1-11 y `ERR-03`).

**RF-F1-02 — Identificador único.** La unicidad del `id` es del catálogo completo, no por tipo: un
`PROVEEDOR` y un `PRODUCTO` no pueden compartir `id`. El sistema no genera identificadores: los
recibe del cliente. Si el `id` ya existe, el sistema responde con `409` y `ERR-01`, y el catálogo no
se modifica. La unicidad del `nombre` no es un requisito: nombres repetidos entre elementos con
`id` distinto son válidos (ver `AMB-F1-03`).

**RF-F1-03 — Tipos de elemento.** El conjunto de tipos es cerrado. Un tipo fuera del conjunto se
rechaza con `422` y `ERR-04`. El tipo de un elemento no limita por sí solo sus relaciones: las
combinaciones permitidas entre tipos se definen en la matriz de RF-F1-17, que se aplica al registrar
y editar dependencias. La matriz sustituye la ausencia de restricciones que documentaba
`AMB-F1-04`.

**RF-F1-04 — Listado de elementos.** El listado devuelve todos los elementos ordenados por `id`
en orden ascendente, de forma determinista. Admite un parámetro opcional de filtro por tipo. El
resultado incluye el total de elementos devueltos.

**RF-F1-05 — Consulta de un elemento.** La consulta por `id` devuelve el elemento si existe y un
error `404` con `ERR-02` si no existe. Un `id` mal formado se responde con `422` y `ERR-05`, nunca
con `404`, para no confundir «mal formado» con «inexistente».

**RF-F1-06 — Registro de dependencias.** La dependencia se expresa como un par ordenado
`(origen, destino)` con la semántica definida en `graph-model.md`: **el origen habilita al
destino**; es decir, «para producir o preparar el destino, necesito el origen». Ambos extremos deben
existir en el catálogo. Si alguno no existe, el sistema responde `404` con `ERR-02`, indicando en
`detalles` qué campo lo referencia, y no registra nada. La combinación de tipos debe pertenecer a la
matriz de RF-F1-17; si no, se rechaza con `422` y `ERR-07` (ver RF-F1-17 a RF-F1-21). Las
dependencias inversas entre los mismos dos elementos (`A→B` y `B→A`) son relaciones **distintas** y
ambas se registran cuando la matriz las permite: forman un ciclo y su detección y reporte pertenecen
a F3 (ver RF-F1-16 y `AMB-F1-05`).

**RF-F1-07 — Dependencia reflexiva.** `origen` igual a `destino` se rechaza con `422` y `ERR-07`.

**RF-F1-08 — Dependencia duplicada.** El par `(origen, destino)` identifica de forma única una
dependencia. Repetirlo se responde con `409` y `ERR-08`, y el número de dependencias del catálogo no
cambia. No se admiten aristas paralelas ni dependencias con atributos, por lo que no hay forma de
registrar dos relaciones iguales con datos distintos.

**RF-F1-09 — Consulta de dependencias.** El listado de dependencias devuelve, para cada relación,
el `origen`, el `destino` y el `tipoRelacion` con el valor constante `habilita`, de modo que el
consumidor no tiene que interpretar la dirección. Admite filtro opcional por `origen` o por
`destino`.

**RF-F1-10 — Representación del grafo.** La API expone el grafo completo tal como está en el
catálogo: la lista de elementos y la lista de dependencias. No se calculan recorridos, niveles,
ciclos ni órdenes: F1 solo entrega estructura. El grafo se construye en la capa de dominio del
proyecto, sin depender de NetworkX ni de otra biblioteca de grafos (ver `RNF-F1-03`).

**RF-F1-11 — Validación de entrada.** La validación ocurre antes de modificar el catálogo: si una
solicitud es inválida, el catálogo queda intacto. La validación cubre campos obligatorios
ausentes, campos con tipo incorrecto, campos de texto que no cumplen su regla de formato, campos
numéricos no admitidos en F1 y campos no reconocidos. Cada respuesta de validación indica el campo
afectado (ver `api-contract.md`, sección de errores).

**RF-F1-12 — Errores explícitos.** Ninguna condición de error se resuelve devolviendo una lista
vacía, un `200` con resultado parcial ni un mensaje genérico. Cada error tiene un código estable
(`ERR-01` a `ERR-09`), un mensaje legible y, cuando aplica, el detalle del campo.

**RF-F1-13 — Estados vacíos.** Catálogo sin elementos, listado sin coincidencias para el filtro
aplicado y elemento sin dependencias son resultados válidos: se responden con `200` y colecciones
vacías.

**RF-F1-14 — Interfaz mínima.** La interfaz de F1 ofrece, como mínimo: alta de elemento, alta de
dependencia, listado del catálogo y visualización de la red. Todo dato mostrado proviene de la API
real; no se incluyen datos de ejemplo embebidos en el frontend que representen resultados
funcionales. Los errores del backend se muestran al usuario sin reinterpretarlos como estado vacío.

**RF-F1-15 — Representación propia del grafo.** El catálogo y su representación dirigida se
implementan en la capa de dominio del proyecto. F1 no necesita ningún algoritmo de grafos: solo
inserción de aristas, consulta de adyacencia y listado. No debe introducirse una biblioteca de
grafos para construir el grafo.

**RF-F1-16 — F1 no valida la ausencia de ciclos.** Registrar una combinación de dependencias que
forme un ciclo es un registro válido en F1. F1 no rechaza, no advierte y no reordena el catálogo por
esa condición. Detectar y reportar ciclos pertenece a F3; esta exclusión es explícita para evitar
que el catálogo se comporte como si tuviera una regla de producción que el brief no define en F1.
Con la matriz de RF-F1-17, los únicos ciclos posibles son los que alternan `INSUMO` y `PROCESO`.

**RF-F1-17 — Matriz de tipos permitida.** La matriz vigente se define en `graph-model.md` §4.1:

| Tipo de origen | Tipos de destino permitidos |
| -------------- | --------------------------- |
| `PROVEEDOR` | `INSUMO` |
| `INSUMO` | `PROCESO` |
| `PROCESO` | `INSUMO`, `PRODUCTO` |
| `PRODUCTO` | Ninguno (terminal) |

De las 16 combinaciones posibles, 4 están permitidas y 12 se rechazan con `422` y `ERR-07`
(`DEPENDENCIA_INVALIDA`), indicando el campo `destino` y el motivo. El rechazo no modifica el
catálogo. La misma matriz se aplica al alta (`POST /dependencias`) y a la edición
(`PUT /dependencias/{origen}/{destino}`). La matriz proviene de una solicitud explícita del cliente
(sección 10.1) y no de una inferencia del brief original.

**RF-F1-18 — Asociación previa del insumo.** Un `INSUMO` solo puede ser origen de `INSUMO → PROCESO`
si ya tiene al menos una arista entrante de un `PROVEEDOR` (`PROVEEDOR → INSUMO`) o de un `PROCESO`
(`PROCESO → INSUMO`). Si no la tiene, la relación se rechaza con `422` y `ERR-07`, con el detalle en
el campo `origen`. La comprobación se hace contra el estado actual del catálogo, antes de insertar
la arista. No se exige que todo `INSUMO` tenga proveedor en el alta: un insumo aislado sigue siendo
válido (sección 5 de `graph-model.md`).

**RF-F1-19 — Producto terminal.** Un `PRODUCTO` no puede ser origen de ninguna dependencia. Cualquier
combinación que lo use como origen se rechaza con `422` y `ERR-07`. Un producto sí puede recibir
aristas de un `PROCESO` (`PROCESO → PRODUCTO`), que es la única forma de generarlo según la matriz.

**RF-F1-20 — Semántica AND de las aristas entrantes.** Si un elemento tiene varias aristas
entrantes, todas son requisitos simultáneos: el elemento requiere todos sus orígenes, no una
alternativa. El modelo no representa «A o B»; una relación OR sería una regla de negocio nueva y
queda fuera de alcance (`AMB-F1-08`). La consecuencia en F3 es que el orden de preparación espera a
todos los requisitos antes de habilitar el elemento.

**RF-F1-21 — Secuencia entre procesos.** No se admite `PROCESO → PROCESO`. Para encadenar dos
procesos se usa un `INSUMO` intermedio: `PROC-ARMAR → INS-SUBENSAMBLE → PROC-ENSAMBLAR`. El insumo
representa el subensamblaje que produce el primer proceso y consume el segundo. La combinación
`PROCESO → INSUMO` ya está permitida por RF-F1-17; esta regla solo prohíbe el atajo directo entre
procesos.

**RF-F1-22 — Matriz expuesta por la API.** `GET /api/v1/reglas-dependencia` devuelve las 16
combinaciones con `tipoOrigen`, `tipoDestino`, `permitida` y `motivo`. La interfaz la consulta para
mostrar, antes de crear o editar una relación, qué combinaciones son válidas y por qué. La respuesta
y la validación del dominio se generan desde la misma definición de la matriz (RNF-F1-10), de modo
que no pueden divergir.

## 4. Requisitos no funcionales de F1

| ID | Requisito | Criterio |
| -- | --------- | -------- |
| RNF-F1-01 | El backend se implementa en Python 3.12 o superior y expone una API REST. | AC-F1-24 |
| RNF-F1-02 | Las dependencias del backend se documentan en `requirements.txt` y el proyecto se ejecuta en un entorno virtual. | AC-F1-24 |
| RNF-F1-03 | La representación del grafo y cualquier operación de grafo propias del proyecto se implementan sin NetworkX. NetworkX solo puede usarse para visualizar resultados ya calculados por el backend, y F1 no requiere esa visualización. | AC-F1-15 |
| RNF-F1-04 | El contrato de API está versionado en el prefijo `/api/v1` y es estable para F1. | AC-F1-17 |
| RNF-F1-05 | Todas las respuestas son deterministas: mismo estado del catálogo produce la misma respuesta, con orden estable en listados. | AC-F1-18 |
| RNF-F1-06 | El frontend consume la API real y no duplica reglas de negocio ni algoritmos del backend. | AC-F1-14 |
| RNF-F1-07 | Solo se usan datos sintéticos coherentes con el dominio; ningún dato corresponde a personas, proveedores o operaciones reales. | AC-F1-19 |
| RNF-F1-08 | Los errores usan un sobre único y uniforme para todos los endpoints de F1. | AC-F1-12 |
| RNF-F1-09 | Las operaciones de catálogo y de red responden en tiempo lineal o mejor sobre el tamaño del caso de uso (hasta 200 elementos y 500 dependencias). | AC-F1-20 |
| RNF-F1-10 | La matriz de tipos y la asociación previa del insumo se definen en un único lugar del dominio; la validación de alta y edición y la respuesta de `GET /api/v1/reglas-dependencia` se derivan de esa misma definición, sin duplicarla en la capa HTTP ni en el frontend. | AC-F1-31, AC-F1-32 |

## 5. Requisitos de calidad y arquitectura

Estos requisitos operacionalizan las reglas obligatorias de `AGENTS.md` para que sean verificables.
Se basan en la separación de responsabilidades descrita en `architecture.md`.

| ID | Requisito | Criterio |
| -- | --------- | -------- |
| RNF-Q-01 | El dominio (elemento, dependencia, grafo, reglas y errores) no depende del framework HTTP ni de la forma de persistencia. | AC-F1-21 |
| RNF-Q-02 | Los casos de uso de aplicación no contienen lógica de validación de transporte ni de acceso a datos; expresan la operación en términos del dominio. | AC-F1-21 |
| RNF-Q-03 | El acceso a datos está detrás de una abstracción (puerto) definida hacia el interior y resuelta en infraestructura. | AC-F1-21 |
| RNF-Q-04 | No hay código duplicado entre la validación del dominio y la de la capa HTTP: cada regla de negocio se evalúa en un único lugar. | AC-F1-21 |
| RNF-Q-05 | El frontend separa cliente de API, estado y componentes; los componentes no contienen reglas de negocio del catálogo ni del grafo. | AC-F1-22 |
| RNF-Q-06 | Se respetan las convenciones de nomenclatura de `AGENTS.md` en Python y en TypeScript/TSX. El código Python es `snake_case` y ninguna forma serializada en JSON se propaga a los nombres del dominio o de la aplicación. | AC-F1-23, AC-F1-17 |
| RNF-Q-07 | Clases, funciones y componentes mantienen una responsabilidad única y un tamaño razonable; no se introducen abstracciones sin uso real. | AC-F1-23 |
| RNF-Q-08 | El vocabulario del dominio (elemento, tipo, dependencia, origen, destino, habilita) se usa de forma consistente en dominio, API y frontend. | AC-F1-23 |

## 6. Trazabilidad

`necesidad → requisito → criterio de aceptación → solución técnica`

| Necesidad | Requisitos | Criterios | Solución técnica |
| --------- | ---------- | --------- | ---------------- |
| N1. Registro de elementos con tipo e id único | RF-F1-01, RF-F1-02, RF-F1-03, RF-F1-04, RF-F1-05 | AC-F1-01 a AC-F1-05 | `POST/GET /api/v1/elementos`; aggregate `Elemento` y catálogo en dominio; validaciones en dominio |
| N2. Dependencias solo entre elementos válidos | RF-F1-06, RF-F1-07, RF-F1-17, RF-F1-18, RF-F1-19, RF-F1-20, RF-F1-21 | AC-F1-06, AC-F1-07, AC-F1-25 a AC-F1-30 | `POST /api/v1/dependencias`; caso de uso que valida existencia y matriz antes de insertar la arista |
| N3. Validación de repetidos y datos mal formados | RF-F1-08, RF-F1-11, RF-F1-12, RF-F1-13 | AC-F1-08, AC-F1-11 a AC-F1-13 | reglas de validación de dominio; sobre de error uniforme en `api-contract.md` |
| N4. Mostrar la red por API e interfaz mínima | RF-F1-09, RF-F1-10, RF-F1-14 | AC-F1-09, AC-F1-10, AC-F1-14 | `GET /api/v1/dependencias`, `GET /api/v1/grafo`; vista de catálogo y visualización en frontend |
| N5. Dirección y representación justificadas | RF-F1-15, RF-F1-06, RF-F1-22 | AC-F1-06, AC-F1-15, AC-F1-31 | `graph-model.md` §2 y §4.1; grafo dirigido propio en la capa de dominio; matriz expuesta por `GET /reglas-dependencia` |
| Ajuste de cliente 2026-10-25: matriz de tipos permitida | RF-F1-17 a RF-F1-22 | AC-F1-25 a AC-F1-32 | `graph-model.md` §4.1; validación de dominio única; `GET /api/v1/reglas-dependencia` |
| N6. Interpretación clara de cada relación | RF-F1-06, RF-F1-09 | AC-F1-06, AC-F1-09 | `tipoRelacion: "habilita"` en el contrato; dirección única documentada |
| N7. Uso del responsable de compras | RF-F1-01, RF-F1-06, RF-F1-14 | AC-F1-01, AC-F1-06, AC-F1-14 | formularios de alta en la interfaz mínima |
| N8. Datos sintéticos | RF-F1-14 | AC-F1-19 | conjunto de datos sintéticos de demostración; sin datos reales en el repositorio |

## 7. Ambigüedades y decisiones pendientes

No se inventan reglas de negocio. Cada punto queda explícito y requiere coordinación con `orchestrator`.

| ID | Ambigüedad o decisión pendiente | Por qué no se resuelve aquí | Impacto si se resuelve distinto |
| -- | ------------------------------- | ---------------------------- | ------------------------------ |
| AMB-F1-01 | `AGENTS.md` incluye «pesos inválidos» entre los casos que el sistema debe manejar, pero `docs/brief.md` no define ningún atributo numérico en F1 ni su regla de negocio. F1, por tanto, **no define pesos ni cantidades**. Si el cliente necesita cantidades por dependencia (por ejemplo, cuántos kilos de un insumo requiere un producto), hace falta una regla de negocio nueva (unidad, obligatoriedad, valores admitidos) que debe definirse antes de implementarla. | Definirla sería inventar una regla de negocio. | Cambiaría el modelo de `Dependencia` y las validaciones de F1. |
| AMB-F1-02 | El brief no exige persistencia de datos. F1 se puede resolver con almacenamiento en memoria. Si el cliente exige conservar el catálogo tras reiniciar el backend, hay que decidir tecnología de persistencia. | Es una decisión de producto, no derivable del brief. | No cambia el dominio ni el contrato; cambia el adaptador de infraestructura. |
| AMB-F1-03 | El brief exige identificador único, no nombre único. Se adopta que solo el `id` es único y que nombres repetidos son válidos. | Añadir unicidad de nombre sería una regla nueva. | Si el cliente exige nombres únicos, aparece un error nuevo y una validación adicional. |
| AMB-F1-04 | **Resuelta por el cliente (2026-10-25).** El brief original no declaraba restricciones sobre qué tipos de elemento pueden depender entre sí. El cliente definió la matriz de la sección 10.1, precisada en RF-F1-17 a RF-F1-22: 4 combinaciones permitidas y 12 rechazadas. La matriz sustituye la suposición anterior de que cualquier par de tipos era válido. | Ya no es una ambigüedad: hay una decisión explícita del cliente. | Se mantiene la trazabilidad del cambio en `docs/decisions/analyst.md`; la especificación vigente es la matriz de RF-F1-17. |
| AMB-F1-05 | F1 acepta dependencias que forman ciclos porque su detección pertenece a F3 (RF-F1-16). Debe confirmarse que el cliente acepta que el catálogo de F1 pueda contener una configuración imposible. | Es una frontera de alcance entre F1 y F3. | Si el cliente quiere que F1 rechace ciclos, F1 incororporaría una regla de F3 y la especificación de ambas features debería revisarse. |
| AMB-F1-06 | El brief menciona «proveedores, insumos y procesos internos» y «productos». Se adopta un tipo de primer nivel `PROCESO` para los procesos internos. | El brief no dice si un proceso es un tipo propio o un producto. | Si un proceso debe modelarse como `PRODUCTO`, cambia el conjunto de tipos y su documentación en la interfaz. |
| AMB-F1-07 | No se define si el listado de la red debe admitir filtros adicionales (por tipo de nodo, por prefijo de identificador) o paginación. F1 se limita al filtro por tipo en elementos y por `origen`/`destino` en dependencias. | El brief pide «interfaz mínima». | Si el catálogo crece, la paginación sería un requisito nuevo. |
| AMB-F1-08 | ¿Puede un elemento requerir «A o B» en lugar de «A y B»? La especificación adopta la semántica **AND** (RF-F1-20): varias aristas entrantes son requisitos simultáneos. No se representa ninguna alternativa OR. | El brief solo habla de dependencias dirigidas, sin operadores lógicos. Introducir un OR sería una regla de negocio nueva y cambiaría el modelo, la validación y F3. | Si el cliente necesita alternativas, hay que definir cómo se representan (nodo alternativo, atributo de grupo, etc.) y revisar F1 y F3. |
| AMB-F1-09 | `DependenciaNoEncontrada` (edición o borrado de una relación inexistente) se documenta en el dominio, pero el catálogo de errores de `api-contract.md` no le asigna un código `ERR-nn`. | Asignar un código es una decisión de contrato; inventarlo aquí alteraría el catálogo sin confirmación. | Hasta que se asigne, la respuesta usa el sobre de error común con un mensaje explícito, sin código `ERR-nn` nuevo. Si se asigna, hay que actualizar `api-contract.md` y los criterios de F1. |

## 8. Fuera de alcance de F1

Los siguientes puntos se mencionan para evitar que se implementen dentro de F1. Su especificación
corresponde a otras features y a decisiones posteriores de `analyst`.

- Recorridos de grafo, impacto y elementos alcanzados: F2 (especificado en la sección 9 de este documento).
- Detección de ciclos, orden topológico y orden de preparación: F3 (especificado en la sección 11 de este documento).
- Tablero integrado que reúna catálogo, impacto, orden de producción y alerta de ciclos: F4. La
  visualización de la red que F1 sí exige (RF-F1-14) es la representación del catálogo, no un tablero
  integrado: no incluye destacados de impacto, ni veredicto de ciclos, ni orden de trabajo.
- Inventario, compras, facturación, pagos, pronósticos y datos personales: fuera del alcance del
  producto según `docs/brief.md` y `AGENTS.md`.
- Modificación, actualización o eliminación de elementos y dependencias: no forman parte del brief
  original de F1, que solo describe creación y consulta. Se incorporaron por solicitud expresa del
  cliente y se especifican en la sección 10.3.
- Alternativas lógicas OR entre requisitos de un elemento: el modelo solo representa requisitos
  simultáneos (semántica AND, RF-F1-20). Una relación «A o B» es una regla de negocio nueva
  (`AMB-F1-08`).
- Datos de ejemplo fijados dentro del frontend: prohibidos por RF-F1-14.


## 9. Requisitos técnicos — F2: Análisis de impacto

Especificación técnica derivada de `docs/brief.md` (Feature 2). Únicamente F2. F3 y F4 fuera de alcance.

- **Fuente de verdad:** `docs/brief.md`.
- **Alcance:** consulta de impacto respetando la dirección definida del grafo; diferenciación de casos (elemento inexistente, elemento existente sin dependencias, elemento que afecta o depende de una cadena); recorrido propio; documentación del significado de «alcanzar».
- **Sin interfaz:** el brief de F2 no pide interfaz. La consulta se expone por API; la visualización del impacto en un tablero pertenece a F4 («integrar catálogo, impacto y orden/alerta de ciclo»).
- **Documentos relacionados:** `graph-model.md` §8 (dirección y representación), `api-contract.md` §8 (contrato HTTP de F2), `acceptance-criteria.md` §7 (criterios de F2), `architecture.md` §7 (dónde vive el recorrido).

### 9.1 Convenciones
| Prefijo | Significado |
| ------- | ----------- |
| `RF-F2-nn` | Requisito funcional de F2 |
| `RNF-F2-nn` | Requisito no funcional de F2 |
| `RN-F2-nn` | Regla de negocio o semántica de F2 |
| `AC-F2-nn` | Criterio de aceptación de F2 |
| `AMB-F2-nn` | Ambigüedad o decisión pendiente de F2 |

F2 no introduce códigos de error nuevos: reutiliza `ERR-02` (`ELEMENTO_NO_ENCONTRADO`, `404`) y
`ERR-05` (`IDENTIFICADOR_INVALIDO`, `422`) del catálogo de `api-contract.md` §5.

### 9.2 Necesidades de negocio de F2
| Necesidad | Origen |
| --------- | ------ |
| N9. Ante indisponibilidad de un elemento, identificar qué productos o procesos quedan afectados | brief F2, valor de negocio |
| N10. Consultar impacto desde un proveedor/insumo o hacia un producto, según su dirección definida | brief F2, «Debe permitir», primer punto |
| N11. Usar un recorrido propio y devolver elementos visitados de manera comprensible | brief F2, «Debe permitir», segundo punto |
| N12. Diferenciar entre elemento inexistente, elemento sin dependencias y elemento que afecta una cadena | brief F2, «Debe permitir», tercer punto |
| N13. Explicar en el README qué significa «alcanzar» en este negocio | brief F2, «Debe permitir», cuarto punto |
| N14. Aplicar reglas de dominio sobre elementos dependientes, sin deshacer la dirección definida | brief F2, «Pistas, no receta» |

N9, N10, N12 y N13 proceden literalmente de los puntos de «Debe permitir» y del valor de negocio de
F2. N14 traduce la instrucción del brief de no «arreglar una dirección confusa con condicionales»:
la dirección es la del modelo y F2 no la modifica.

### 9.3 Modelo y grafo relevantes para F2 (dirección)
Con base en `graph-model.md` (decisión de F1, que F2 no modifica):
- Grafo dirigido `G = (V, E)` con arista `origen ──habilita──▶ destino` que significa: «para producir o preparar el destino, necesito que el origen esté disponible».
- **Alcanzar:** existe un camino dirigido desde un elemento hasta otro siguiendo aristas en la dirección definida.
- **Impacto por indisponibilidad:** si un elemento `X` deja de estar disponible, se ven afectados todos los elementos `Y` tales que exista un camino dirigido `X → … → Y`, es decir, los alcanzables desde `X` siguiendo aristas hacia adelante.
- **Predecesores no afectados:** los elementos que habilitan a `X` son requisitos de `X`, no consecuencias de su indisponibilidad. No forman parte del conjunto de afectados.
- F1 no calcula recorridos; F2 los calcula con un recorrido propio del proyecto.
- F2 no invierte el grafo, no inventa reglas por tipo de elemento y no modifica el modelo.

### 9.4 Reglas de negocio de F2
| ID | Regla | Necesidad | Criterio |
| -- | ----- | --------- | -------- |
| RN-F2-01 | El análisis de impacto se realiza respetando estrictamente la dirección `origen habilita destino` definida en `graph-model.md`. No se invierte el grafo para forzar el recorrido. | N10 | AC-F2-01, AC-F2-01b |
| RN-F2-02 | «Alcanzar» significa existencia de camino dirigido desde el elemento consultado siguiendo aristas hacia adelante. El conjunto de afectados es exactamente el conjunto de alcanzables hacia adelante, sin filtrar por tipo de elemento. | N9, N11, N13 | AC-F2-02 |
| RN-F2-03 | Si el elemento consultado no existe en el catálogo, la respuesta lo distingue como «elemento inexistente» con el error `404` `ERR-02`. No devuelve lista vacía ni resultado válido. | N12 | AC-F2-03 |
| RN-F2-04 | Si el elemento consultado existe pero no alcanza ningún otro elemento, la respuesta lo distingue como «elemento existente sin dependencias/afectados»: `200` con el elemento consultado identificado y total cero. No se confunde con «elemento inexistente». | N12 | AC-F2-04 |
| RN-F2-05 | Si el elemento consultado afecta una cadena, se devuelven los elementos alcanzados de manera comprensible, cada uno una sola vez, y se puede identificar la cadena de afectados. | N9, N11, N12 | AC-F2-05, AC-F2-05b |
| RN-F2-06 | El recorrido es propio del proyecto: NetworkX no se usa para recorridos, caminos ni impacto. Solo se permite NetworkX para visualizar resultados ya calculados. | Restricción técnica | AC-F2-06, AC-F2-06b |
| RN-F2-07 | Un elemento es dependiente si existe al menos una arista entrante (es destino de alguna arista). El análisis de impacto opera hacia adelante desde la causa y no invierte esa definición. | N14 | AC-F2-07 |
| RN-F2-08 | Solo datos sintéticos y coherentes con el dominio. Los errores no se ocultan ni se convierten en resultados aparentemente válidos. | Restricciones | AC-F2-08 |
| RN-F2-09 | Un identificador mal formado y un elemento inexistente son situaciones distintas: el primero se responde `422` `ERR-05`, el segundo `404` `ERR-02`. | N12 | AC-F2-11 |
| RN-F2-10 | Con el catálogo vacío, toda consulta de impacto responde como elemento inexistente. Un total cero solo puede corresponder a un elemento existente que no alcanza a nadie. | N12 | AC-F2-12 |
| RN-F2-11 | El resultado es determinista: el mismo estado del catálogo produce la misma respuesta, con los mismos afectados y en el mismo orden. | N11 | AC-F2-13 |
| RN-F2-12 | La respuesta de impacto no incluye veredicto de ciclo ni orden de preparación: la detección de ciclos y el orden topológico pertenecen a F3. | Alcance por feature | AC-F2-14 |
| RN-F2-13 | El significado de «alcanzar» en este negocio queda escrito en el `README.md` del repositorio, con la dirección y un ejemplo sobre la red sintética. | N13 | AC-F2-15 |

### 9.5 Puntos solicitados que no se especifican en F2

Dos puntos se han planteado sobre F2 que **no** aparecen en `docs/brief.md` y que, por tanto, no se
especifican aquí. Ninguno se convierte en requisito ni en criterio de aceptación de F2.

| Punto | Base en el brief | Por qué no se especifica | Pregunta escalada | Registro |
| ----- | ----------------- | ------------------------ | ----------------- | -------- |
| Gestión de relaciones: eliminar o modificar dependencias | El brief de F1 solo describe crear y listar; el brief de F2 es una consulta de impacto | F2 ni crea ni modifica relaciones: no hay ninguna operación de escritura en su alcance. Añadirla sería inventar un requisito | ¿Se requiere habilitar eliminar/modificar relaciones? ¿Es corrección de F1 o feature nueva? | `AMB-F2-04`; `docs/decisions/analyst.md` |
| Suministro sin proveedor asignado: todo suministro debe tener proveedor, y un proceso que requiera un suministro sin proveedor no se puede crear | Ninguna: la regla no aparece en `docs/brief.md` ni en F1 ni en F2 | Es una regla de validación de escritura, no de consulta, y no está en el brief. Definirla sería inventar una regla de negocio | ¿Debe existir una regla que exija que todo suministro tenga proveedor asignado y que rechace crear procesos que lo requieran si no lo tiene? ¿Aplica a F1 (validación al crear/relacionar) o a F2? | `AMB-F2-03`; `docs/decisions/analyst.md` |

### 9.6 Casos límite de F2
| Caso | Resultado esperado | Criterio |
| ---- | ------------------ | -------- |
| Elemento consultado inexistente | `404` `ERR-02`, sin contenido de negocio | AC-F2-03 |
| Identificador mal formado en la ruta | `422` `ERR-05`, nunca `404` | AC-F2-11 |
| Catálogo vacío (grafo vacío) | `404` `ERR-02`; nunca `200` con lista vacía | AC-F2-12 |
| Elemento existente sin aristas salientes | `200`, elemento consultado identificado, total cero | AC-F2-04 |
| Elemento que habilita a una cadena | Devuelve alcanzables directos e indirectos | AC-F2-05 |
| Cadena larga / múltiples caminos | Cada alcanzable aparece una sola vez | AC-F2-05b |
| Grafo con ciclo (permitido por F1) | El recorrido propio termina y devuelve los alcanzables sin repetir | AC-F2-05c |
| Consulta desde diferentes tipos (PROVEEDOR/INSUMO/PRODUCTO/PROCESO) | Respeta la dirección definida con independencia del tipo | AC-F2-01, AC-F2-01b, AC-F2-07 |
| Dos consultas idénticas seguidas | Misma respuesta y mismo orden de afectados | AC-F2-13 |

### 9.7 Requisitos funcionales de F2
| ID | Requisito | Necesidad | Criterio |
| -- | --------- | --------- | -------- |
| RF-F2-01 | El sistema debe permitir consultar el impacto de un elemento dado, respetando la dirección definida (`origen habilita destino`) para determinar qué elementos son afectados. | N9, N10 | AC-F2-01, AC-F2-01b, AC-F2-07 |
| RF-F2-02 | La consulta debe diferenciar explícitamente: elemento inexistente; elemento existente sin dependencias/afectados; elemento que afecta una cadena; e identificador mal formado. | N12 | AC-F2-03, AC-F2-04, AC-F2-11 |
| RF-F2-03 | El resultado debe listar los elementos visitados/alcanzados de manera comprensible (identificadores y tipo cuando proceda), reflejando el recorrido propio sobre el grafo dirigido. | N11 | AC-F2-05, AC-F2-05b, AC-F2-05c |
| RF-F2-04 | «Alcanzar» debe entenderse como camino dirigido desde el elemento consultado hacia adelante siguiendo las aristas, y el conjunto de afectados es el conjunto de alcanzables. | N13 | AC-F2-02 |
| RF-F2-05 | El cálculo de impacto usa recorrido propio del proyecto, sin utilizar NetworkX para recorridos, caminos o impacto. | Restricción | AC-F2-06, AC-F2-06b |
| RF-F2-06 | Con el catálogo vacío, la consulta de impacto debe responder como elemento inexistente y nunca como lista vacía. | N12 | AC-F2-12 |
| RF-F2-07 | El resultado de impacto debe ser determinista, con un orden estable de los afectados. | N11 | AC-F2-13 |
| RF-F2-08 | La respuesta de impacto no debe incluir información de ciclos ni de orden de preparación. | Alcance por feature | AC-F2-14 |
| RF-F2-09 | El significado de «alcanzar» en este negocio debe quedar documentado en el `README.md` del repositorio. | N13 | AC-F2-15 |

### 9.8 Requisitos no funcionales de F2
| ID | Requisito | Criterio |
| -- | --------- | -------- |
| RNF-F2-01 | El análisis respeta la arquitectura: el recorrido de impacto vive en el dominio (o en la aplicación si es orquestación), sin mezclarlo con la presentación; el frontend no duplica algoritmos. | AC-F2-09 |
| RNF-F2-02 | Solo datos sintéticos. Errores explícitos, sin convertirlos en resultados válidos. | AC-F2-03, AC-F2-08 |
| RNF-F2-03 | Trazabilidad: regla de negocio → modelo → solución técnica verificable. | AC-F2-10 |

### 9.9 Ambigüedades y decisiones pendientes de F2
| ID | Ambigüedad o decisión pendiente | Por qué no se resuelve aquí | Impacto si se resuelve distinto | Pregunta escalada |
| -- | ------------------------------- | ---------------------------- | ------------------------------ | ---------------- |
| AMB-F2-01 | ¿El resultado debe presentar solo los productos y procesos afectados, o todos los elementos alcanzados (proveedores, insumos, procesos y productos)? La especificación actual devuelve **todos** los alcanzables, sin filtrar por tipo, porque es lo que se deduce de la dirección del modelo. | El brief dice «qué productos o procesos quedan afectados», pero la dirección `origen habilita destino` hace que un proveedor o un insumo alcanzados también se vean afectados. Filtrar por tipo sería una regla que el brief no declara. | Un filtro por tipo cambiaría el conjunto de afectados esperado y los criterios AC-F2-01, AC-F2-02 y AC-F2-05. | ¿Debe el resultado filtrar por tipo de elemento o devolver todos los alcanzables? |
| AMB-F2-02 | ¿Con qué nivel de detalle se enriquece la respuesta (solo identificadores, con tipo y nombre, con distancia o nivel, o con el camino que lleva al afectado)? La especificación actual fija un contenido mínimo obligatorio y deja el enriquecimiento como opcional. | El brief pide «elementos visitados de manera comprensible», sin fijar la estructura. | Afectaría al contrato de la respuesta, no al conjunto de afectados. | ¿Se requiere nivel, distancia o camino en la respuesta de impacto? |
| AMB-F2-03 | ¿Debe existir la regla «todo suministro tiene proveedor asignado» y «un proceso que requiera un suministro sin proveedor no se puede crear»? No figura en `docs/brief.md`. | Definirla sería inventar una regla de negocio. Además, es una validación de escritura (F1), no de consulta (F2). | Si se aprueba, aparece una validación nueva en el alta de elementos y de dependencias (F1) y un caso de error nuevo; no afecta al cálculo de impacto. | ¿Debe existir una regla que exija que todo suministro tenga proveedor asignado y que rechace crear procesos que lo requieran si no lo tiene? ¿Aplica a F1 (validación al crear/relacionar) o a F2? |
| AMB-F2-04 | ¿Se requiere habilitar eliminar o modificar relaciones (dependencias)? El brief de F1 solo describe crear y listar; F2 es una consulta. | F2 no tiene ninguna operación de escritura; añadirla sería inventar un requisito. | Si se aprueba, es una corrección de F1 (endpoints de borrado o edición) o una feature nueva, con su propio alcance, contrato y criterios. | ¿Se requiere habilitar eliminar/modificar relaciones? ¿Es corrección de F1 o feature nueva? |

### 9.10 Trazabilidad de F2

`necesidad → requisito → criterio de aceptación → solución técnica`

| Necesidad | Requisitos | Criterios | Solución técnica |
| --------- | ---------- | --------- | ---------------- |
| N9. Identificar qué queda afectado por la indisponibilidad de un elemento | RF-F2-01, RF-F2-03 | AC-F2-01, AC-F2-05 | `GET /api/v1/impacto/{id}`; recorrido hacia adelante en el dominio |
| N10. Consultar el impacto según la dirección definida | RF-F2-01 | AC-F2-01, AC-F2-01b, AC-F2-07 | Adyacencia de salida del grafo de dominio; sin inversión del grafo |
| N11. Recorrido propio y elementos visitados comprensibles | RF-F2-03, RF-F2-05, RF-F2-07 | AC-F2-05, AC-F2-05b, AC-F2-05c, AC-F2-06, AC-F2-06b, AC-F2-13 | Recorrido en profundidad sobre la adyacencia de salida, con conjunto de visitados; orden estable por `id` |
| N12. Diferenciar inexistente, sin dependencias y cadena | RF-F2-02, RF-F2-06 | AC-F2-03, AC-F2-04, AC-F2-11, AC-F2-12 | Errores `ERR-02` y `ERR-05` del catálogo existente; respuesta `200` con elemento consultado, afectados y total |
| N13. Explicar el significado de «alcanzar» | RF-F2-04, RF-F2-09 | AC-F2-02, AC-F2-15 | `graph-model.md` §8 y sección de alcance en `README.md` |
| N14. Reglas de dominio sobre elementos dependientes | RF-F2-01 | AC-F2-07 | Adyacencia de entrada del grafo de dominio, sin alterar la dirección |
| Restricción: sin NetworkX para el cálculo | RF-F2-05 | AC-F2-06, AC-F2-06b | Algoritmo propio en el dominio; NetworkX solo para visualización |
| Alcance por feature: F2 no anticipa F3 | RF-F2-08 | AC-F2-14 | Contrato de la respuesta sin campos de ciclo ni de orden |
| Restricción: datos sintéticos y errores explícitos | RNF-F2-02 | AC-F2-08 | Sobre de error único de `api-contract.md` §5 |
| Restricción: arquitectura y trazabilidad | RNF-F2-01, RNF-F2-03 | AC-F2-09, AC-F2-10 | `architecture.md` §7; matriz de esta sección |
## 10. Ajustes de producto solicitados por el cliente (2026-10-25)

Estos ajustes amplían el alcance funcional descrito en el brief original. Se implementan por
solicitud directa del cliente y se registran en `docs/decisions/analyst.md`. No modifican la
dirección `origen habilita destino` ni el cálculo de impacto de F2.

### 10.1 Reglas de dependencia por tipo

Matriz vigente (precisión solicitada por el cliente el 2026-11-07; sustituye la matriz inicial del
2026-10-25):

| Tipo de origen | Tipos de destino permitidos |
| -------------- | --------------------------- |
| `PROVEEDOR` | `INSUMO` |
| `INSUMO` | `PROCESO` |
| `PROCESO` | `INSUMO`, `PRODUCTO` |
| `PRODUCTO` | Ninguno (elemento terminal) |

De las 16 combinaciones posibles, **4 están permitidas y 12 se rechazan** con `422` y `ERR-07`
(`DEPENDENCIA_INVALIDA`).

- Un `INSUMO` debe tener una arista entrante de `PROVEEDOR` o `PROCESO` antes de poder enlazarse con
  un `PROCESO` (RF-F1-18).
- Un `PRODUCTO` es terminal: no puede ser origen de ninguna relación (RF-F1-19).
- Las aristas entrantes son requisitos simultáneos (semántica AND); no hay alternativas OR
  (RF-F1-20, `AMB-F1-08`).
- No se admite `PROCESO → PROCESO`; la secuencia entre procesos se modela con un `INSUMO`
  intermedio (RF-F1-21).
- Las reglas se aplican en la creación, la edición y la validación de relaciones, desde una única
  definición de dominio (RNF-F1-10).
- `GET /api/v1/reglas-dependencia` expone las 16 combinaciones con su veredicto y su motivo para que
  la interfaz las muestre antes de crear o editar una relación (RF-F1-22).

### 10.2 Inventario de suministros

- Solo los `INSUMO` manejan inventario. Campos: `stockDisponible` y `stockMinimo`, enteros ≥ 0.
- Si no se envían al crear, se asumen `0`.
- `estadoStock`: `BAJO` si `stockDisponible < stockMinimo`; `SUFICIENTE` en caso contrario;
  `NO_APLICA` para los demás tipos. `alertaStock` es verdadero solo en `BAJO`.
- La alerta se muestra en el mapa, en las fichas, en Materiales y procesos y en el análisis de
  impacto cuando el suministro está involucrado.

### 10.3 Gestión de elementos y relaciones

- `PUT /api/v1/elementos/{id}` actualiza nombre, descripción e inventario. El `id` y el `tipo` son
  inmutables.
- `DELETE /api/v1/elementos/{id}` elimina el elemento y, en cascada, sus relaciones.
- `PUT /api/v1/dependencias/{origen}/{destino}` cambia los extremos de una relación.
- `DELETE /api/v1/dependencias/{origen}/{destino}` elimina una relación.
- Antes de confirmar una edición o eliminación, la interfaz muestra los elementos afectados
  calculados por el backend.

### 10.4 Interfaz

- La pestaña «Simulador de fallas» pasa a llamarse «Análisis de impacto».
- Al entrar desde el botón superior, la pestaña se abre sin resultados; el análisis se ejecuta con
  el botón «Evaluar impacto». Al entrar desde un elemento de Materiales y procesos, el análisis ya
  está ejecutado.
- La pestaña conserva los 10 análisis más recientes y permite reutilizarlos.
- Los elementos de Materiales y procesos abren una ficha modal con descripción, atributos,
  relaciones, stock y acciones de editar, eliminar, ver en el mapa y evaluar impacto.
- Los elementos afectados del análisis abren una ficha de consulta con «Ver en el mapa» e «Iniciar
  análisis de impacto», sin edición ni eliminación.
- La guía de usuario se orienta a usuarios finales, explica relaciones, alertas de continuidad,
  alertas de stock y navegación rápida, sin referencias a F1/F2.

### 10.5 Decisión de alcance

El brief original excluía el inventario real. El cliente solicitó expresamente un inventario
sencillo de cantidades y umbrales para los suministros. Se implementa como dato de catálogo (no como
inventario transaccional, compras ni pronósticos) y queda registrado en las decisiones del
`analyst`.

## 11. Requisitos técnicos — F3: Orden de producción y ciclos

Especificación técnica derivada de `docs/brief.md` (Feature 3), ampliada por la precisión de producto
solicitada por el cliente el 2026-11-07. La feature expone **dos consultas**:

1. **Plan de entrega por producto** (`GET /api/v1/plan-entrega?productos=A,B`): para uno o varios
   productos seleccionados, devuelve el orden de preparación de la unión de sus requisitos previos.
2. **Diagnóstico global de planta** (`GET /api/v1/orden-produccion`): evalúa la red completa como
   DAG y, si es acíclica, devuelve el orden de preparación global. Si hay ciclos, devuelve un
   reporte estructurado sin emitir un orden parcial.

- **Fuente de verdad:** `docs/brief.md`.
- **Alcance:** orden de preparación válido sin ciclos; detección y reporte útil de ciclos; conceptos
  de DAG y ordenamiento topológico; algoritmos propios sin NetworkX.
- **Documentos relacionados:** `graph-model.md` §6 (DAG, algoritmos, plan de entrega y diagnóstico),
  `api-contract.md` §3.7 y §3.8 (contrato HTTP de F3), `acceptance-criteria.md` §8 (criterios de F3),
  `architecture.md` (capas de backend y frontend).

### 11.1 Necesidades de negocio de F3

| Necesidad | Origen |
| --------- | ------ |
| N15. El coordinador obtiene un plan de preparación válido para uno o varios productos, con todos sus requisitos previos en orden, cuando no hay ciclos | brief F3, valor de negocio y primer punto de «Debe permitir»; ajuste de cliente 2026-11-07 |
| N16. El sistema detecta y reporta de forma estructurada y útil los ciclos que afectan a los productos solicitados | brief F3, segundo punto de «Debe permitir» |
| N17. El sistema no presenta un plan parcial o falso para un producto bloqueado por un ciclo | brief F3, tercer punto de «Debe permitir» |
| N18. En una misma entrega, el sistema distingue los productos planificables de los bloqueados | ajuste de cliente 2026-11-07 |
| N19. El coordinador obtiene un diagnóstico global de la planta: orden completo cuando la red es acíclica | brief F3, primer punto de «Debe permitir» |
| N20. El diagnóstico global reporta ciclos, elementos bloqueados y productos planificables sin emitir un orden parcial | brief F3, segundo y tercer punto de «Debe permitir» |
| N21. El orden de preparación y la detección de ciclos se basan en DAG y ordenamiento topológico, con algoritmos propios | brief F3, «Pistas, no receta»; restricción técnica |
| N22. El sistema distingue errores de entrada (producto inexistente, elemento que no es producto, lista vacía o mal formada) de resultados de negocio válidos | brief F3, tercer punto; `AGENTS.md`, casos que el sistema debe manejar |
| N23. El resultado es determinista: el mismo catálogo produce el mismo plan, el mismo orden global y el mismo reporte de ciclos | brief F3, reproducibilidad; `AGENTS.md`, calidad |
| N24. Se incluyen pruebas de aceptación de casos acíclicos, cíclicos y de plan por producto | brief F3, cuarto punto de «Debe permitir»; ajuste de cliente 2026-11-07 |

N15 y N18 no aparecen literalmente en el brief original: provienen del ajuste de producto del
2026-11-07 que separa el plan por entrega del diagnóstico global. No cambian la dirección
`origen habilita destino` ni el modelo de F1.

### 11.2 Requisitos funcionales de F3

| ID | Requisito | Necesidad | Criterio |
| -- | --------- | --------- | -------- |
| RF-F3-01 | El sistema debe determinar si la red de dependencias actual constituye un Grafo Dirigido Acíclico (DAG), con algoritmos propios y sin NetworkX. | N21 | AC-F3-01 |
| RF-F3-02 | Cuando la red es un DAG, el diagnóstico global debe devolver un orden de preparación completo y determinista que respete todas las precedencias (`origen habilita destino`). | N19, N21, N23 | AC-F3-02 |
| RF-F3-03 | Cuando la red contiene ciclos, el diagnóstico global no debe emitir ningún orden, ni total ni parcial: `esDag: false`, `orden: []`, `totalPasos: 0`. | N17, N20 | AC-F3-03 |
| RF-F3-04 | El diagnóstico global debe reportar, de forma estructurada, un ciclo representativo por región cíclica (secuencia cerrada), los elementos bloqueados y los productos bloqueados; los productos no bloqueados se listan como planificables. | N16, N20 | AC-F3-04 |
| RF-F3-05 | El sistema debe generar el plan de entrega de uno o varios productos: la unión deduplicada de sus requisitos previos, en orden topológico determinista. | N15, N21, N23 | AC-F3-05 |
| RF-F3-06 | Si todos los productos solicitados están bloqueados, el plan de entrega debe responder `200` con `pasos: []`, `totalPasos: 0` y todos los estados `BLOQUEADO`; no se devuelve `409` ni un plan vacío presentado como éxito. | N17, N18 | AC-F3-06 |
| RF-F3-07 | El plan de entrega solo considera el subgrafo de requisitos de los productos solicitados; un ciclo en una rama no relacionada no bloquea ni contamina el plan. | N15, N18 | AC-F3-07 |
| RF-F3-08 | El plan de entrega debe validar la lista de productos: lista obligatoria y no vacía, identificadores con formato válido, elementos existentes y de tipo `PRODUCTO`. Si una validación falla, falla la petición completa; no se devuelve un plan parcial. | N22 | AC-F3-08 |
| RF-F3-09 | El plan de entrega debe informar el estado de cada producto solicitado (`PLANIFICABLE` o `BLOQUEADO`) y un indicador `esPlanificable` del conjunto. | N18 | AC-F3-09 |
| RF-F3-10 | La interfaz debe consumir ambas consultas reales de F3, mostrar el plan de entrega por producto y el diagnóstico global, y presentar una alerta visible cuando existan ciclos, sin duplicar los algoritmos del backend. | N15, N16, N19 | AC-F3-10 |

### 11.3 Detalle de los requisitos funcionales de F3

**RF-F3-01 — Verificación de DAG.** El sistema evalúa el catálogo como un dígrafo
$G=(V,E)$. Un grafo es un DAG si no contiene ningún ciclo dirigido. La verificación se realiza con
algoritmos propios del dominio; NetworkX no participa en el cálculo.

**RF-F3-02 — Orden global determinista.** Cuando el grafo es acíclico, se aplica un ordenamiento
topológico (Kahn) sobre todo el grafo. Un elemento $u$ precede a $v$ si $u$ habilita a $v$. Los
elementos listos se desempatan por `id` ascendente. `orden` contiene todos los elementos y
`totalPasos = |V|`.

**RF-F3-03 — Sin orden falso en el diagnóstico global.** Si existe al menos un ciclo, no existe
ordenamiento topológico total. El diagnóstico devuelve `esDag: false`, `orden: []` y
`totalPasos: 0`. No se emite el orden de los elementos no afectados: la secuencia accionable para
esos elementos se obtiene con el plan de entrega, que es una consulta distinta.

**RF-F3-04 — Reporte estructurado de ciclos.** El diagnóstico y el plan de entrega comparten el
mismo formato de ciclo:

- `ciclos[].secuencia`: lista de identificadores que forman una secuencia cerrada
  `[c_1, c_2, ..., c_k, c_1]`, donde cada paso es una arista registrada y el último cierra en el
  primero. Ejemplo: `["INS-BARRA", "PROC-CORTE", "INS-BARRA"]`.
- `elementosBloqueados`: elementos que no pueden ordenarse por estar en una región cíclica o por
  depender de ella.
- `productosBloqueados` (solo diagnóstico global): productos incluidos en `elementosBloqueados`.
- `productosPlanificables` (solo diagnóstico global): productos no bloqueados, ordenados por `id`.

Se reporta **un ciclo representativo por SCC cíclica**, no todos los ciclos elementales. Los ciclos
se ordenan por el menor `id` de su SCC. La respuesta es un resultado de negocio válido (`200`), no un
error HTTP.

**RF-F3-05 — Plan de entrega.** La consulta recibe uno o varios productos. Calcula la unión de los
ancestros de cada producto (incluido el propio producto), deduplica y aplica Kahn sobre ese
subgrafo. `pasos` contiene la secuencia numerada; cada paso incluye `paso`, `id`, `tipo` y `nombre`.
Un producto sin requisitos previos produce un plan de un único paso: él mismo.

**RF-F3-06 — Todos los productos bloqueados.** Si el subgrafo de los productos solicitados contiene
ciclos que alcanzan a todos ellos, la respuesta es `200`, `esPlanificable: false`, `pasos: []`,
`totalPasos: 0`, todos los estados `BLOQUEADO` y el reporte de ciclos y elementos bloqueados. No se
responde `409` ni se presenta el bloqueo como error de transporte.

**RF-F3-07 — Aislamiento por subgrafo.** El plan de entrega no evalúa ramas ajenas a los productos
solicitados. Un ciclo en otra rama del catálogo no se incluye en `ciclos`, no aparece en
`elementosBloqueados` y no bloquea a los productos solicitados.

**RF-F3-08 — Validación de la selección.** La lista `productos` es obligatoria y no puede estar
vacía. Cada identificador se normaliza (recorte y mayúsculas) y se deduplica. Se rechaza con
`422` `ERR-05` un identificador mal formado, con `404` `ERR-02` un elemento inexistente y con
`422` `ERR-04` un elemento existente que no sea `PRODUCTO`. Cualquier fallo invalida la petición
completa: no hay plan parcial para los productos válidos.

**RF-F3-09 — Estado por producto.** Cada producto solicitado aparece una vez en `productos`, con
`id`, `tipo`, `nombre` y `estado`. `estado` es `PLANIFICABLE` si sus requisitos pueden ordenarse y
`BLOQUEADO` si dependen de un ciclo. `esPlanificable` es verdadero solo si todos los productos
solicitados son planificables.

**RF-F3-10 — Interfaz de F3.** La interfaz consume `GET /api/v1/plan-entrega` y
`GET /api/v1/orden-produccion`. Muestra la secuencia numerada del plan, el estado de cada producto
solicitado, el orden global cuando es DAG y una alerta visible con los ciclos, elementos bloqueados y
productos bloqueados cuando no lo es. No calcula ordenamientos ni ciclos en el cliente.

### 11.4 Requisitos no funcionales de F3

| ID | Requisito | Criterio |
| -- | --------- | -------- |
| RNF-F3-01 | Los algoritmos de DAG, ordenamiento topológico, SCC, detección de ciclos y plan de entrega se implementan en el dominio propio en Python 3.12+, sin NetworkX ni otra biblioteca de grafos. | AC-F3-11 |
| RNF-F3-02 | El ordenamiento topológico y la detección de ciclos operan en tiempo lineal $O(|V|+|E|)$ sobre el tamaño del grafo o del subgrafo consultado. | AC-F3-12 |
| RNF-F3-03 | El resultado es determinista: mismo catálogo y misma selección producen el mismo plan, el mismo orden global y el mismo reporte de ciclos, con el mismo orden interno. | AC-F3-13 |
| RNF-F3-04 | El frontend en React + TypeScript consume las consultas reales de F3 y no implementa ordenamiento topológico, detección de ciclos ni cálculo de planes en el cliente. | AC-F3-10, AC-F3-10c |
| RNF-F3-05 | El cálculo vive en el dominio; la capa HTTP solo valida el transporte y serializa. Los errores son explícitos y no se convierten en resultados aparentemente válidos. Solo se usan datos sintéticos. | AC-F3-14 |

### 11.5 Reglas de negocio y semántica de F3

| ID | Regla | Necesidad | Criterio |
| -- | ----- | --------- | -------- |
| RN-F3-01 | La dirección es la de F1: `origen habilita destino`. El orden coloca todo origen antes que su destino. No se invierte el grafo para producir el orden. | N21 | AC-F3-01, AC-F3-02 |
| RN-F3-02 | Un elemento puede prepararse cuando todos sus requisitos directos ya se prepararon (semántica AND). El grado de entrada cuenta todas las aristas entrantes. | N15, N19 | AC-F3-02, AC-F3-05 |
| RN-F3-03 | Un ciclo es una contradicción real: no existe orden total para los elementos que participan en él ni para los que dependen de ellos. El sistema lo reporta; no lo resuelve ni lo oculta. | N16, N17, N20 | AC-F3-03, AC-F3-04, AC-F3-06 |
| RN-F3-04 | «Producto planificable» significa que el subgrafo de sus requisitos es acíclico. «Producto bloqueado» significa que algún requisito suyo participa en un ciclo. | N18 | AC-F3-05, AC-F3-09 |
| RN-F3-05 | El plan de entrega y el diagnóstico global son consultas distintas: el plan responde «qué preparar para estos productos»; el diagnóstico responde «¿la planta completa admite un orden?». | N15, N19 | AC-F3-05, AC-F3-02 |
| RN-F3-06 | La lista de productos solicitada es un conjunto: duplicados y diferencias de mayúsculas no cambian el resultado. | N22, N23 | AC-F3-08, AC-F3-13 |

### 11.6 Trazabilidad de F3

`necesidad → requisito → criterio de aceptación → solución técnica`

| Necesidad | Requisitos | Criterios | Solución técnica |
| --------- | ---------- | --------- | ---------------- |
| N15. Plan de preparación por producto | RF-F3-05, RF-F3-07, RF-F3-09 | AC-F3-05, AC-F3-07, AC-F3-09 | `GET /api/v1/plan-entrega`; subgrafo de ancestros; Kahn determinista |
| N16. Detección y reporte útil de ciclos | RF-F3-04, RF-F3-10 | AC-F3-04, AC-F3-10 | SCC propias; un ciclo representativo por SCC; alerta en frontend |
| N17. Sin plan falso para producto bloqueado | RF-F3-03, RF-F3-06 | AC-F3-03, AC-F3-06 | Diagnóstico global sin orden parcial; plan con `pasos: []` y estado `BLOQUEADO` |
| N18. Distinguir planificables y bloqueados | RF-F3-06, RF-F3-07, RF-F3-09 | AC-F3-06, AC-F3-07, AC-F3-09 | Estado por producto y `esPlanificable`; subgrafo por producto |
| N19. Diagnóstico global con orden completo | RF-F3-02 | AC-F3-02 | `GET /api/v1/orden-produccion`; Kahn sobre todo el grafo |
| N20. Diagnóstico global con ciclos | RF-F3-03, RF-F3-04 | AC-F3-03, AC-F3-04 | `esDag: false`; `ciclos`, `elementosBloqueados`, `productosBloqueados`, `productosPlanificables` |
| N21. DAG y ordenamiento topológico propios | RF-F3-01, RF-F3-02, RF-F3-05 | AC-F3-01, AC-F3-02, AC-F3-05, AC-F3-11 | `graph-model.md` §6; adyacencias propias; Kahn y SCC sin NetworkX |
| N22. Errores de entrada diferenciados | RF-F3-08 | AC-F3-08 | `ERR-02`, `ERR-04`, `ERR-05` del catálogo; validación antes del cálculo |
| N23. Determinismo | RF-F3-02, RF-F3-05 | AC-F3-13 | Desempate por `id`; orden de ciclos por menor `id` de la SCC |
| N24. Pruebas de aceptación acíclicas, cíclicas y por producto | RF-F3-02 a RF-F3-09 | AC-F3-02 a AC-F3-09 | `acceptance-criteria.md` §8; datos sintéticos válidos bajo la matriz de F1 |
| Restricción: sin NetworkX | RNF-F3-01 | AC-F3-11 | Algoritmos en dominio; NetworkX solo para visualización |
| Restricción: arquitectura y calidad | RNF-F3-05 | AC-F3-14 | `architecture.md`; cálculo en dominio; API como adaptador |

### 11.7 Resoluciones de diseño y ambigüedades resueltas de F3

| ID | Definición | Decisión confirmada | Justificación técnica |
| -- | ---------- | ------------------- | ---------------------- |
| AMB-F3-01 | Contenido del paso en el plan y el orden | Objetos estructurados con `paso`, `id`, `tipo` y `nombre`. | Evita peticiones secundarias del frontend y mantiene el plan legible. |
| AMB-F3-02 | Código HTTP ante ciclos | `200` con cuerpo estructurado, tanto en el diagnóstico global como en el plan de entrega. `ERR-10` (`CONFIGURACION_CICLICA`) permanece en el catálogo pero **no se emite** en F3. | Un ciclo es un resultado de negocio previsible y accionable, no un fallo de la petición; el consumidor distingue por `esDag` / `esPlanificable` y por los estados de producto. |
| AMB-F3-03 | Reporte de múltiples ciclos | Un ciclo representativo por SCC cíclica, ordenado por el menor `id` de cada SCC. No se enumeran todos los ciclos elementales. | Evita crecimiento exponencial y localiza cada región cíclica de forma accionable. |
| AMB-F3-04 | Alcance del plan de entrega | Solo la unión de los requisitos de los productos solicitados; los ciclos de ramas no relacionadas no se consideran. | Responde a la pregunta de negocio «qué preparar para esta entrega» sin contaminar el resultado con el resto de la planta. |
| AMB-F3-05 | Selección inválida en el plan de entrega | Falla la petición completa; no se devuelve plan parcial. | Evita que el consumidor interprete un resultado incompleto como una entrega válida. |

### 11.8 Fuera de alcance de F3

- Tablero unificado multipropósito (catálogo + impacto + orden + visualización interactiva):
  pertenece a F4.
- Edición, eliminación o reconfiguración automática del grafo para resolver ciclos: el sistema
  reporta la contradicción para que el usuario la resuelva; no altera dependencias por cuenta propia.
- Cálculo de rutas óptimas, asignación de recursos o secuenciación con capacidades: el plan es un
  orden de precedencias, no una optimización.
- Tiempos de ejecución, duraciones de procesos, cálculo de camino crítico (PERT/CPM) o asignación de
  recursos/maquinaria: fuera del alcance del producto.
- Alternativas OR entre requisitos: el modelo es AND (RF-F1-20, `AMB-F1-08`).

### 11.9 Expectativa de interfaz de F3 y dependencia del backend

El contrato vigente de F3 (`api-contract.md` §3.7 y §3.8) separa dos consultas: el **plan de entrega
por producto** y el **diagnóstico global de planta**. La vista de F3 debe rediseñarse para
reflejarlas cuando el backend las implemente. **Esta iteración solo documenta la expectativa; no se
implementa y no se simula en el frontend.**

| Elemento de interfaz | Comportamiento esperado | Fuente |
| -------------------- | ----------------------- | ------ |
| Plan de entrega | Selector de uno o varios productos. Muestra pasos numerados (`Paso 1`, `Paso 2`, ...) con identificador, tipo y nombre, y el estado `PLANIFICABLE` o `BLOQUEADO` de cada producto solicitado. Si todos están bloqueados, muestra una alerta visible y no muestra pasos. Si hay mezcla, muestra los pasos de los productos planificables y la alerta de los bloqueados | `GET /api/v1/plan-entrega`; RF-F3-05 a RF-F3-09; AC-F3-05 a AC-F3-09 |
| Control general de planta | Indica si la planta completa admite un orden de preparación. Si lo admite, muestra el orden global. Si no, muestra una alerta visible con las dependencias circulares, los elementos bloqueados, los productos bloqueados y los productos que sí se pueden preparar; no muestra un orden parcial | `GET /api/v1/orden-produccion`; RF-F3-01 a RF-F3-04; AC-F3-01 a AC-F3-04 |
| Lenguaje | Todo el contenido cumple la sección 12.2: lenguaje de operación de planta, sin jerga técnica ni códigos HTTP | RF-UI-01 a RF-UI-03 |
| Integridad | El frontend no calcula orden, ciclos, estados ni planes; solo representa la respuesta real de la API | RNF-F3-04; RNF-UI-05 |

La implementación de esta vista y de la sección de F3 de la guía queda **bloqueada hasta que el
backend implemente el contrato nuevo** (`api-contract.md` §3.7 y §3.8). Mientras tanto, el frontend
no debe simular el plan de entrega ni el diagnóstico global, ni presentar como disponible un
comportamiento que el backend no expone. La dependencia queda registrada como `AMB-UI-02`.

## 12. Requisitos transversales de interfaz de usuario (UI)

Estos requisitos aplican a la presentación de F1, F2 y F3. **No crean funcionalidades nuevas, no
modifican reglas de negocio, modelo, endpoints ni algoritmos** y no sustituyen los requisitos de cada
feature. Se derivan de la revisión de interfaz solicitada por el cliente el 2026-11-07 y de los
usuarios declarados en `docs/brief.md` (responsable de compras y coordinador de producción). La
fuente de verdad sigue siendo `docs/brief.md`; este apartado solo precisa cómo se presenta la
información.

### 12.1 Convenciones

| Prefijo | Elemento |
| ------- | -------- |
| `RF-UI-nn` | Requisito funcional de presentación |
| `RNF-UI-nn` | Requisito no funcional de presentación |
| `AC-UI-nn` | Criterio de aceptación de presentación (ver `acceptance-criteria.md` §10) |
| `AMB-UI-nn` | Ambigüedad o decisión pendiente de presentación |

### 12.2 Lenguaje para usuario final

**RF-UI-01 — Lenguaje natural de operación.** Todo texto visible debe estar en español y en lenguaje
natural de operación de planta, sin jerga técnica. Aplica a títulos, subtítulos, badges, botones,
tooltips, placeholders, mensajes de carga, mensajes de error, estados vacíos, textos copiables o
exportables, etiquetas de accesibilidad (`aria-label`, `title`) y la guía integrada. No aplica a
comentarios de código, registros internos, nombres de campos del contrato ni documentación técnica.

**RF-UI-02 — Glosario y términos prohibidos.** El texto visible usa el vocabulario de negocio de la
tabla siguiente. La lista de términos prohibidos es **no exhaustiva**: cualquier término que nombre
una tecnología, un algoritmo o una estructura interna en lugar de la operación de planta se considera
jerga técnica y se evita.

| Concepto | Texto preferido para el usuario | Prohibido o a evitar en texto visible |
| -------- | ------------------------------- | ------------------------------------- |
| Relación entre elementos | relación, conexión | arista, edge |
| Elemento del catálogo | elemento, componente | nodo |
| Red de dependencias | red, cadena de suministro | grafo |
| Orden de preparación | orden de preparación, secuencia de pasos | ordenamiento topológico, secuenciación, motor de ordenamiento |
| Red sin contradicciones | sin dependencias circulares, cadena sin vueltas | DAG, acíclico, topológico |
| Contradicción de dependencias | dependencia circular, contradicción | ciclo sin explicación, SCC |
| Cálculo del orden | el sistema calcula el orden, calculando el orden | backend, frontend, motor, determinista, Kahn |
| Error de operación | no se pudo completar la operación, el identificador ya existe, revisa el dato | backend, frontend, API, endpoint, HTTP, 409, CONFLICT, 4xx, 5xx, servidor, base de datos, payload, JSON |
| Identificador | identificador, código | ID Técnico |
| Funcionalidad | nombre de la pestaña o de la acción | Feature 1, Feature 2, F1, F2, F3 |
| Estado de conexión | sistema sincronizado, sin conexión | status, online/offline, API conectada |

**RF-UI-03 — Mensajes de error y de dependencia circular.** Los mensajes visibles explican el
resultado en términos de negocio y nunca muestran códigos HTTP ni códigos internos (`ERR-nn`):

- un error indica qué dato o combinación impide la operación y qué puede hacer el usuario;
- una dependencia circular indica qué elementos se contradicen, en qué parte de la cadena está el
  problema y qué elementos o productos se pueden preparar igual;
- un bloqueo de entrega indica qué productos quedan bloqueados y cuáles son planificables;
- ningún error se presenta como estado vacío ni como resultado exitoso.

**RF-UI-04 — Nombres de acciones coherentes con la matriz.** El nombre visible de la acción general
de relación debe describir la creación de una relación entre elementos, no solo un suministro. Se
adopta **«Crear relación»** como rótulo preferido; **«Vincular elementos»** es una alternativa
aprobada. El rótulo debe ser consistente en el header, el modal y la guía. No se admite «Enlazar
Suministro» ni «Relación de suministro» como nombre de la acción general, porque la matriz vigente
incluye `PROVEEDOR → INSUMO`, `INSUMO → PROCESO`, `PROCESO → INSUMO` y `PROCESO → PRODUCTO`, y
«suministro» solo describe uno de los tipos y una de las direcciones. La redacción final exacta entre
las dos opciones aprobadas queda como `AMB-UI-01`.

**RF-UI-05 — Guía integrada.** La guía (`ModalAyudaOperativa`) debe enseñar la matriz vigente y el
comportamiento de F3 en lenguaje de negocio, no solo cambiar la redacción:

| Contenido obligatorio | Detalle |
| --------------------- | ------- |
| Matriz vigente | `PROVEEDOR → INSUMO`: el proveedor entrega insumos. `INSUMO → PROCESO`: el proceso requiere insumos. `PROCESO → INSUMO`: el proceso genera insumos o subensamblajes. `PROCESO → PRODUCTO`: el proceso genera el producto final. `PRODUCTO` es el final de la cadena y no origina relaciones |
| Asociación del insumo | Un insumo debe estar asociado a un proveedor o a un proceso antes de alimentar un proceso |
| Relaciones no admitidas | No se admite `PROVEEDOR → PROCESO`, `PROVEEDOR → PRODUCTO`, `INSUMO → PRODUCTO` ni `PROCESO → PROCESO`; la secuencia entre procesos usa un insumo intermedio |
| Semántica de las entradas | Varias entradas son requisitos simultáneos (AND), no alternativas |
| F3 | Plan de entrega por uno o varios productos y control general de planta con diagnóstico de dependencias circulares, elementos y productos bloqueados y productos planificables |

La guía **no puede afirmar** que un proveedor abastece procesos o productos, que un proceso recibe
insumos directamente de un proveedor o que un insumo alimenta productos. Sus afirmaciones sobre la
matriz deben coincidir con `GET /api/v1/reglas-dependencia`, cuya definición única vive en el dominio
(`RNF-F1-10`). La guía no cita F1, F2 ni F3. La sección de F3 se incorpora cuando exista la vista
nueva de F3 (`AMB-UI-02`); hasta entonces no se describe como disponible un comportamiento que la
interfaz no ofrece.

**RF-UI-06 — Textos copiables, exportables y de accesibilidad.** Los informes copiables o
exportables, los nombres accesibles (`aria-label`), los `title` y los `placeholder` cumplen
RF-UI-01 y RF-UI-02: describen la acción o el estado en lenguaje de negocio y no incluyen códigos ni
términos técnicos.

### 12.3 Viewport, responsive y layout

**RF-UI-07 — Shell a viewport completo.** El shell de la aplicación (header, fondo y barras) ocupa
todo el ancho y todo el alto del viewport. No se usa un contenedor global centrado (`max-w-7xl
mx-auto`) que deje espacio muerto a los lados. El área principal usa el alto restante con
`flex-1 min-h-0` o equivalente. El shell puede tener padding interno; lo que no puede es quedar
centrado como una página de lectura.

**RF-UI-08 — Datos a ancho completo y lectura acotada.** Las vistas de datos (catálogo/tabla, red de
dependencias y pasos de producción) aprovechan el ancho disponible del shell. Los bloques de lectura
(párrafos, formularios y mensajes) pueden conservar un ancho máximo de lectura cómodo, alineado
dentro del shell y no centrado como página completa. El ancho de lectura objetivo es de 60 a 75
caracteres por línea, con un rango admitido de 45 a 80; no se admiten líneas de texto corrido de 200
caracteres.

**RF-UI-09 — Header reorganizado y navegación móvil.** El header no amontona logo, pestañas, estado,
ayuda, tema y las dos acciones principales en una sola fila. Se reorganiza en dos filas o con
navegación colapsable, de modo que los botones no queden pegados ni se corten. Por debajo de 768 px
debe existir navegación accesible para las cuatro secciones principales; el patrón `hidden md:flex`
sin alternativa es un defecto que debe corregirse. La sección activa debe ser visible y las acciones
principales deben ser alcanzables en móvil.

**RF-UI-10 — Alturas fluidas.** El grafo y los paneles no usan alturas fijas en píxeles
(`h-[560px]`, `lg:h-[620px]`). Se adaptan al viewport con `flex`, `min-h-0`, `dvh` o porcentajes, sin
crear contenedores que desborden la pantalla ni trampas de desplazamiento anidado.

**RNF-UI-01 — Breakpoints y scroll horizontal.** La interfaz funciona al menos en 360, 768, 1024,
1440 y 1920 px de ancho. No hay scroll horizontal no intencional en la página en ninguna vista ni con
los modales principales abiertos. Una tabla puede tener desplazamiento interno si es intencional y
visible, pero la página no se desplaza horizontalmente.

**RNF-UI-02 — Objetivos táctiles.** En móvil, los controles táctiles principales (navegación, tema,
ayuda, alta de elemento, alta de relación, botones primarios de los modales y cierre) tienen un área
de contacto de al menos 44 × 44 px CSS y no se solapan entre sí.

### 12.4 Temas, tokens y accesibilidad

**RF-UI-11 — Dos temas, sin nuevos selectores.** Se mantienen exactamente dos temas: claro y oscuro.
No se agrega selector de temas, ni temas adicionales, ni selector libre de fondo o acentos. El tema
oscuro actual se aprueba tal cual y no se rediseña. El control existente de alternancia claro/oscuro
se conserva.

**RF-UI-12 — Tema claro sobrio.** El tema claro reduce el brillo y el contraste agresivo: el fondo
principal y las superficies grandes no usan blanco puro como valor dominante; se usan neutros más
suaves; los bordes y las sombras son discretos; los acentos son menos saturados. No se fijan valores
hexadecimales definitivos: los elige `frontend-builder` dentro de estos criterios y de los de
contraste.

**RF-UI-13 — Estados legibles en ambos temas.** La selección, la alerta de stock, el impacto y la
dependencia circular se distinguen en el tema claro y en el oscuro, y no dependen solo del color:
incluyen icono, texto, borde, patrón o etiqueta además del color.

**RNF-UI-03 — Contraste y foco visible.** El tema claro cumple WCAG AA: contraste mínimo 4.5:1 para
texto normal y 3:1 para texto grande y componentes de interfaz. El foco de teclado es visible en
todos los elementos interactivos y mantiene al menos 3:1 contra los colores adyacentes. Ningún estado
se comunica únicamente por color.

**RNF-UI-04 — Tokens semánticos reutilizados.** Los colores se definen como variables CSS semánticas
(superficies, texto, bordes, acentos y estados) y se reutilizan desde Tailwind y desde la paleta de
Cytoscape. No se admiten colores hardcodeados duplicados en componentes ni dos paletas divergentes
entre la interfaz y el grafo. El cambio de tema actualiza ambos consumidores. Los valores del tema
oscuro se conservan; los del tema claro los elige `frontend-builder`.

**RNF-UI-05 — La interfaz no duplica reglas ni algoritmos.** El frontend sigue consumiendo la API
real y no implementa Kahn, SCC, DFS, ordenamiento topológico, detección de ciclos, recorridos de
impacto ni cálculo de planes. La traducción de un código de error o de un resultado estructurado a
lenguaje de negocio es presentación y no puede cambiar el significado del resultado ni inventar
reglas. La guía no es una segunda fuente de la matriz: su contenido debe coincidir con
`GET /api/v1/reglas-dependencia`.

**RNF-UI-06 — Consistencia y mantenimiento de textos.** La guía y los textos visibles no introducen
reglas nuevas. Cuando cambie la matriz o el contrato, la guía y los textos afectados se actualizan en
la misma entrega; la fuente de verdad de la matriz sigue siendo la definición única de dominio
(`RNF-F1-10`).

### 12.5 Trazabilidad de la interfaz

`necesidad u origen → requisito → criterio de aceptación → solución técnica`

| Origen | Requisitos | Criterios | Solución técnica |
| ------ | ---------- | --------- | ---------------- |
| Revisión de interfaz 2026-11-07: lenguaje para usuario final | RF-UI-01, RF-UI-02, RF-UI-03, RF-UI-04, RF-UI-06; RNF-UI-05, RNF-UI-06 | AC-UI-01, AC-UI-02, AC-UI-03, AC-UI-12, AC-UI-13 | Catálogo centralizado de textos; mapeo de códigos y resultados a lenguaje de negocio; guía alineada a la matriz |
| Revisión de interfaz 2026-11-07: guía integrada | RF-UI-05 | AC-UI-04, AC-UI-04b | Contenido de la guía derivado de la matriz vigente y de la especificación de F3 |
| Revisión de interfaz 2026-11-07: viewport y responsive | RF-UI-07, RF-UI-08, RF-UI-09, RF-UI-10; RNF-UI-01, RNF-UI-02 | AC-UI-05, AC-UI-06, AC-UI-07, AC-UI-08, AC-UI-09, AC-UI-14, AC-UI-18 | Shell full-width, header reorganizado, navegación móvil, `flex`/`min-h-0`/`dvh` |
| Revisión de interfaz 2026-11-07: tema claro sobrio y accesibilidad | RF-UI-11, RF-UI-12, RF-UI-13; RNF-UI-03, RNF-UI-04 | AC-UI-10, AC-UI-11, AC-UI-15, AC-UI-16 | Tokens semánticos en variables CSS; Tailwind y Cytoscape consumen los mismos tokens |
| Alcance por feature y separación de responsabilidades | RNF-UI-05 | AC-UI-17 | El frontend representa resultados de la API; no duplica algoritmos ni reglas |
| Brief: usuarios de compras y producción | RF-UI-01, RF-UI-02, RF-UI-03 | AC-UI-01, AC-UI-02, AC-UI-12, AC-UI-13 | Textos orientados a la operación de planta, no a la implementación |

### 12.6 Ambigüedades y decisiones pendientes de interfaz

| ID | Ambigüedad o decisión pendiente | Por qué no se resuelve aquí | Impacto si se resuelve distinto |
| -- | ------------------------------- | ---------------------------- | ------------------------------ |
| AMB-UI-01 | Redacción final exacta del nombre de la acción de relación: «Crear relación» o «Vincular elementos». Ambas cumplen el criterio de describir la creación de una relación entre elementos y no solo un suministro | Es una decisión de copy; el cliente aprobó ambas opciones y no cambia el comportamiento | Si se elige otra redacción, debe seguir describiendo la creación de una relación entre elementos y no implicar solo suministros |
| AMB-UI-02 | Momento de actualización de la vista de F3 y de la sección de F3 de la guía. Depende de que el backend implemente el contrato nuevo (`api-contract.md` §3.7 y §3.8) | No se puede enseñar como disponible un comportamiento que el backend aún no expone, ni simularlo en el frontend | Si el backend no implementa el contrato, la guía no puede describir el plan de entrega ni el control general como funciones disponibles |
| AMB-UI-03 | Valores exactos de la paleta clara y del ancho máximo de lectura. Se fijan rangos y criterios medibles (sobriedad, contraste WCAG AA y 45 a 80 caracteres por línea), pero no valores definitivos | La elección de valores es de `frontend-builder` dentro de los criterios; fijarlos aquí sustituiría su decisión y no aporta al negocio | Si el cliente exige una identidad visual concreta, habría que fijar tokens y valores en una decisión posterior |
