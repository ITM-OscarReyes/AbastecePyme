# Criterios de aceptación — AbastecePyme (F1, F2 y F3)

Criterios de aceptación de **F1 — Catálogo de dependencias**, **F2 — Análisis de impacto** y **F3 — Orden y ciclos de producción**, derivados de `requirements.md` y
verificables de extremo a extremo en formato Gherkin y tabular.

- Cada criterio es verificable de forma objetiva: describe una entrada o precondición (Given), una acción (When), y un resultado esperado (Then).
- Los identificadores son estables y se reutilizan en `requirements.md`, `api-contract.md`,
  `architecture.md` y en las pruebas.
- `tester` es el único agente autorizado para declarar PASS/FAIL de estos criterios.
- Los criterios de F4 **no** están aquí: este documento cubre F1 (secciones 1 a 6), F2 (sección 7),
  F3 (sección 8) y los criterios transversales de interfaz de usuario (sección 10). La sección 10 no
  sustituye ni modifica los criterios funcionales de F1, F2 ni F3.

## 1. Datos de prueba

Conjunto sintético y coherente con `graph-model.md`, sección 4. No contiene datos de personas ni de
empresas reales.

| `id` | `tipo` | `nombre` |
| ---- | ------ | -------- |
| `PROV-ACERO` | `PROVEEDOR` | Proveedor de acero |
| `INS-BARRA` | `INSUMO` | Barra de acero |
| `INS-TORNILLO` | `INSUMO` | Tornillo hexagonal M6 |
| `PROC-CORTE` | `PROCESO` | Corte de panel |
| `PROD-PANEL` | `PRODUCTO` | Panel de montaje |
| `PROD-BANCO` | `PRODUCTO` | Banco de montaje |

Dependencias del conjunto de prueba:

| `origen` | `destino` | Lectura |
| -------- | --------- | ------- |
| `PROV-ACERO` | `INS-BARRA` | Para preparar la barra de acero necesito al proveedor de acero |
| `PROV-ACERO` | `INS-TORNILLO` | Para preparar los tornillos necesito al proveedor de acero |
| `INS-BARRA` | `PROC-CORTE` | Para el corte de panel necesito la barra de acero |
| `INS-TORNILLO` | `PROC-CORTE` | Para el corte de panel necesito los tornillos |
| `PROC-CORTE` | `PROD-PANEL` | Para el panel necesito el proceso de corte |
| `PROC-CORTE` | `PROD-BANCO` | Para el banco de montaje necesito el proceso de corte |

La demo del backend añade la línea de madera (`PROV-MADERA`, `INS-TABLERO`, `INS-BARNIZ`,
`PROC-ENSAMBLE`, `PROD-ESCRITORIO`). El conjunto de seis elementos anterior se conserva como base
determinista de los criterios de F1 y F2 para no alterar sus resultados esperados.

## 2. Criterios funcionales

### RF-F1-01 · Crear elemento

- **AC-F1-01.** Dada una petición válida con `id` inexistente, `tipo` del conjunto cerrado, `nombre`
  válido y `descripcion` opcional, el backend responde `201`, devuelve el elemento creado con el
  `id` y el `tipo` normalizados, e incluye la cabecera `Location` apuntando al recurso. El elemento
  queda disponible en `GET /api/v1/elementos` y en `GET /api/v1/grafo`.
- **AC-F1-01b.** El `id` y el `tipo` enviados en minúsculas se normalizan a mayúsculas, de modo que
  `ins-tornillo` y `insumo` producen el mismo elemento que `INS-TORNILLO` e `INSUMO`.
- **AC-F1-01c.** `descripcion` ausente se persiste y se devuelve como `null`, no como cadena vacía.

### RF-F1-02 · Identificador único

- **AC-F1-02.** Crear un segundo elemento con un `id` ya registrado, con cualquier otro tipo, responde
  `409` con `ERR-01`, y el catálogo conserva exactamente el elemento original, sin modificar ninguno
  de sus campos.
- **AC-F1-02b.** La unicidad del `id` es del catálogo completo: un `PROVEEDOR` y un `PRODUCTO` con el
  mismo `id` no pueden coexistir.

### RF-F1-03 · Tipos de elemento

- **AC-F1-03.** Un `tipo` fuera de `PROVEEDOR`, `INSUMO`, `PRODUCTO` y `PROCESO` se rechaza con `422`
  y `ERR-04`, indicando el campo `tipo` y los valores admitidos. El elemento no se crea.
- **AC-F1-03b.** Los cuatro tipos se aceptan y se devuelven tal como se registraron.

### RF-F1-04 · Listar elementos

- **AC-F1-04.** `GET /api/v1/elementos` devuelve todos los elementos del catálogo y un `total`
  coincidente con la cantidad devuelta.
- **AC-F1-04b.** El listado viene ordenado por `id` ascendente y dos llamadas consecutivas sobre el
  mismo estado devuelven la misma secuencia.
- **AC-F1-04c.** `GET /api/v1/elementos?tipo=INSUMO` devuelve únicamente los elementos de ese tipo y
  un `total` que los cuenta.
- **AC-F1-04d.** `GET /api/v1/elementos?tipo=DESCONOCIDO` responde `422` con `ERR-04`.

### RF-F1-05 · Consultar un elemento

- **AC-F1-05.** `GET /api/v1/elementos/INS-TORNILLO` devuelve `200` con el elemento.
- **AC-F1-05b.** `GET /api/v1/elementos/INS-INEXISTENTE` responde `404` con `ERR-02`, y el mensaje
  identifica el identificador consultado.
- **AC-F1-05c.** `GET /api/v1/elementos/xx` responde `422` con `ERR-05`, nunca `404`: un
  identificador mal formado y un identificador inexistente son situaciones distintas.

### RF-F1-06 · Registrar dependencia

- **AC-F1-06.** Dados dos elementos existentes, `POST /api/v1/dependencias` responde `201` y devuelve
  la dependencia con `origen`, `destino` y `tipoRelacion: "habilita"`. La dependencia aparece en
  `GET /api/v1/dependencias` y en `GET /api/v1/grafo`.
- **AC-F1-06b.** La dirección es la documentada: con los datos de prueba, registrar
  `origen: PROC-CORTE`, `destino: PROD-PANEL` significa «para producir el panel necesito el proceso
  de corte». La consulta de la red muestra `PROC-CORTE` como origen de la flecha y `PROD-PANEL` como
  destino.
- **AC-F1-06c.** Si `origen` no existe, la respuesta es `404` con `ERR-02` y el detalle señala el
  campo `origen`. Si `destino` no existe, la respuesta es `404` con `ERR-02` y el detalle señala
  `destino`. En ambos casos no se registra ninguna dependencia.
- **AC-F1-06d.** Cuando la combinación de tipos lo permite (por ejemplo, un proceso y un suministro),
  las dependencias inversas (`A → B` y luego `B → A`) son relaciones distintas: ambas se registran
  con `201` y las dos aparecen en el listado.

### RF-F1-07 · Dependencia reflexiva

- **AC-F1-07.** `POST /api/v1/dependencias` con `origen` igual a `destino` responde `422` con
  `ERR-07` y no registra la arista.

### RF-F1-08 · Dependencia duplicada

- **AC-F1-08.** Repetir el mismo par `(origen, destino)` responde `409` con `ERR-08`, y el `total` de
  dependencias no cambia.
- **AC-F1-08b.** El par inverso no se considera duplicado del par original (ver AC-F1-06d).

### RF-F1-09 · Listar dependencias

- **AC-F1-09.** `GET /api/v1/dependencias` devuelve cada dependencia con `origen`, `destino` y
  `tipoRelacion: "habilita"`, y un `total` coincidente.
- **AC-F1-09b.** `GET /api/v1/dependencias?origen=INS-TORNILLO` devuelve solo las dependencias cuyo
  origen es ese elemento. El filtro por `destino` se comporta de forma equivalente.
- **AC-F1-09c.** Cada dependencia devuelta incluye `tipoRelacion: "habilita"`, de modo que el
  consumidor no necesita deducir la dirección a partir de los nombres de los campos.

### RF-F1-10 · Representación del grafo

- **AC-F1-10.** `GET /api/v1/grafo` devuelve los elementos y las dependencias del catálogo, con
  `resumen.totalElementos` y `resumen.totalDependencias` coincidentes con lo devuelto.
- **AC-F1-10b.** El grafo devuelto no contiene ningún elemento que no esté registrado como elemento,
  y toda dependencia devuelta referencia elementos presentes en la misma respuesta.
- **AC-F1-10c.** La respuesta no incluye recorridos, niveles, ciclos ni órdenes: es la estructura del
  catálogo tal como está.

### RF-F1-11 · Validación de entrada

- **AC-F1-11.** Cada uno de los siguientes casos responde `422` con `ERR-04` y detalle del campo, y
  deja el catálogo intacto:

| Caso | Campo |
| ---- | ----- |
| Falta `id` | `id` |
| Falta `tipo` | `tipo` |
| Falta `nombre` | `nombre` |
| `tipo` con valor no admitido | `tipo` |
| `id` de 2 caracteres | `id` |
| `id` con caracteres no permitidos | `id` |
| `nombre` de 2 caracteres | `nombre` |
| `nombre` vacío o solo con espacios | `nombre` |
| `descripcion` de más de 300 caracteres | `descripcion` |
| `id` numérico en lugar de texto | `id` |
| `tipo` como lista en lugar de texto | `tipo` |

- **AC-F1-11b.** Un cuerpo que no es JSON válido responde `400` con `ERR-03`.
- **AC-F1-11c.** Un campo no reconocido en la petición responde `422` con `ERR-06` e indica el nombre
  del campo. Esto incluye campos numéricos de cantidad o peso: F1 no los admite (ver `AMB-F1-01`).
- **AC-F1-11d.** Tras cualquiera de los rechazos anteriores, el número de elementos y de
  dependencias del catálogo es el mismo que antes de la petición.

### RF-F1-12 · Errores explícitos

- **AC-F1-12.** Cada condición de error produce el sobre con `error.codigo`, `error.mensaje` y, si
  aplica, `error.detalles` con `campo` y `mensaje`. Ninguna respuesta de error contiene una colección
  vacía, un `total` en cero ni un recurso parcial.
- **AC-F1-12b.** Los códigos son estables: el mismo tipo de fallo produce siempre el mismo
  `codigo`, con independencia del mensaje.

### RF-F1-13 · Estados vacíos

- **AC-F1-13.** Con el catálogo sin elementos, `GET /api/v1/elementos`, `GET /api/v1/dependencias` y
  `GET /api/v1/grafo` responden `200` con colecciones vacías y totales en cero.
- **AC-F1-13b.** Un elemento sin dependencias aparece en el listado de elementos, no aparece en el
  listado de dependencias y no provoca error en ninguna consulta.
- **AC-F1-13c.** Un filtro sin coincidencias responde `200` con colección vacía, no con `404`.

### RF-F1-14 · Interfaz mínima

- **AC-F1-14.** Desde la interfaz se puede crear un elemento, crear una dependencia, ver el listado
  de elementos y ver la red de dependencias. Cada acción llama a la API real y el resultado mostrado
  es el que devuelve el backend.
- **AC-F1-14b.** Al provocar un error del backend (por ejemplo, un `id` duplicado), la interfaz
  muestra el mensaje recibido y no presenta el resultado como si la operación hubiera tenido éxito.
- **AC-F1-14c.** La red se visualiza respetando la dirección devuelta por la API: cada flecha va de
  `origen` a `destino`.
- **AC-F1-14d.** La interfaz no contiene datos de ejemplo embebidos que representen resultados
  funcionales: con el catálogo vacío, la vista de la red está vacía.

### RF-F1-15 · Grafo propio del proyecto

- **AC-F1-15.** La representación del grafo y sus operaciones de F1 se implementan en el proyecto,
  sin usar NetworkX ni otra biblioteca de grafos para construir el grafo, insertar aristas o
  consultar adyacencia.
- **AC-F1-15b.** El dominio no importa el framework HTTP ni el adaptador de persistencia.

### RF-F1-16 · F1 no valida ciclos

- **AC-F1-16.** Una secuencia de dependencias que forma un ciclo se registra íntegramente sin
  error: cada dependencia responde `201` y todas aparecen en `GET /api/v1/grafo`.
- **AC-F1-16b.** F1 no devuelve ningún campo de advertencia, error o resultado de ciclo en esas
  respuestas. La detección de ciclos no forma parte de F1.

### RF-F1-17 a RF-F1-22 · Matriz de tipos, asociación y semántica

- **AC-F1-25.** Las cuatro combinaciones permitidas se registran con `201`: `PROVEEDOR → INSUMO`,
  `INSUMO → PROCESO` (con el insumo ya asociado), `PROCESO → INSUMO` y `PROCESO → PRODUCTO`. Cada
  respuesta devuelve la dependencia con `tipoRelacion: "habilita"`.
- **AC-F1-26.** Cada una de las 12 combinaciones restantes se rechaza con `422` y `ERR-07`
  (`DEPENDENCIA_INVALIDA`), con detalle en el campo `destino` y el motivo, y no modifica el catálogo.
  El conjunto rechazado incluye `PROVEEDOR → PROCESO`, `PROVEEDOR → PRODUCTO`, `INSUMO → PROVEEDOR`,
  `INSUMO → INSUMO`, `INSUMO → PRODUCTO`, `PROCESO → PROVEEDOR`, `PROCESO → PROCESO`,
  `PRODUCTO → *` y las combinaciones del mismo tipo.
- **AC-F1-27.** Un `PRODUCTO` no puede ser origen de ninguna dependencia: cualquier intento responde
  `422` `ERR-07`, aunque el destino sea otro `PRODUCTO`. Un `PRODUCTO` sí puede recibir una arista
  `PROCESO → PRODUCTO`.
- **AC-F1-28.** Un `INSUMO` sin arista entrante de `PROVEEDOR` o `PROCESO` no puede ser origen de
  `INSUMO → PROCESO`: la respuesta es `422` `ERR-07` con detalle en `origen`. Tras registrar
  `PROV-ACERO → INS-BARRA`, la misma relación pasa a ser válida. Un `INSUMO` aislado sigue siendo un
  elemento válido del catálogo.
- **AC-F1-29.** `PROCESO → PROCESO` se rechaza con `422` `ERR-07`. La secuencia entre procesos se
  modela con un `INSUMO` intermedio: `PROC-ARMAR → INS-SUBENSAMBLE → PROC-ENSAMBLAR` se registra
  correctamente y la cadena resultante es válida.
- **AC-F1-30.** Si un elemento tiene dos o más aristas entrantes, todas son requisitos simultáneos
  (AND): no se interpreta ninguna como alternativa. La comprobación se observa en el orden de F3,
  donde el elemento no queda habilitado hasta que se preparan todos sus orígenes.
- **AC-F1-31.** `GET /api/v1/reglas-dependencia` devuelve las 16 combinaciones con `tipoOrigen`,
  `tipoDestino`, `permitida` y `motivo`. Exactamente 4 tienen `permitida: true` y 12
  `permitida: false`; los motivos distinguen la terminalidad de `PRODUCTO`, la ausencia de
  `PROCESO → PROCESO` y las combinaciones no admitidas.
- **AC-F1-32.** La misma matriz y la misma comprobación de asociación se aplican en
  `POST /api/v1/dependencias` y en `PUT /api/v1/dependencias/{origen}/{destino}`. La respuesta de
  `GET /reglas-dependencia` se deriva de la misma definición de dominio que valida las escrituras:
  no hay una segunda matriz en la capa HTTP ni en el frontend (RNF-F1-10).

## 3. Criterios no funcionales y de arquitectura

- **AC-F1-17.** El contrato de F1 vive bajo `/api/v1` y los nombres de campo del JSON son
  `lowerCamelCase`. Una ruta inexistente responde `404` con `ERR-09`. La revisión del backend
  confirma que los nombres del JSON no se propagan al dominio ni a la aplicación: el código Python
  usa `snake_case` y la traducción ocurre únicamente en la capa de infraestructura. (RNF-Q-06)
- **AC-F1-18.** Dos peticiones de lectura idénticas sobre el mismo estado devuelven respuestas
  idénticas, incluidas las colecciones ordenadas.
- **AC-F1-19.** Los datos de prueba y los datos de demostración son sintéticos y no incluyen datos
  personales, nombres de empresas reales ni operaciones reales.
- **AC-F1-20.** Con 200 elementos y 500 dependencias, las operaciones de F1 responden en tiempo
  lineal o mejor respecto del tamaño de los datos.
- **AC-F1-24.** El backend se ejecuta en Python 3.12 o superior dentro de un entorno virtual, con
  las dependencias declaradas en `requirements.txt`, y el frontend se puede ejecutar contra él.

## 4. Criterios de arquitectura y calidad

- **AC-F1-21.** La revisión de la implementación confirma que: el dominio no importa el framework
  HTTP ni la persistencia; los casos de uso no contienen decisiones de transporte; el acceso a datos
  está detrás de un puerto definido hacia el dominio; y cada regla de validación de F1 está
  evaluada en un único lugar, sin duplicación entre dominio y capa HTTP. (RNF-Q-01 a RNF-Q-04)
- **AC-F1-22.** La revisión del frontend confirma que el cliente de API, el estado y los componentes
  están separados, y que ningún componente contiene una regla de negocio del catálogo ni un cálculo
  sobre el grafo. (RNF-Q-05, RNF-F1-06)
- **AC-F1-23.** La revisión del código, backend y frontend, confirma el cumplimiento de las
  convenciones de nomenclatura de `AGENTS.md` (Python en `snake_case`, TypeScript en `camelCase`, sin
  identificadores en `camelCase` dentro del Python), el uso del vocabulario del dominio sin sinónimos
  y la ausencia de clases, funciones o componentes con más de una responsabilidad. (RNF-Q-06 a
  RNF-Q-08)

## 5. Matriz de trazabilidad

| Requisito | Criterios |
| --------- | --------- |
| RF-F1-01 | AC-F1-01, AC-F1-01b, AC-F1-01c |
| RF-F1-02 | AC-F1-02, AC-F1-02b |
| RF-F1-03 | AC-F1-03, AC-F1-03b |
| RF-F1-04 | AC-F1-04, AC-F1-04b, AC-F1-04c, AC-F1-04d |
| RF-F1-05 | AC-F1-05, AC-F1-05b, AC-F1-05c |
| RF-F1-06 | AC-F1-06, AC-F1-06b, AC-F1-06c, AC-F1-06d |
| RF-F1-07 | AC-F1-07 |
| RF-F1-08 | AC-F1-08, AC-F1-08b |
| RF-F1-09 | AC-F1-09, AC-F1-09b, AC-F1-09c |
| RF-F1-10 | AC-F1-10, AC-F1-10b, AC-F1-10c |
| RF-F1-11 | AC-F1-11, AC-F1-11b, AC-F1-11c, AC-F1-11d |
| RF-F1-12 | AC-F1-12, AC-F1-12b |
| RF-F1-13 | AC-F1-13, AC-F1-13b, AC-F1-13c |
| RF-F1-14 | AC-F1-14, AC-F1-14b, AC-F1-14c, AC-F1-14d |
| RF-F1-15 | AC-F1-15, AC-F1-15b |
| RF-F1-16 | AC-F1-16, AC-F1-16b |
| RF-F1-17 | AC-F1-25, AC-F1-26 |
| RF-F1-18 | AC-F1-28 |
| RF-F1-19 | AC-F1-27 |
| RF-F1-20 | AC-F1-30 |
| RF-F1-21 | AC-F1-29 |
| RF-F1-22 | AC-F1-31, AC-F1-32 |
| RNF-F1-01 | AC-F1-24 |
| RNF-F1-02 | AC-F1-24 |
| RNF-F1-03 | AC-F1-15 |
| RNF-F1-04 | AC-F1-17 |
| RNF-F1-05 | AC-F1-18 |
| RNF-F1-06 | AC-F1-14, AC-F1-22 |
| RNF-F1-07 | AC-F1-19 |
| RNF-F1-08 | AC-F1-12 |
| RNF-F1-09 | AC-F1-20 |
| RNF-F1-10 | AC-F1-31, AC-F1-32 |
| RNF-Q-01 a RNF-Q-04 | AC-F1-21 |
| RNF-Q-05 | AC-F1-22 |
| RNF-Q-06 a RNF-Q-08 | AC-F1-17, AC-F1-23 |

## 6. Casos límite de F1

| Caso | Resultado esperado | Criterio |
| ---- | ------------------ | -------- |
| Catálogo vacío | `200` con colecciones vacías y totales en cero | AC-F1-13 |
| Elemento sin dependencias | Elemento válido, sin aristas, sin error | AC-F1-13b |
| `id` repetido | `409` `ERR-01`, catálogo sin cambios | AC-F1-02 |
| Nombre repetido con `id` distinto | Ambos elementos existen (`AMB-F1-03`) | AC-F1-01 |
| `id` en minúsculas | Se normaliza y se registra en mayúsculas | AC-F1-01b |
| `tipo` en minúsculas | Se normaliza y se registra en mayúsculas | AC-F1-01b |
| Dependencia repetida | `409` `ERR-08`, sin cambios | AC-F1-08 |
| Dependencia inversa | Se registra: es una relación distinta | AC-F1-06d |
| Dependencia reflexiva | `422` `ERR-07` | AC-F1-07 |
| Elemento inexistente en un extremo | `404` `ERR-02` con el campo señalado | AC-F1-06c |
| `id` mal formado en la ruta | `422` `ERR-05`, nunca `404` | AC-F1-05c |
| `tipo` no admitido | `422` `ERR-04` | AC-F1-03 |
| Campo desconocido o numérico | `422` `ERR-06` | AC-F1-11c |
| Cuerpo no JSON | `400` `ERR-03` | AC-F1-11b |
| Filtro sin coincidencias | `200` con colección vacía | AC-F1-13c |
| Ruta inexistente | `404` `ERR-09` | AC-F1-17 |
| Ciclo de dependencias | Se registra sin error ni advertencia | AC-F1-16 |
| Lista sin dependencias | `200` con `dependencias: []` | AC-F1-13 |
| Combinación permitida de tipos | `201`, dependencia registrada | AC-F1-25 |
| Combinación no permitida de tipos | `422` `ERR-07`, sin cambios | AC-F1-26 |
| `PRODUCTO` como origen | `422` `ERR-07` | AC-F1-27 |
| `INSUMO → PROCESO` sin asociación previa | `422` `ERR-07` | AC-F1-28 |
| `PROCESO → PROCESO` | `422` `ERR-07`; usar `INSUMO` intermedio | AC-F1-29 |
| Varias aristas entrantes | Todas son requisitos simultáneos (AND) | AC-F1-30 |
| `GET /reglas-dependencia` | 16 combinaciones, 4 permitidas y 12 rechazadas | AC-F1-31 |
| Edición de una relación con tipos no permitidos | `422` `ERR-07`, misma matriz que el alta | AC-F1-32 |


## 7. Criterios de aceptación — F2: Análisis de impacto

Únicamente F2. Requisitos en `requirements.md` §9, modelo en `graph-model.md` §8 y contrato en
`api-contract.md` §8.

- Cada criterio es verificable de forma objetiva: describe una entrada, el resultado esperado y,
  cuando aplica, el código HTTP y el código de error que se inspeccionan.
- Ningún criterio introduce una regla de negocio que no esté en `docs/brief.md`: lo que el brief no
  declara no se convierte en criterio, y lo que el brief sí declara tiene criterio.
- `tester` es el único agente autorizado para declarar PASS/FAIL de estos criterios.

### 7.1 Datos de prueba de F2

Conjunto sintético coherente con la sección 1 de este documento:

| `origen` | `destino` | Lectura |
| -------- | --------- | ------- |
| `PROV-ACERO` | `INS-BARRA` | Para preparar la barra de acero necesito al proveedor de acero |
| `PROV-ACERO` | `INS-TORNILLO` | Para preparar los tornillos necesito al proveedor de acero |
| `INS-BARRA` | `PROC-CORTE` | Para el corte de panel necesito la barra de acero |
| `INS-TORNILLO` | `PROC-CORTE` | Para el corte de panel necesito los tornillos |
| `PROC-CORTE` | `PROD-PANEL` | Para el panel necesito el proceso de corte |
| `PROC-CORTE` | `PROD-BANCO` | Para el banco de montaje necesito el proceso de corte |

Conjunto cíclico: el anterior más `PROC-CORTE → INS-BARRA` («para preparar la barra necesito el
proceso de corte»), configuración que el catálogo admite sin error (AC-F1-16).

Alcance esperado con el conjunto de prueba, según la dirección `origen habilita destino`:

| Elemento consultado | Elementos alcanzados (afectados) | Total |
| ------------------- | -------------------------------- | ----- |
| `PROV-ACERO` | `INS-BARRA`, `INS-TORNILLO`, `PROC-CORTE`, `PROD-PANEL`, `PROD-BANCO` | 5 |
| `INS-BARRA` | `PROC-CORTE`, `PROD-PANEL`, `PROD-BANCO` | 3 |
| `INS-TORNILLO` | `PROC-CORTE`, `PROD-PANEL`, `PROD-BANCO` | 3 |
| `PROD-PANEL` | (ninguno: producto terminal) | 0 |
| `PROD-BANCO` | (ninguno) | 0 |

### RF-F2-01 / RN-F2-01, RN-F2-02, RN-F2-07 · Respeto a la dirección definida

- **AC-F2-01.** La consulta de impacto de `PROV-ACERO` devuelve como afectados exactamente
  `INS-BARRA`, `INS-TORNILLO`, `PROC-CORTE`, `PROD-PANEL` y `PROD-BANCO`, que son los elementos
  alcanzables desde `PROV-ACERO` siguiendo las aristas `origen habilita destino`.
- **AC-F2-01b.** El recorrido no invierte el grafo. La consulta de impacto de `PROD-PANEL` no
  devuelve afectados porque el producto es terminal: los elementos que lo habilitan (`PROC-CORTE`,
  `INS-BARRA`, `INS-TORNILLO`, `PROV-ACERO`) no aparecen entre sus afectados.
- **AC-F2-07.** Un elemento es dependiente de otro cuando existe una arista entrante, es decir,
  cuando es el destino de alguna dependencia. Esa definición se mantiene en F2 y es coherente con
  `graph-model.md`; el análisis de impacto no la invierte: opera hacia adelante desde la causa.

### RF-F2-02 / RN-F2-03, RN-F2-04, RN-F2-09 · Diferenciación de los casos

- **AC-F2-03.** La consulta de impacto de un identificador con formato válido que no existe en el
  catálogo responde `404` con el sobre de error `ERR-02` (`ELEMENTO_NO_ENCONTRADO`), y el mensaje
  identifica el identificador consultado. No responde `200` con una lista vacía ni con un resultado
  de impacto.
- **AC-F2-04.** La consulta de impacto de `PROD-BANCO` (existe y no habilita a nadie) responde
  `200`, identifica el elemento consultado en la respuesta y devuelve el conjunto de afectados
  vacío, con total cero. Es un resultado válido y distinguible del caso inexistente, que responde
  `404` `ERR-02` sin contenido de negocio.
- **AC-F2-11.** La consulta de impacto con un identificador mal formado en la ruta responde `422`
  con `ERR-05` (`IDENTIFICADOR_INVALIDO`), nunca `404`: «mal formado» e «inexistente» son
  situaciones distintas y el cliente debe poder separarlas.

### RF-F2-03 / RN-F2-05, RN-F2-11 · Elementos alcanzados de manera comprensible

- **AC-F2-05.** La consulta de impacto de `INS-BARRA` devuelve como afectados `PROC-CORTE`,
  `PROD-PANEL` y `PROD-BANCO`: el primero por camino directo y los otros dos por caminos indirectos.
  El resultado no se limita a un paso: incluye los afectados indirectos, que no están entre los
  habilitados directamente por el elemento consultado.
- **AC-F2-05b.** Cada elemento alcanzable aparece una sola vez en la respuesta, aunque sea
  alcanzable por varios caminos. En el conjunto de prueba, `PROD-BANCO` y `PROD-PANEL` son
  alcanzables desde `INS-TORNILLO` por varios caminos y aparecen una sola vez.
- **AC-F2-05c.** Con el conjunto cíclico (`PROC-CORTE → INS-BARRA`), la consulta de impacto de
  `INS-BARRA` termina y devuelve `PROC-CORTE`, `PROD-PANEL` y `PROD-BANCO`, cada uno una sola vez.
  El recorrido maneja los elementos ya visitados y no se asume que el grafo sea acíclico.

### RF-F2-04 / RN-F2-02, RN-F2-13 · Significado de «alcanzar»

- **AC-F2-02.** «Alcanzar» significa que existe un camino dirigido desde el elemento consultado
  hasta el elemento alcanzado siguiendo aristas `origen habilita destino`. Los alcanzables son los
  afectados por la indisponibilidad del elemento consultado. El conjunto de afectados devuelto es
  exactamente el conjunto de elementos alcanzables hacia adelante, sin filtrar por tipo: un
  proveedor, un insumo, un proceso o un producto alcanzados son afectados.

### RF-F2-05 / RN-F2-06 · Recorrido propio del proyecto

- **AC-F2-06.** El cálculo de impacto se implementa con un recorrido propio del proyecto. La
  revisión del código confirma que el dominio no importa NetworkX ni ninguna otra biblioteca de
  grafos, y que no hay ninguna llamada a esas bibliotecas para calcular alcanzables, caminos o
  impacto.
- **AC-F2-06b.** Si el frontend representa el resultado con una biblioteca de grafos, dibuja lo que
  devuelve el backend y no calcula los alcanzables por su cuenta.

### RF-F2-06 / RN-F2-10 · Catálogo vacío

- **AC-F2-12.** Con el catálogo sin elementos, la consulta de impacto de cualquier identificador
  con formato válido responde `404` con `ERR-02` (`ELEMENTO_NO_ENCONTRADO`), no `200` con una lista
  vacía. Un total cero solo puede corresponder a un elemento existente que no alcanza a nadie.

### RF-F2-07 / RN-F2-11 · Resultado determinista

- **AC-F2-13.** Dos consultas de impacto idénticas y consecutivas sobre el mismo estado devuelven
  la misma respuesta, con los mismos afectados y en el mismo orden. El orden de los afectados no
  depende del orden en que se registraron las dependencias.

### RF-F2-08 / RN-F2-12 · Sin información de ciclos ni de orden

- **AC-F2-14.** La respuesta de impacto no incluye ningún campo de veredicto de ciclo, de ciclo
  detectado ni de orden de preparación. F2 no anticipa F3: la detección de ciclos y el orden
  topológico no forman parte de esta consulta.

### RF-F2-09 / RN-F2-13 · «Alcanzar» documentado

- **AC-F2-15.** El `README.md` del repositorio explica qué significa «alcanzar» en este negocio:
  que existe un camino dirigido desde el elemento consultado siguiendo aristas `origen habilita
  destino`, que los alcanzables son los afectados por su indisponibilidad y que la dirección no se
  invierte. La explicación incluye un ejemplo sobre la red sintética.

### RNF-F2-01 · Separación de capas

- **AC-F2-09.** La revisión del backend confirma que el recorrido de impacto vive en el dominio (o
  en la aplicación si es orquestación) y que la capa HTTP no implementa el recorrido ni decide qué
  elementos son afectados. Si el frontend expone el resultado del impacto, la revisión del frontend
  confirma que no recalcula los alcanzables, no invierte la dirección y no filtra por reglas
  propias.

### RNF-F2-02 · Datos sintéticos y errores explícitos

- **AC-F2-08.** Los elementos y dependencias empleados en la verificación de F2 son sintéticos y
  coherentes con el dominio, sin datos de personas, proveedores ni empresas reales. Ningún error de
  la consulta de impacto se oculta ni se presenta como un resultado aparentemente válido: cada
  fallo sale con el sobre de error y el código que le corresponde.

### RNF-F2-03 · Trazabilidad

- **AC-F2-10.** Existe trazabilidad `necesidad (N9 a N14) → requisito (RF-F2-01 a RF-F2-09,
  RNF-F2-01 a RNF-F2-03) → criterio (AC-F2-01 a AC-F2-15)` en `requirements.md` §9, y cada criterio
  de esta sección remite al requisito del que deriva.

### Casos límite de F2

| Caso | Resultado esperado | Criterio |
| ---- | ------------------ | -------- |
| Elemento inexistente | `404` `ERR-02`, sin contenido de negocio | AC-F2-03 |
| Identificador mal formado en la ruta | `422` `ERR-05`, nunca `404` | AC-F2-11 |
| Catálogo vacío (grafo vacío) | `404` `ERR-02`; nunca `200` con lista vacía | AC-F2-12 |
| Elemento existente sin aristas salientes | `200`, elemento consultado identificado, total cero | AC-F2-04 |
| Elemento que habilita a una cadena | Devuelve alcanzables directos e indirectos | AC-F2-05 |
| Múltiples caminos al mismo elemento | El alcanzable aparece una sola vez | AC-F2-05b |
| Ciclo presente (permitido por F1) | El recorrido termina y devuelve alcanzables sin repetir | AC-F2-05c |
| Consulta desde un proveedor, un insumo, un proceso o un producto | Respeta la dirección definida | AC-F2-01, AC-F2-01b, AC-F2-07 |
| Dos consultas idénticas seguidas | Misma respuesta y mismo orden de afectados | AC-F2-13 |
| Consulta repetida sobre un grafo con ciclo | Sin ciclo infinito ni afectado duplicado | AC-F2-05c |

## 8. Criterios de aceptación de F3 — Orden de producción y ciclos

Requisitos en `requirements.md` §11, modelo en `graph-model.md` §6 y contrato en
`api-contract.md` §3.7 y §3.8. F3 tiene **dos consultas**: el diagnóstico global
(`GET /api/v1/orden-produccion`) y el plan de entrega (`GET /api/v1/plan-entrega`).

### 8.1 Datos de prueba de F3

Todos los conjuntos son sintéticos y respetan la matriz de F1.

**Conjunto A — base acíclica** (el de la sección 1):

| `origen` | `destino` |
| -------- | --------- |
| `PROV-ACERO` | `INS-BARRA` |
| `PROV-ACERO` | `INS-TORNILLO` |
| `INS-BARRA` | `PROC-CORTE` |
| `INS-TORNILLO` | `PROC-CORTE` |
| `PROC-CORTE` | `PROD-PANEL` |
| `PROC-CORTE` | `PROD-BANCO` |

**Conjunto B — acero cíclico:** A más `PROC-CORTE → INS-BARRA`. El ciclo es
`INS-BARRA → PROC-CORTE → INS-BARRA`.

**Conjunto C — rama de madera acíclica:** A más `PROV-MADERA → INS-TABLERO`,
`INS-TABLERO → PROC-ENSAMBLE` y `PROC-ENSAMBLE → PROD-ESCRITORIO`.

**Conjunto D — rama de madera cíclica:** A más `PROV-MADERA → INS-TABLERO`,
`INS-TABLERO → PROC-ENSAMBLE`, `PROC-ENSAMBLE → INS-TABLERO` y
`PROC-ENSAMBLE → PROD-ESCRITORIO`. El ciclo es `INS-TABLERO → PROC-ENSAMBLE → INS-TABLERO`.

**Conjunto E — producto sin requisitos:** un único elemento `PROD-SOLO` (`PRODUCTO`), sin aristas.

**Conjunto F — elementos aislados:** `PROD-A`, `PROD-B`, `PROD-C`, todos `PRODUCTO`, sin aristas.

**Conjunto G — mixto:** B más la rama de madera acíclica de C (sin el ciclo de D).

### 8.2 RF-F3-01 y RF-F3-02 · Diagnóstico global en DAG

- **AC-F3-01.** Con el Conjunto A, `GET /api/v1/orden-produccion` responde `200` con `esDag: true`,
  `orden` exactamente `[PROV-ACERO, INS-BARRA, INS-TORNILLO, PROC-CORTE, PROD-BANCO, PROD-PANEL]`,
  `totalPasos: 6`, `ciclos: []`, `elementosBloqueados: []`, `productosBloqueados: []` y
  `productosPlanificables: [PROD-BANCO, PROD-PANEL]`. Para toda arista `origen → destino`, el paso
  de `origen` es estrictamente menor que el de `destino`.
- **AC-F3-01b.** Con el catálogo vacío, `GET /api/v1/orden-produccion` responde `200` con
  `esDag: true`, `orden: []`, `totalPasos: 0`, listas de ciclos y bloqueados vacías y
  `productosPlanificables: []`.
- **AC-F3-01c.** Con el Conjunto F, responde `200` con `esDag: true`, `orden`
  `[PROD-A, PROD-B, PROD-C]` y `totalPasos: 3`.
- **AC-F3-01d.** Con el Conjunto C, el diagnóstico global es un DAG y produce un orden único donde
  cada cadena respeta sus precedencias y los elementos listos se intercalan por `id` ascendente:
  `[PROV-ACERO, INS-BARRA, INS-TORNILLO, PROC-CORTE, PROD-BANCO, PROD-PANEL, PROV-MADERA,
  INS-TABLERO, PROC-ENSAMBLE, PROD-ESCRITORIO]`.
- **AC-F3-02.** Diez llamadas consecutivas sobre el Conjunto A devuelven exactamente la misma
  secuencia. Cuando hay varios elementos listos, se elige siempre el de menor `id`; el orden no
  depende del orden de registro de las dependencias.

### 8.3 RF-F3-03 y RF-F3-04 · Diagnóstico global con ciclos

- **AC-F3-03.** Con el Conjunto B, `GET /api/v1/orden-produccion` responde `200` (nunca `409`) con
  `esDag: false`, `orden: []`, `totalPasos: 0`, `ciclos` con
  `{ "secuencia": ["INS-BARRA", "PROC-CORTE", "INS-BARRA"] }`,
  `elementosBloqueados: [INS-BARRA, PROC-CORTE, PROD-BANCO, PROD-PANEL]`,
  `productosBloqueados: [PROD-BANCO, PROD-PANEL]` y `productosPlanificables: []`. No se emite un
  orden parcial ni el código `ERR-10`.
- **AC-F3-03b.** En el mismo caso, `PROV-ACERO` e `INS-TORNILLO` no aparecen en
  `elementosBloqueados`: son requisitos previos del ciclo, no víctimas de él. `INS-TORNILLO` puede
  prepararse aunque `PROC-CORTE` quede bloqueado.
- **AC-F3-04.** Con un catálogo que contiene dos ciclos independientes (Conjunto B más el ciclo de
  madera del Conjunto D), el diagnóstico devuelve **un ciclo representativo por SCC**, ordenados por
  el menor `id` de su SCC: primero el de `INS-BARRA` y después el de `INS-TABLERO`. No enumera todos
  los ciclos elementales posibles.
- **AC-F3-04b.** Con el Conjunto D, el ciclo de madera bloquea `INS-TABLERO`, `PROC-ENSAMBLE` y
  `PROD-ESCRITORIO`, mientras que `PROD-BANCO` y `PROD-PANEL` aparecen en `productosPlanificables`.
  El diagnóstico no emite un orden parcial para ninguna de las dos ramas.

### 8.4 RF-F3-05 · Plan de entrega

- **AC-F3-05.** Con el Conjunto A, `GET /api/v1/plan-entrega?productos=PROD-PANEL` responde `200` con
  `productos: [{ id: "PROD-PANEL", tipo: "PRODUCTO", nombre: "Panel de montaje", estado:
  "PLANIFICABLE" }]`, `esPlanificable: true`, `pasos` exactamente
  `[PROV-ACERO, INS-BARRA, INS-TORNILLO, PROC-CORTE, PROD-PANEL]` (pasos 1 a 5), `totalPasos: 5`,
  `ciclos: []` y `elementosBloqueados: []`.
- **AC-F3-05b.** Con el Conjunto E, `?productos=PROD-SOLO` responde `200` con un único paso:
  `{ "paso": 1, "id": "PROD-SOLO", "tipo": "PRODUCTO", ... }`, `totalPasos: 1` y
  `esPlanificable: true`.
- **AC-F3-05c.** Con el Conjunto A, `?productos=PROD-PANEL,PROD-BANCO` responde `200` con 6 pasos,
  cada elemento una sola vez, en el mismo orden topológico del diagnóstico global, y ambos productos
  en estado `PLANIFICABLE`.
- **AC-F3-05d.** Con el Conjunto F, `?productos=PROD-B` responde `200` con un único paso
  (`PROD-B`) y `totalPasos: 1`.
- **AC-F3-05e.** El orden de los identificadores en `productos` no altera el plan: las listas se
  tratan como conjuntos y el resultado se ordena por `id`.

### 8.5 RF-F3-06 · Productos bloqueados y mezcla

- **AC-F3-06.** Con el Conjunto B, `?productos=PROD-PANEL` responde `200` (nunca `409`) con
  `esPlanificable: false`, el producto en estado `BLOQUEADO`, `pasos: []`, `totalPasos: 0`, el ciclo
  `["INS-BARRA", "PROC-CORTE", "INS-BARRA"]` y `elementosBloqueados`
  `[INS-BARRA, PROC-CORTE, PROD-PANEL]`.
- **AC-F3-06b.** Con el Conjunto G, `?productos=PROD-PANEL,PROD-ESCRITORIO` responde `200` con
  `esPlanificable: false`, `PROD-PANEL` en estado `BLOQUEADO`, `PROD-ESCRITORIO` en estado
  `PLANIFICABLE`, y `pasos` con solo la rama de madera
  (`PROV-MADERA, INS-TABLERO, PROC-ENSAMBLE, PROD-ESCRITORIO`). `ciclos` y `elementosBloqueados`
  contienen solo la rama de acero bloqueada.

### 8.6 RF-F3-07 · Ciclo en una rama no relacionada

- **AC-F3-07.** Con el Conjunto D (ciclo en madera), `?productos=PROD-PANEL` responde `200` con
  `esPlanificable: true`, el plan completo de la rama de acero
  (`PROV-ACERO, INS-BARRA, INS-TORNILLO, PROC-CORTE, PROD-PANEL`), `ciclos: []` y
  `elementosBloqueados: []`. El ciclo de madera no se incluye ni bloquea el plan solicitado.

### 8.7 RF-F3-08 · Validación de la selección

- **AC-F3-08.** `?productos=PROD-NOEXISTE` responde `404` con `ERR-02` y no devuelve plan.
- **AC-F3-08b.** `?productos=INS-BARRA` responde `422` con `ERR-04`, porque el elemento existe pero
  no es de tipo `PRODUCTO`.
- **AC-F3-08c.** `?productos=` vacío o la ausencia del parámetro `productos` responde `422` con
  `ERR-04`.
- **AC-F3-08d.** `?productos=xx` responde `422` con `ERR-05`, nunca `404`.
- **AC-F3-08e.** `?productos=prod-panel,PROD-PANEL` se normaliza y deduplica: devuelve un único
  producto y el mismo plan que `PROD-PANEL`.
- **AC-F3-08f.** `?productos=PROD-PANEL,INS-BARRA` falla completo con `422` `ERR-04`: no se devuelve
  un plan parcial para `PROD-PANEL`. Lo mismo ocurre si un identificador no existe o está mal
  formado: la petición completa falla.

### 8.8 RF-F3-09 · Estado por producto

- **AC-F3-09.** En `productos`, cada producto solicitado aparece exactamente una vez, con `tipo:
  "PRODUCTO"`, su `nombre` y su `estado` (`PLANIFICABLE` o `BLOQUEADO`). `esPlanificable` es `true`
  solo si todos los productos solicitados son `PLANIFICABLE`; con un solo producto bloqueado es
  `false` (AC-F3-05c y AC-F3-06b).

### 8.9 RF-F3-10 y RNF-F3-04 · Interfaz de F3

- **AC-F3-10.** La interfaz consume `GET /api/v1/plan-entrega` y muestra la lista numerada de pasos
  (`Paso 1`, `Paso 2`, ...) con `id`, `tipo` y `nombre`, además del estado de cada producto
  solicitado. Los datos mostrados son los que devuelve el backend real.
- **AC-F3-10b.** La interfaz consume `GET /api/v1/orden-produccion` y, cuando `esDag` es `true`,
  muestra el orden global; cuando es `false`, muestra una alerta visible con los ciclos, los
  elementos bloqueados y los productos bloqueados. No presenta una lista vacía como si todo estuviera
  en orden.
- **AC-F3-10c.** La inspección del frontend confirma que no implementa Kahn, SCC, DFS ni ningún
  cálculo de plan o de ciclo en TypeScript: solo representa los resultados de la API.

**Nota de dependencia.** Estos criterios de interfaz se verifican cuando el backend implemente el
contrato de `api-contract.md` §3.7 y §3.8. La vista actual refleja el contrato anterior; la
expectativa de interfaz y su dependencia están documentadas en `requirements.md` §11.9 y
`architecture.md` §9.5. El frontend no debe simular el plan de entrega ni el diagnóstico global
mientras el backend no exponga ese contrato.

### 8.10 RNF-F3-01 a RNF-F3-05 · Restricciones técnicas y de arquitectura

- **AC-F3-11.** La inspección del backend confirma que DAG, ordenamiento topológico, SCC, detección
  de ciclos y plan de entrega están implementados con algoritmos propios en `app/dominio/`, sin
  importar `networkx` ni usar `topological_sort`, `simple_cycles` u operaciones equivalentes.
- **AC-F3-12.** Con un grafo sintético de 200 elementos y 500 dependencias, el diagnóstico global y
  el plan de entrega responden en menos de 100 ms y su cálculo es $O(|V|+|E|)$ sobre el grafo o el
  subgrafo consultado.
- **AC-F3-13.** Diez ejecuciones consecutivas del diagnóstico global (DAG y con ciclo) y del plan de
  entrega producen exactamente el mismo contenido JSON, incluido el orden de ciclos y de pasos.
- **AC-F3-14.** La revisión de capas confirma que el cálculo vive en el dominio, que la capa HTTP solo
  valida el transporte y serializa, que los errores son explícitos (`ERR-02`, `ERR-04`, `ERR-05`) y
  que los datos usados son sintéticos.

## 9. Matriz de trazabilidad cruzada F3

| Requisito | Criterios de aceptación |
| --------- | ----------------------- |
| RF-F3-01 | AC-F3-01, AC-F3-01b, AC-F3-01c, AC-F3-01d |
| RF-F3-02 | AC-F3-01, AC-F3-01d, AC-F3-02 |
| RF-F3-03 | AC-F3-03, AC-F3-04b |
| RF-F3-04 | AC-F3-03, AC-F3-03b, AC-F3-04, AC-F3-04b |
| RF-F3-05 | AC-F3-05, AC-F3-05b, AC-F3-05c, AC-F3-05d, AC-F3-05e |
| RF-F3-06 | AC-F3-06, AC-F3-06b |
| RF-F3-07 | AC-F3-07 |
| RF-F3-08 | AC-F3-08, AC-F3-08b, AC-F3-08c, AC-F3-08d, AC-F3-08e, AC-F3-08f |
| RF-F3-09 | AC-F3-05c, AC-F3-06b, AC-F3-09 |
| RF-F3-10 | AC-F3-10, AC-F3-10b, AC-F3-10c |
| RNF-F3-01 | AC-F3-11 |
| RNF-F3-02 | AC-F3-12 |
| RNF-F3-03 | AC-F3-13 |
| RNF-F3-04 | AC-F3-10c |
| RNF-F3-05 | AC-F3-14 |

## 10. Criterios transversales de interfaz de usuario (UI)

Criterios de presentación aplicables a F1, F2 y F3. No sustituyen los criterios funcionales de las
secciones 2 a 8 ni introducen reglas de negocio. Requisitos en `requirements.md` §12 y estrategia en
`architecture.md` §9. `tester` es el único autorizado a declarar PASS/FAIL.

Los breakpoints obligatorios son **360, 768, 1024, 1440 y 1920 px** de ancho. Las verificaciones de
layout se realizan con el navegador a esos anchos y, cuando aplique, con alturas de 640, 800 y
1080 px. Las verificaciones de lenguaje se hacen sobre el texto visible, no sobre comentarios de
código, registros internos ni nombres de campos del contrato.

### 10.1 Lenguaje y textos

- **AC-UI-01.** La revisión de las cuatro vistas (Cadena de suministro, Materiales y procesos,
  Análisis de impacto y Orden de producción), de sus modales principales y de los textos copiables o
  exportables, en ambos temas, no encuentra ninguno de los términos prohibidos de
  `requirements.md` §12.2: `backend`, `frontend`, `API`, `endpoint`, `HTTP`, `409`, `CONFLICT`,
  `DAG`, `acíclico`, `topológico`, `secuenciación`, `Kahn`, `determinista`, `SCC`, `payload`,
  `JSON`, `Feature 1`, `Feature 2`, `F1`, `F2`, `F3`, `ID Técnico`, `motor de ordenamiento`, ni
  `grafo`, `nodo` o `arista` como texto visible. La comprobación combina una búsqueda de los
  literales visibles en el código del frontend y un recorrido manual de la interfaz. Los
  comentarios de código y los nombres internos no cuentan.

- **AC-UI-02.** Al provocar un error de negocio (por ejemplo, crear un elemento con un
  identificador ya existente) y una dependencia circular con el Conjunto B de §8.1, el texto visible
  cumple:
  - no contiene códigos HTTP (`200`, `404`, `409`, `CONFLICT`, `4xx`, `5xx`) ni términos de
    AC-UI-01;
  - en el error, indica qué dato o combinación impide la operación y qué puede hacer el usuario;
  - en la dependencia circular, identifica los elementos que se contradicen, la parte de la cadena
    afectada y qué productos o elementos se pueden preparar igual;
  - no presenta el error como estado vacío ni como operación exitosa.

  La verificación se repite en tema claro y oscuro.

- **AC-UI-03.** La acción general de relación se rotula «Crear relación» o «Vincular elementos», de
  forma consistente en el header, el modal y la guía. No aparece «Enlazar Suministro» ni «Relación
  de suministro» como nombre de la acción general. Desde la interfaz se pueden crear las cuatro
  combinaciones permitidas de la matriz (`PROVEEDOR → INSUMO`, `INSUMO → PROCESO`, `PROCESO →
  INSUMO`, `PROCESO → PRODUCTO`); al elegir una combinación no permitida, el motivo visible es de
  negocio y no un código. El título del modal coincide con la acción. La elección entre las dos
  redacciones aprobadas queda como `AMB-UI-01`.

- **AC-UI-04.** Al abrir la guía integrada se comprueba que:
  - afirma las cuatro relaciones permitidas y que el producto es terminal;
  - afirma que un insumo debe estar asociado a un proveedor o a un proceso antes de alimentar un
    proceso;
  - afirma que varias entradas son requisitos simultáneos (AND) y que no se admite
    `PROCESO → PROCESO`;
  - **no** afirma que un proveedor abastece procesos o productos, que un proceso recibe insumos
    directamente de un proveedor ni que un insumo alimenta productos;
  - no cita F1, F2 ni F3 ni términos prohibidos;
  - cada combinación que enumera coincide con `GET /api/v1/reglas-dependencia`.

- **AC-UI-04b.** Cuando exista la vista nueva de F3 (ver §8.9 y `requirements.md` §11.9), la guía
  explica el plan de entrega por uno o varios productos y el control general de planta con
  diagnóstico de dependencias circulares, elementos y productos bloqueados y productos
  planificables, en lenguaje de negocio. Mientras la vista nueva no exista, la guía no describe ese
  comportamiento como disponible. Este criterio queda bloqueado por `AMB-UI-02` hasta que el backend
  implemente el contrato nuevo.

- **AC-UI-12.** Al copiar o exportar un informe de análisis de impacto y un orden de producción, el
  texto resultante está en español natural, no contiene términos prohibidos, identifica los
  elementos por su identificador o nombre y su estado de negocio, y no incluye códigos HTTP ni
  nombres técnicos de campos. El contenido copiado coincide con los datos que devuelve la API.

- **AC-UI-13.** Todos los `aria-label`, `title`, `placeholder` y nombres accesibles de las cuatro
  vistas y de sus modales están en español natural, describen la acción o el estado y no contienen
  términos prohibidos. La inspección con lector de pantalla de los flujos principales (navegar,
  crear elemento, crear relación, evaluar impacto y consultar orden de producción) confirma que los
  nombres son comprensibles.

### 10.2 Viewport y responsive

- **AC-UI-05.** A 360 y 768 px de ancho, las cuatro secciones principales son alcanzables desde el
  header con toque y con teclado (Tab, Enter y Escape), el menú móvil o colapsable abre y cierra con
  estado visible, el foco es visible, la sección activa se indica y ninguna sección queda oculta sin
  una alternativa accesible. A 768 px se acepta tanto la navegación de escritorio como el menú móvil,
  siempre que las cuatro secciones sean alcanzables.

- **AC-UI-06.** A 360, 768, 1024, 1440 y 1920 px de ancho, en cada una de las cuatro vistas y con los
  modales principales abiertos (alta de elemento, alta de relación, guía y ficha de elemento), se
  cumple `document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1`. No
  aparece una barra de desplazamiento horizontal en la página. Un desplazamiento interno e
  intencional dentro de una tabla no cuenta como fallo si no provoca desplazamiento horizontal de la
  página.

- **AC-UI-07.** El header, el fondo y las barras ocupan el ancho completo del viewport, sin el
  espacio muerto que produce un contenedor global centrado. Las vistas de datos (tabla, red y pasos
  de producción) usan el ancho disponible del shell menos el padding definido, sin un contenedor
  global que las centre. Los bloques de lectura tienen un ancho máximo de entre 45 y 80 caracteres
  por línea (objetivo 60 a 75), medido sobre un párrafo representativo a 1440 y 1920 px, y quedan
  alineados dentro del shell, no centrados como página. El shell cubre al menos el alto del viewport
  y el área principal usa el alto restante.

- **AC-UI-08.** A 360, 768, 1024, 1440 y 1920 px de ancho, los elementos del header no se solapan
  (sus cajas no se intersectan), ningún texto visible queda cortado (`scrollWidth <= clientWidth`
  en cada etiqueta) y logo, navegación, estado, ayuda, tema y las dos acciones principales son
  alcanzables. Si el header usa dos filas o navegación colapsable, el layout permanece estable al
  abrir y cerrar. A 360 px las acciones principales siguen siendo alcanzables.

- **AC-UI-09.** A 360, 768, 1024, 1440 y 1920 px de ancho y a 640, 800 y 1080 px de alto, el grafo y
  los paneles se adaptan al espacio disponible. No existe una altura fija en píxeles para el
  contenedor del grafo o de los paneles (`h-[560px]`, `lg:h-[620px]` u equivalente); la altura
  calculada cambia con el viewport y se usan `flex`, `min-h-0` y `dvh` o equivalente. No hay
  contenedores que desborden la pantalla ni desplazamientos anidados que oculten el grafo.

- **AC-UI-14.** A 360 px de ancho, los controles táctiles principales (navegación, tema, ayuda, alta
  de elemento, alta de relación, botones primarios de los modales y cierre) tienen un área de
  contacto de al menos 44 × 44 px CSS y sus áreas no se solapan.

- **AC-UI-18.** A 360, 768, 1024, 1440 y 1920 px de ancho, las cuatro vistas se renderizan sin
  navegación faltante, sin contenido solapado, sin texto cortado y sin desplazamiento horizontal de
  página. Este criterio es de cobertura: las comprobaciones específicas son AC-UI-05 a AC-UI-09.

### 10.3 Temas, tokens y accesibilidad

- **AC-UI-10.** En el tema claro, la medición de contraste sobre la página renderizada y sobre los
  pares de tokens confirma:
  - al menos 4.5:1 para texto normal (cuerpo, etiquetas, tabla, botones, badges, tooltips y
    mensajes de error o éxito);
  - al menos 3:1 para texto grande y para componentes de interfaz (bordes de campos, iconos, anillo
    de foco, pestaña activa y botones);
  - foco de teclado visible en todos los elementos interactivos, con al menos 3:1 contra los colores
    adyacentes;
  - ningún estado se comunica solo por color.

- **AC-UI-11.** El tema oscuro conserva los valores de sus tokens respecto de la versión aprobada
  por el cliente antes de esta mejora. La comparación de las definiciones de tokens y la revisión
  visual de las cuatro vistas y de los modales principales no muestran cambios de color ni
  regresiones de legibilidad. No existe selector de temas adicional ni un tercer tema; el control
  existente de alternancia claro/oscuro sigue funcionando.

- **AC-UI-15.** La inspección del código confirma que los colores se definen como variables CSS
  semánticas en las definiciones de tema, que Tailwind referencia esos tokens y que la paleta de
  Cytoscape lee los mismos tokens. No hay colores hexadecimales, `rgb` o `hsl` hardcodeados en los
  componentes fuera de las definiciones de tokens. Al cambiar de tema se actualizan tanto la interfaz
  como los colores del grafo.

- **AC-UI-16.** En ambos temas, los estados de selección, alerta de stock, impacto y dependencia
  circular se distinguen sin depender solo del color: cada uno incluye icono, texto, borde, patrón o
  etiqueta además del color. Se verifica en la red, en las tarjetas, en la tabla y en la vista de
  producción. El contraste de los estados cumple AC-UI-10 en el tema claro y sigue siendo legible en
  el oscuro.

### 10.4 Separación de responsabilidades

- **AC-UI-17.** La inspección del frontend confirma que no implementa Kahn, SCC, DFS, ordenamiento
  topológico, detección de ciclos, recorridos de impacto ni cálculo de planes; no reordena ni
  deduplica dependencias por reglas de negocio y solo representa los resultados de la API. La
  traducción de un código de error o de un resultado estructurado a lenguaje de negocio no cambia el
  significado del resultado ni inventa reglas. Las afirmaciones de la guía sobre la matriz coinciden
  con `GET /api/v1/reglas-dependencia`.

### 10.5 Matriz de trazabilidad UI

| Requisito | Criterios |
| --------- | --------- |
| RF-UI-01 | AC-UI-01, AC-UI-02, AC-UI-12, AC-UI-13 |
| RF-UI-02 | AC-UI-01, AC-UI-04, AC-UI-12, AC-UI-13 |
| RF-UI-03 | AC-UI-02 |
| RF-UI-04 | AC-UI-03 |
| RF-UI-05 | AC-UI-04, AC-UI-04b |
| RF-UI-06 | AC-UI-12, AC-UI-13 |
| RF-UI-07 | AC-UI-07, AC-UI-18 |
| RF-UI-08 | AC-UI-07 |
| RF-UI-09 | AC-UI-05, AC-UI-08 |
| RF-UI-10 | AC-UI-09 |
| RF-UI-11 | AC-UI-11 |
| RF-UI-12 | AC-UI-10 |
| RF-UI-13 | AC-UI-16 |
| RNF-UI-01 | AC-UI-06, AC-UI-18 |
| RNF-UI-02 | AC-UI-14 |
| RNF-UI-03 | AC-UI-10, AC-UI-16 |
| RNF-UI-04 | AC-UI-15 |
| RNF-UI-05 | AC-UI-17 |
| RNF-UI-06 | AC-UI-04, AC-UI-04b |
