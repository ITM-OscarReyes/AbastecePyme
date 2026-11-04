# Criterios de aceptación — AbastecePyme (F1 y F2)

Criterios de aceptación de **F1 — Catálogo de dependencias** y de **F2 — Análisis de impacto**,
derivados de `requirements.md` y verificables de extremo a extremo.

- Cada criterio es verificable de forma objetiva: describe una entrada, un resultado esperado y,
  cuando aplica, el código de error o el elemento del catálogo que se inspecciona.
- Los identificadores son estables y se reutilizan en `requirements.md`, `api-contract.md`,
  `architecture.md` y en las pruebas.
- `tester` es el único agente autorizado para declarar PASS/FAIL de estos criterios.
- Los criterios de F3 y F4 **no** están aquí: este documento cubre únicamente F1 (secciones 1 a 6) y
  F2 (sección 7).

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
| RNF-F1-01 | AC-F1-24 |
| RNF-F1-02 | AC-F1-24 |
| RNF-F1-03 | AC-F1-15 |
| RNF-F1-04 | AC-F1-17 |
| RNF-F1-05 | AC-F1-18 |
| RNF-F1-06 | AC-F1-14, AC-F1-22 |
| RNF-F1-07 | AC-F1-19 |
| RNF-F1-08 | AC-F1-12 |
| RNF-F1-09 | AC-F1-20 |
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

