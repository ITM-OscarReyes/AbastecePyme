# Requisitos técnicos — AbastecePyme

Especificación técnica derivada de `docs/brief.md`.

- **Fuente de verdad:** `docs/brief.md`.
- **Alcance de este documento:** únicamente **F1 — Catálogo de dependencias**.
- **Features fuera de este documento:** F2, F3 y F4 **no** se especifican aquí. Solo se mencionan como
  consumidores del modelo de datos cuando F1 deja una consecuencia que debe respetarse. Su
  especificación requerirá una ampliación posterior de este documento por `analyst`.
- **Documentos relacionados:** `graph-model.md` (dirección y representación del grafo),
  `api-contract.md` (contrato HTTP), `architecture.md` (capas y calidad), `acceptance-criteria.md`
  (verificación).

## 1. Convenciones de identificación

| Prefijo | Elemento |
| ------- | -------- |
| `RF-F1-nn` | Requisito funcional de F1 |
| `RNF-F1-nn` | Requisito no funcional de F1 |
| `RNF-Q-nn` | Requisito de calidad y arquitectura, verificable |
| `AC-F1-nn` | Criterio de aceptación de F1 (ver `acceptance-criteria.md`) |
| `ERR-nn` | Error del catálogo (ver `api-contract.md`) |
| `AMB-F1-nn` | Ambigüedad o decisión pendiente (ver sección 7) |

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
| RF-F1-03 | El tipo de un elemento debe pertenecer a un conjunto cerrado y definido: `PROVEEDOR`, `INSUMO`, `PRODUCTO`, `PROCESO`. | N1 | AC-F1-03 |
| RF-F1-04 | El sistema debe permitir listar los elementos del catálogo, con orden determinista y filtro opcional por tipo. | N1 | AC-F1-04 |
| RF-F1-05 | El sistema debe permitir consultar un elemento por su identificador y distinguir entre existente e inexistente. | N1 | AC-F1-05 |
| RF-F1-06 | El sistema debe permitir registrar una dependencia dirigida entre dos elementos existentes, con la dirección definida en `graph-model.md`. | N2, N5, N6 | AC-F1-06 |
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
rechaza con `422` y `ERR-04`. F1 no impone restricciones adicionales según el tipo: una
dependencia puede unir dos elementos del mismo tipo o de tipos distintos, porque el brief no declara
ninguna (ver `AMB-F1-04`).

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
`detalles` qué campo lo referencia, y no registra nada. Las dependencias inversas entre los mismos
dos elementos (`A→B` y `B→A`) son relaciones **distintas** y ambas se registran: forman un ciclo y su
detección y reporte pertenecen a F3 (ver RF-F1-16 y `AMB-F1-05`).

**RF-F1-07 — Dependencia reflexiva.** `origen` igual a `destino` se rechaza con `422` y `ERR-06`.

**RF-F1-08 — Dependencia duplicada.** El par `(origen, destino)` identifica de forma única una
dependencia. Repetirlo se responde con `409` y `ERR-07`, y el número de dependencias del catálogo no
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
| N2. Dependencias solo entre elementos válidos | RF-F1-06, RF-F1-07 | AC-F1-06, AC-F1-07 | `POST /api/v1/dependencias`; caso de uso que valida existencia antes de insertar la arista |
| N3. Validación de repetidos y datos mal formados | RF-F1-08, RF-F1-11, RF-F1-12, RF-F1-13 | AC-F1-08, AC-F1-11 a AC-F1-13 | reglas de validación de dominio; sobre de error uniforme en `api-contract.md` |
| N4. Mostrar la red por API e interfaz mínima | RF-F1-09, RF-F1-10, RF-F1-14 | AC-F1-09, AC-F1-10, AC-F1-14 | `GET /api/v1/dependencias`, `GET /api/v1/grafo`; vista de catálogo y visualización en frontend |
| N5. Dirección y representación justificadas | RF-F1-15, RF-F1-06 | AC-F1-06, AC-F1-15 | `graph-model.md`; grafo dirigido propio en la capa de dominio |
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
| AMB-F1-04 | No hay restricciones declaradas sobre qué tipos de elemento pueden depender entre sí. Se adopta que cualquier par de tipos es válido, incluido un elemento consigo mismo a través de su arista reflexiva (rechazada por RF-F1-07) y las dependencias entre dos elementos del mismo tipo. | Imponer restricciones de tipo sería inventar reglas. | Si el cliente define p. ej. que un `PROVEEDOR` no puede depender de un `PRODUCTO`, hay que añadir una validación de dominio. |
| AMB-F1-05 | F1 acepta dependencias que forman ciclos porque su detección pertenece a F3 (RF-F1-16). Debe confirmarse que el cliente acepta que el catálogo de F1 pueda contener una configuración imposible. | Es una frontera de alcance entre F1 y F3. | Si el cliente quiere que F1 rechace ciclos, F1 incororporaría una regla de F3 y la especificación de ambas features debería revisarse. |
| AMB-F1-06 | El brief menciona «proveedores, insumos y procesos internos» y «productos». Se adopta un tipo de primer nivel `PROCESO` para los procesos internos. | El brief no dice si un proceso es un tipo propio o un producto. | Si un proceso debe modelarse como `PRODUCTO`, cambia el conjunto de tipos y su documentación en la interfaz. |
| AMB-F1-07 | No se define si el listado de la red debe admitir filtros adicionales (por tipo de nodo, por prefijo de identificador) o paginación. F1 se limita al filtro por tipo en elementos y por `origen`/`destino` en dependencias. | El brief pide «interfaz mínima». | Si el catálogo crece, la paginación sería un requisito nuevo. |

## 8. Fuera de alcance de F1

Los siguientes puntos se mencionan para evitar que se implementen dentro de F1. Su especificación
corresponde a otras features y a decisiones posteriores de `analyst`.

- Recorridos de grafo, impacto y elementos alcanzados: F2.
- Detección de ciclos, orden topológico y orden de preparación: F3.
- Tablero integrado que reúna catálogo, impacto, orden de producción y alerta de ciclos: F4. La
  visualización de la red que F1 sí exige (RF-F1-14) es la representación del catálogo, no un tablero
  integrado: no incluye destacados de impacto, ni veredicto de ciclos, ni orden de trabajo.
- Inventario, compras, facturación, pagos, pronósticos y datos personales: fuera del alcance del
  producto según `docs/brief.md` y `AGENTS.md`.
- Modificación, actualización o eliminación de elementos y dependencias: el brief de F1 solo describe
  creación y consulta. Si el cliente necesita edición o borrado, es un requisito nuevo que debe
  especificarse antes de implementarse.
- Datos de ejemplo fijados dentro del frontend: prohibidos por RF-F1-14.