# Criterios de aceptación — AbastecePyme (F1)

Criterios de aceptación de **F1 — Catálogo de dependencias**, derivados de `requirements.md` y
verificables de extremo a extremo.

- Cada criterio es verificable de forma objetiva: describe una entrada, un resultado esperado y,
  cuando aplica, el código de error o el elemento del catálogo que se inspecciona.
- Los identificadores son estables y se reutilizan en `requirements.md`, `api-contract.md`,
  `architecture.md` y en las pruebas.
- `tester` es el único agente autorizado para declarar PASS/FAIL de estos criterios.
- Los criterios de F2, F3 y F4 **no** están aquí: este documento cubre únicamente F1.

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
| `INS-BARRA` | `PROC-CORTE` | Para el corte de panel necesito la barra de acero |
| `PROC-CORTE` | `PROD-PANEL` | Para el panel necesito el proceso de corte |
| `INS-TORNILLO` | `PROD-PANEL` | Para el panel necesito tornillos |
| `PROD-PANEL` | `PROD-BANCO` | Para el banco de montaje necesito el panel |

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
  `origen: INS-TORNILLO`, `destino: PROD-PANEL` significa «para producir el panel necesito tornillos».
  La consulta de la red muestra `INS-TORNILLO` como origen de la flecha y `PROD-PANEL` como
  destino.
- **AC-F1-06c.** Si `origen` no existe, la respuesta es `404` con `ERR-02` y el detalle señala el
  campo `origen`. Si `destino` no existe, la respuesta es `404` con `ERR-02` y el detalle señala
  `destino`. En ambos casos no se registra ninguna dependencia.
- **AC-F1-06d.** Las dependencias inversas (`A → B` y luego `B → A`) son relaciones distintas: ambas
  se registran con `201` y las dos aparecen en el listado de dependencias.

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