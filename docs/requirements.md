# Requisitos técnicos — AbastecePyme

Especificación técnica derivada de `docs/brief.md`.

- **Fuente de verdad:** `docs/brief.md`.
- **Alcance de este documento:** **F1 — Catálogo de dependencias**, **F2 — Análisis de impacto** y **F3 — Orden y ciclos de producción**.
- **Features fuera de este documento:** F4 **no** se especifica aquí. Solo se menciona como
  consumidor del modelo de datos cuando F1, F2 o F3 dejan una consecuencia que debe respetarse. Su
  especificación requerirá una ampliación posterior de este documento por `analyst`.
- **Documentos relacionados:** `graph-model.md` (dirección, representación, DAG y algoritmos de orden y ciclos),
  `api-contract.md` (contrato HTTP), `architecture.md` (capas y calidad), `acceptance-criteria.md`
  (verificación).

## 1. Convenciones de identificación

| Prefijo | Elemento |
| ------- | -------- |
| `RF-F1-nn` | Requisito funcional de F1 |
| `RNF-F1-nn` | Requisito no funcional de F1 |
| `RF-F3-nn` | Requisito funcional de F3 |
| `RNF-F3-nn` | Requisito no funcional de F3 |
| `RNF-Q-nn` | Requisito de calidad y arquitectura, verificable |
| `AC-F1-nn` | Criterio de aceptación de F1 (ver `acceptance-criteria.md`) |
| `AC-F3-nn` | Criterio de aceptación de F3 (ver `acceptance-criteria.md`) |
| `ERR-nn` | Error del catálogo o de producción (ver `api-contract.md`) |
| `AMB-F1-nn` | Ambigüedad o decisión pendiente de F1 |
| `AMB-F3-nn` | Ambigüedad o decisión pendiente de F3 |

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

- Recorridos de grafo, impacto y elementos alcanzados: F2 (especificado en la sección 9 de este documento).
- Detección de ciclos, orden topológico y orden de preparación: F3 (especificado en la sección 11 de este documento).
- Tablero integrado que reúna catálogo, impacto, orden de producción y alerta de ciclos: F4. La
  visualización de la red que F1 sí exige (RF-F1-14) es la representación del catálogo, no un tablero
  integrado: no incluye destacados de impacto, ni veredicto de ciclos, ni orden de trabajo.
- Inventario, compras, facturación, pagos, pronósticos y datos personales: fuera del alcance del
  producto según `docs/brief.md` y `AGENTS.md`.
- Modificación, actualización o eliminación de elementos y dependencias: el brief de F1 solo describe
  creación y consulta. Si el cliente necesita edición o borrado, es un requisito nuevo que debe
  especificarse antes de implementarse (ver sección 9.7).
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

| Tipo de origen | Tipos de destino permitidos |
| -------------- | --------------------------- |
| `PROVEEDOR` | `INSUMO`, `PROCESO`, `PRODUCTO` |
| `INSUMO` | `PROCESO`, `PRODUCTO` |
| `PROCESO` | `INSUMO`, `PRODUCTO` |
| `PRODUCTO` | Ninguno (elemento terminal) |

- Un `INSUMO` debe tener una arista entrante de `PROVEEDOR` o `PROCESO` antes de enlazarse con un
  proceso o producto.
- Las reglas se aplican en la creación, la edición y la validación de relaciones.
- `GET /api/v1/reglas-dependencia` expone las 16 combinaciones y el motivo de cada una para que la
  interfaz las muestre antes de crear la relación.

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

## 11. Requisitos técnicos — F3: Orden y ciclos de producción

Especificación técnica derivada de `docs/brief.md` (Feature 3).

- **Fuente de verdad:** `docs/brief.md`.
- **Alcance:** orden de producción/preparación válido sin ciclos, detección y reporte útil de ciclos, conceptos de DAG y ordenamiento topológico, sin NetworkX para cálculos.
- **Documentos relacionados:** `graph-model.md` §6 (DAG y ordenamiento), `api-contract.md` §3.7 y §5 (contrato HTTP de F3), `acceptance-criteria.md` §8 (criterios de F3), `architecture.md` (capas de backend y frontend).

### 11.1 Necesidades de negocio de F3

| Necesidad | Origen |
| --------- | ------ |
| N9. El coordinador obtiene un orden válido de preparación cuando no existen ciclos | brief F3, valor de negocio y primer punto de «Debe permitir» |
| N10. El sistema detecta y reporta un ciclo con información útil y estructurada cuando las dependencias se contradicen | brief F3, segundo punto de «Debe permitir» |
| N11. El sistema no presenta un orden falso ni parcial cuando existe contradicción/ciclo | brief F3, tercer punto de «Debe permitir» |
| N12. El orden de preparación y la detección de ciclos se basan en conceptos de DAG y ordenamiento topológico | brief F3, «Pistas, no receta» |
| N13. El coordinador de producción consulta el orden de preparación | brief, «Usuarios» |
| N14. Se incluyen pruebas de aceptación de un caso acíclico y uno cíclico | brief F3, cuarto punto de «Debe permitir» |

### 11.2 Requisitos funcionales de F3

| ID | Requisito | Necesidad | Criterio |
| -- | --------- | --------- | -------- |
| RF-F3-01 | El sistema debe determinar si la red de dependencias actual constituye un Grafo Dirigido Acíclico (DAG). | N9, N12 | AC-F3-01 |
| RF-F3-02 | Cuando el grafo es un DAG, el sistema debe generar un orden de producción/preparación válido y determinista respetando todas las precedencias (`origen habilita destino`). | N9, N12, N13 | AC-F3-02 |
| RF-F3-03 | Cuando el grafo contiene ciclos, el sistema debe detectar la contradicción, rechazar la generación del orden de producción y responder explícitamente que la configuración es irrealizable por dependencias circulares. | N10, N11 | AC-F3-03 |
| RF-F3-04 | Cuando se detecta un ciclo, el sistema debe reportar una estructura útil que identifique al menos un ciclo cerrado exacto (secuencia de identificadores `[c_1, c_2, ..., c_k, c_1]`) y la lista de elementos bloqueados por el ciclo. | N10 | AC-F3-04 |
| RF-F3-05 | El sistema no debe devolver un orden de preparación parcial, incompleto o simulado cuando exista al menos un ciclo en el grafo, garantizando integridad absoluta en la respuesta. | N11 | AC-F3-05 |
| RF-F3-06 | El sistema debe manejar casos límite estructurales: grafo vacío (orden vacío sin ciclo), elementos desconectados o sin dependencias (incluidos al inicio o según orden determinista) y grafos con múltiples componentes conexas acíclicas. | N9, N12 | AC-F3-06 |
| RF-F3-07 | La interfaz de usuario debe permitir al coordinador de producción consultar el orden de producción y visualizar claramente tanto la secuencia de preparación en caso exitoso como una alerta destacada con el detalle del ciclo en caso de contradicción. | N9, N10, N13 | AC-F3-07 |

### 11.3 Detalle de los requisitos funcionales de F3

**RF-F3-01 — Verificación de DAG:** El sistema evalúa el catálogo actual como un dígrafo $G=(V, E)$. Un grafo es un DAG si no contiene ningún ciclo dirigido. Esta verificación se realiza mediante algoritmos propios en el dominio sin depender de NetworkX.

**RF-F3-02 — Generación de orden topológico determinista:** Cuando el grafo es acíclico, el algoritmo (Kahn) produce una ordenación topológica lineal. Un elemento $u$ precede a $v$ si $u$ habilita a $v$ ($u$ es requisito previo de $v$). Para garantizar el determinismo exigido por las pruebas y la reproducibilidad, si múltiples elementos no tienen dependencias pendientes simultáneamente, se desempatan por su `id` en orden alfabético ascendente.

**RF-F3-03 — Detección de configuración irrealizable:** Si existen ciclos, no existe ordenamiento topológico total posible. El backend debe responder con un error específico de dominio/API (`CONFIGURACION_CICLICA` con código HTTP `409 Conflict` o reporte de imposibilidad en el contrato de orden) que no oculte el error ni lo confunda con un catálogo vacío.

**RF-F3-04 — Reporte estructurado del ciclo:** La respuesta ante ciclos debe ser procesable tanto por máquinas como por humanos. Incluye:
- `ciclo`: Lista de identificadores que forman la secuencia del ciclo cerrado, donde cada elemento sucesivo es habilitado por el anterior y el último cierra en el primero (ej. `["INS-BARRA", "PROC-CORTE", "INS-BARRA"]`).
- `elementosBloqueados`: Lista de todos los identificadores de elementos que no pudieron ordenarse por estar inmersos en dependencias circulares.

**RF-F3-05 — Prohibición de órdenes falsos:** Bajo ninguna circunstancia se emitirá un orden que contenga solo los elementos no afectados si el grafo general contiene un ciclo no resuelto, a menos que el contrato especifique explícitamente el estado de error. Si la consulta solicita el orden de producción global, la existencia de contradicción anula la emisión de cualquier orden de producción.

**RF-F3-06 — Manejo de casos límite:**
- *Catálogo vacío:* $V = \emptyset, E = \emptyset$. Responde orden vacío `[]`, total 0, sin ciclo.
- *Elementos sin dependencias:* Se consideran con in-degree 0 y se planifican de inmediato.
- *Grafos disconexos:* Si todas las componentes son acíclicas, se genera un orden global válido unificado desempando por `id`.

**RF-F3-07 — Interfaz de F3:** La interfaz debe consumir el endpoint de orden de producción del backend. Si el resultado es exitoso, muestra la lista de pasos secuenciales numerados. Si se detecta un ciclo, muestra un banner/alerta visible de advertencia identificando los elementos involucrados en el lazo circular y explicando que la producción está bloqueada.

### 11.4 Requisitos no funcionales de F3

| ID | Requisito | Criterio |
| -- | --------- | -------- |
| RNF-F3-01 | Algoritmos implementados en el dominio propio en Python 3.12+, sin uso de NetworkX para ordenamiento topológico ni detección de ciclos. | AC-F3-08 |
| RNF-F3-02 | Complejidad algorítmica: El cálculo del orden topológico y la detección de ciclos deben operar en tiempo lineal $O(|V| + |E|)$ sobre el tamaño del catálogo. | AC-F3-09 |
| RNF-F3-03 | Determinismo absoluto: Mismo catálogo de elementos y dependencias produce exactamente el mismo orden de preparación o el mismo reporte de ciclo. | AC-F3-10 |
| RNF-F3-04 | El frontend en React + TypeScript consume el endpoint real de F3 y no implementa algoritmos de ordenamiento ni detección de ciclos en el cliente. | AC-F3-11 |

### 11.5 Trazabilidad de F3

| Necesidad | Requisitos | Criterios | Solución técnica |
| --------- | ---------- | --------- | ---------------- |
| N9. Orden válido sin ciclos | RF-F3-01, RF-F3-02 | AC-F3-01, AC-F3-02 | `GET /api/v1/orden-produccion`; Caso de uso `ObtenerOrdenProduccion`; Algoritmo de Kahn |
| N10. Detección y reporte útil de ciclos | RF-F3-03, RF-F3-04 | AC-F3-03, AC-F3-04 | Detección DFS / in-degree en dominio; sobre de error o respuesta estructurada con `ciclo` y `elementosBloqueados` |
| N11. No orden falso con contradicciones | RF-F3-05 | AC-F3-05 | Validación estricta que no retorna orden si el número de elementos ordenados es menor a $|V|$ |
| N12. Modelo de DAG y topología | RF-F3-01, RF-F3-02 | AC-F3-01, AC-F3-02 | `graph-model.md` §6; representación de adyacencias propia |
| N13. Consulta de coordinador | RF-F3-02, RF-F3-07 | AC-F3-02, AC-F3-07 | Vista de orden de preparación en frontend conectada a API REST |
| N14. Casos acíclicos y cíclicos | RF-F3-02, RF-F3-03, RF-F3-06 | AC-F3-02, AC-F3-03, AC-F3-06 | Pruebas de aceptación en `acceptance-criteria.md` |

### 11.6 Resoluciones de diseño y ambigüedades resueltas de F3

| ID | Definición | Decisión confirmada | Justificación técnica |
| -- | ---------- | -------------------- | ---------------------- |
| AMB-F3-01 | Contenido del elemento en el orden de preparación | Devolver objetos estructurados con `paso`, `id`, `tipo` y `nombre`. | Evita que el frontend tenga que hacer múltiples peticiones secundarias por cada elemento, optimizando el rendimiento y la experiencia del usuario coordinador. |
| AMB-F3-02 | Código de respuesta HTTP ante ciclos | Responder con código HTTP `409 Conflict` y sobre estándar `ERR-10` (`CONFIGURACION_CICLICA`). | Señala inequívocamente una contradicción de negocio insalvable que impide la producción. Evita que un consumidor asuma éxito con lista vacía. |
| AMB-F3-03 | Reporte de múltiples ciclos en subgrafos | Reportar de forma determinista el primer ciclo elemental cerrado encontrado (orden alfabético) y la lista de todos los `elementosBloqueados`. | Previene explosión combinatoria algorítmica y provee información inmediata y accionable para corregir el lazo principal. |

### 11.7 Fuera de alcance de F3

Los siguientes puntos se mantienen fuera del alcance de F3:
- Tablero unificado multipropósito (catálogo + impacto + orden + visualización interactiva): pertenece a F4.
- Edición, eliminación o reconfiguración automática del grafo para resolver ciclos automáticamente: el sistema reporta la contradicción para que el usuario la resuelva; no altera dependencias por cuenta propia.
- Tiempos de ejecución, duraciones de procesos, cálculo de camino crítico (PERT/CPM) o asignación de recursos/maquinaria: fuera del alcance del producto.
