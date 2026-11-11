# Contrato de API — AbastecePyme (F1, F2 y F3)

Contrato HTTP de **F1 — Catálogo de dependencias**, **F2 — Análisis de impacto** y **F3 — Orden y ciclos de producción**.

- Requisitos: `requirements.md`. Dirección y estructura: `graph-model.md`.
- Verificación: `acceptance-criteria.md`.
- Alcance: endpoints de F1, F2 y F3. Los endpoints de tablero integrado (F4) **no** se definen aquí.

Los ejemplos en JSON son ilustrativos del formato esperado; no son archivos de datos del proyecto.

## 1. Convenciones generales

| Aspecto | Definición |
| ------- | ---------- |
| Base del contrato | `/api/v1` |
| Formato | JSON en peticiones y respuestas; `Content-Type: application/json` |
| Codificación | UTF-8 |
| Fechas | Ningún campo de F1 incluye fecha u hora |
| Nombres de campos | `lowerCamelCase` en el JSON. Es la convención del contrato HTTP, no la del lenguaje: el backend escribe en `snake_case` y traduce en la capa de infraestructura (ver `architecture.md`, sección 3.1) |
| Respuestas de colección | Objeto con la colección y su total, nunca un array desnudo |
| Respuestas de creación | `201 Created` con cabecera `Location` y el recurso creado en el cuerpo |
| Errores | Sobre único y uniforme (sección 5) |
| Determinismo | Colecciones ordenadas de forma estable por `id` ascendente |

## 2. Recursos

### 2.1 `Elemento`

| Campo | Tipo | Obligatorio en respuesta | Reglas |
| ----- | ---- | ------------------------ | ------ |
| `id` | texto | Sí | Identificador único del catálogo. Mayúsculas, 3 a 40 caracteres, patrón `^[A-Z0-9][A-Z0-9_-]{2,39}$`. Inmutable. |
| `tipo` | texto | Sí | `PROVEEDOR`, `INSUMO`, `PRODUCTO` o `PROCESO`. |
| `nombre` | texto | Sí | 3 a 80 caracteres, no vacío tras recortar espacios. |
| `descripcion` | texto o nulo | Sí | Hasta 300 caracteres. Puede ser `null`. |

Ejemplo de elemento:

```json
{
  "id": "INS-TORNILLO",
  "tipo": "INSUMO",
  "nombre": "Tornillo hexagonal M6",
  "descripcion": "Insumo sintético de ejemplo para estructuras mecánicas."
}
```

### 2.2 `Dependencia`

| Campo | Tipo | Obligatorio en respuesta | Reglas |
| ----- | ---- | ------------------------ | ------ |
| `origen` | texto | Sí | `id` de un elemento existente. Habilita. |
| `destino` | texto | Sí | `id` de un elemento existente. Habilitado por el origen. |
| `tipoRelacion` | texto | Sí | Valor constante `habilita`. Hace explícita la dirección para el consumidor. |

La pareja `(origen, destino)` es única. `origen` y `destino` no pueden ser iguales.

Ejemplo de dependencia:

```json
{
  "origen": "PROC-CORTE",
  "destino": "PROD-PANEL",
  "tipoRelacion": "habilita"
}
```

La lectura es: «para producir el panel `PROD-PANEL` necesito el proceso de corte
`PROC-CORTE`». La combinación debe pertenecer a la matriz de la sección 4.2.

### 2.3 `PasoProduccion` (F3)

Representa una etapa secuencial dentro de un plan de entrega o del orden global de preparación.

| Campo | Tipo | Obligatorio | Reglas |
| ----- | ---- | ----------- | ------ |
| `paso` | entero | Sí | Número secuencial (1-indexado: 1, 2, ...). |
| `id` | texto | Sí | Identificador del elemento a preparar. |
| `tipo` | texto | Sí | Tipo del elemento (`PROVEEDOR`, `INSUMO`, `PRODUCTO`, `PROCESO`). |
| `nombre` | texto | Sí | Nombre del elemento. |

### 2.4 `CicloDetectado` (F3)

Describe una contradicción circular detectada. Es un objeto de resultado, no un error HTTP.

| Campo | Tipo | Obligatorio | Reglas |
| ----- | ---- | ----------- | ------ |
| `secuencia` | lista de textos | Sí | Secuencia cerrada `[c_1, c_2, ..., c_k, c_1]` donde cada paso es una arista registrada y el último cierra en el primero. |

Se reporta **un ciclo representativo por SCC cíclica**, no todos los ciclos elementales.

### 2.5 `ProductoEntrega` (F3)

Producto solicitado en un plan de entrega y su estado.

| Campo | Tipo | Obligatorio | Reglas |
| ----- | ---- | ----------- | ------ |
| `id` | texto | Sí | Identificador del producto. |
| `tipo` | texto | Sí | Valor constante `PRODUCTO`. |
| `nombre` | texto | Sí | Nombre del producto. |
| `estado` | texto | Sí | `PLANIFICABLE` si sus requisitos pueden ordenarse; `BLOQUEADO` si dependen de un ciclo. |

### 2.6 `PlanEntregaRespuesta` (F3)

Respuesta de `GET /api/v1/plan-entrega`.

| Campo | Tipo | Obligatorio | Reglas |
| ----- | ---- | ----------- | ------ |
| `productos` | lista de `ProductoEntrega` | Sí | Un elemento por producto solicitado, sin duplicados, ordenado por `id`. |
| `esPlanificable` | booleano | Sí | `true` solo si todos los productos solicitados son `PLANIFICABLE`. |
| `pasos` | lista de `PasoProduccion` | Sí | Unión deduplicada de los requisitos de los productos planificables, en orden topológico determinista. Puede ser `[]` si todos están bloqueados. |
| `totalPasos` | entero | Sí | Cantidad de pasos de `pasos`. |
| `ciclos` | lista de `CicloDetectado` | Sí | Ciclos del subgrafo solicitado. `[]` si no hay. |
| `elementosBloqueados` | lista de textos | Sí | Elementos del subgrafo que no pueden ordenarse por ciclos. `[]` si no hay. |

### 2.7 `OrdenProduccionRespuesta` (F3)

Respuesta de `GET /api/v1/orden-produccion`. Se devuelve siempre con `200 OK`, tanto si la red es un
DAG como si contiene ciclos.

| Campo | Tipo | Obligatorio | Reglas |
| ----- | ---- | ----------- | ------ |
| `esDag` | booleano | Sí | `true` si el grafo completo es acíclico. |
| `orden` | lista de `PasoProduccion` | Sí | Si `esDag` es `true`, secuencia topológica completa. Si es `false`, lista vacía: no se emite orden parcial. |
| `totalPasos` | entero | Sí | Cardinalidad de `V` si `esDag` es `true`; `0` si es `false`. |
| `ciclos` | lista de `CicloDetectado` | Sí | Un ciclo representativo por SCC cíclica, ordenados por el menor `id` de su SCC. `[]` si es DAG. |
| `elementosBloqueados` | lista de textos | Sí | Elementos que no pueden ordenarse por ciclos o por depender de ellos. `[]` si es DAG. |
| `productosBloqueados` | lista de textos | Sí | Productos incluidos en `elementosBloqueados`, ordenados por `id`. `[]` si es DAG. |
| `productosPlanificables` | lista de textos | Sí | Productos del catálogo no bloqueados, ordenados por `id`. |

## 3. Endpoints

| Método | Ruta | Descripción | Requisitos |
| ------ | ---- | ----------- | ---------- |
| `POST` | `/api/v1/elementos` | Crear un elemento del catálogo | RF-F1-01, RF-F1-02, RF-F1-03, RF-F1-11 |
| `GET` | `/api/v1/elementos` | Listar elementos, con filtro opcional por tipo | RF-F1-04, RF-F1-13 |
| `GET` | `/api/v1/elementos/{id}` | Consultar un elemento por identificador | RF-F1-05 |
| `POST` | `/api/v1/dependencias` | Registrar una dependencia dirigida | RF-F1-06, RF-F1-07, RF-F1-08, RF-F1-11 |
| `GET` | `/api/v1/dependencias` | Listar dependencias, con filtro opcional por `origen` o `destino` | RF-F1-09, RF-F1-13 |
| `GET` | `/api/v1/grafo` | Obtener la representación del grafo del catálogo | RF-F1-10, RF-F1-15 |
| `GET` | `/api/v1/reglas-dependencia` | Obtener las 16 combinaciones de tipos con su veredicto y motivo | RF-F1-22, RNF-F1-10 |
| `GET` | `/api/v1/plan-entrega` | Obtener el plan de preparación de uno o varios productos | RF-F3-05 a RF-F3-09 |
| `GET` | `/api/v1/orden-produccion` | Diagnóstico global: orden completo si la red es DAG; reporte estructurado de ciclos si no lo es | RF-F3-01 a RF-F3-04, RF-F3-10 |

Cualquier otra ruta del API que no esté definida en este documento responde `404` con `ERR-09`.

### 3.1 `POST /api/v1/elementos`

Cuerpo: los campos de `Elemento` excepto los de solo salida. `descripcion` es opcional; si se omite,
se devuelve como `null`.

```json
{
  "id": "ins-tornillo",
  "tipo": "insumo",
  "nombre": "Tornillo hexagonal M6",
  "descripcion": "Insumo sintético de ejemplo para estructuras mecánicas."
}
```

Comportamiento:

1. Valida la presencia, el tipo y el formato de los campos, y normaliza `id` y `tipo` a mayúsculas.
2. Rechaza cualquier campo no reconocido.
3. Si el `id` ya existe, responde `409` con `ERR-01` y no modifica el catálogo.
4. Registra el elemento y lo devuelve.

Respuestas:

| Código | Cuerpo | Cuándo |
| ------ | ------ | ------ |
| `201` | `Elemento` | Elemento creado correctamente. Cabecera `Location: /api/v1/elementos/{id}`. |
| `400` | Error `ERR-03` | Cuerpo ilegible, no es un objeto JSON o `Content-Type` incorrecto. |
| `409` | Error `ERR-01` | El `id` ya existe en el catálogo. |
| `422` | Error `ERR-04` a `ERR-06` según el campo | Falta un campo obligatorio, el tipo de un campo no corresponde, el formato no se cumple o el campo no está permitido. |

Ejemplo de respuesta `201`:

```json
{
  "id": "INS-TORNILLO",
  "tipo": "INSUMO",
  "nombre": "Tornillo hexagonal M6",
  "descripcion": "Insumo sintético de ejemplo para estructuras mecánicas."
}
```

### 3.2 `GET /api/v1/elementos`

Parámetros de consulta:

| Parámetro | Obligatorio | Regla |
| --------- | ----------- | ----- |
| `tipo` | No | Filtra por tipo. Se normaliza a mayúsculas. Un valor fuera del conjunto cerrado responde `422` con `ERR-04`. |

Respuesta `200`:

```json
{
  "elementos": [
    { "id": "INS-BARRA", "tipo": "INSUMO", "nombre": "Barra de acero", "descripcion": null },
    { "id": "INS-TORNILLO", "tipo": "INSUMO", "nombre": "Tornillo hexagonal M6", "descripcion": null },
    { "id": "PROD-PANEL", "tipo": "PRODUCTO", "nombre": "Panel de montaje", "descripcion": null }
  ],
  "total": 3
}
```

Con el catálogo vacío la respuesta es `200` con `elementos: []` y `total: 0`. Con un filtro sin
coincidencias, igual: es un resultado vacío, no un error.

### 3.3 `GET /api/v1/elementos/{id}`

| Código | Cuerpo | Cuándo |
| ------ | ------ | ------ |
| `200` | `Elemento` | El elemento existe. |
| `422` | Error `ERR-05` | El `id` de la ruta no cumple el formato. |
| `404` | Error `ERR-02` | El `id` cumple el formato pero no existe. |

El `id` se normaliza a mayúsculas antes de buscar. Un `id` mal formado nunca produce `404`: son
situaciones distintas y el cliente debe poder distinguirlas (RF-F1-05).

### 3.4 `POST /api/v1/dependencias`

Cuerpo:

```json
{
  "origen": "PROC-CORTE",
  "destino": "PROD-PANEL"
}
```

Comportamiento:

1. Valida que `origen` y `destino` estén presentes y cumplan el formato de identificador.
2. Comprueba que ambos elementos existen en el catálogo.
3. Comprueba que `origen` y `destino` son distintos.
4. Comprueba que la combinación de tipos pertenece a la matriz de la sección 4.2.
5. Si la combinación es `INSUMO → PROCESO`, comprueba que el insumo ya tiene una arista entrante de
   `PROVEEDOR` o `PROCESO`.
6. Comprueba que la dependencia no existe ya.
7. Inserta la arista y la devuelve.

Si cualquiera de las comprobaciones falla, no se registra nada: el catálogo queda intacto. La
dirección es la definida en `graph-model.md`: el origen habilita al destino.

Respuestas:

| Código | Cuerpo | Cuándo |
| ------ | ------ | ------ |
| `201` | `Dependencia` | Dependencia creada. Cabecera `Location: /api/v1/dependencias/{origen}/{destino}`. |
| `400` | Error `ERR-03` | Cuerpo ilegible o con estructura incorrecta. |
| `404` | Error `ERR-02` | `origen` o `destino` no existe. El detalle indica el campo. |
| `409` | Error `ERR-08` | La dependencia ya existe. |
| `422` | Error `ERR-04` a `ERR-07` | Formato inválido, tipo de dato incorrecto, campo desconocido, `origen` igual a `destino` (`ERR-07`), combinación de tipos no permitida (`ERR-07`) o `INSUMO` sin asociación previa (`ERR-07`). |

Ejemplo de respuesta `201`:

```json
{
  "origen": "PROC-CORTE",
  "destino": "PROD-PANEL",
  "tipoRelacion": "habilita"
}
```

Las dependencias inversas (`A → B` y luego `B → A`) son relaciones distintas y ambas se registran
cuando la matriz las permite: forman un ciclo, y F1 no las rechaza ni las detecta (RF-F1-16). Con la
matriz vigente, los únicos ciclos posibles alternan `INSUMO` y `PROCESO`.

### 3.5 `GET /api/v1/dependencias`

Parámetros de consulta:

| Parámetro | Obligatorio | Regla |
| --------- | ----------- | ----- |
| `origen` | No | Filtra por el elemento que habilita. |
| `destino` | No | Filtra por el elemento habilitado. |

Ambos pueden enviarse a la vez, en cuyo caso el resultado cumple las dos condiciones. Un valor con
formato inválido responde `422` con `ERR-05`.

Respuesta `200`:

```json
{
  "dependencias": [
    { "origen": "INS-BARRA", "destino": "PROC-CORTE", "tipoRelacion": "habilita" },
    { "origen": "PROC-CORTE", "destino": "PROD-PANEL", "tipoRelacion": "habilita" },
    { "origen": "PROV-ACERO", "destino": "INS-BARRA", "tipoRelacion": "habilita" }
  ],
  "total": 3
}
```

Orden: por `origen` ascendente y, a igualdad de origen, por `destino` ascendente. Sin dependencias,
la respuesta es `200` con `dependencias: []` y `total: 0`.

### 3.6 `GET /api/v1/grafo`

Devuelve la representación del grafo tal como está en el catálogo, para su visualización. No calcula
recorridos, ciclos ni órdenes.

Respuesta `200`:

```json
{
  "elementos": [
    { "id": "INS-BARRA", "tipo": "INSUMO", "nombre": "Barra de acero", "descripcion": null },
    { "id": "PROC-CORTE", "tipo": "PROCESO", "nombre": "Corte de panel", "descripcion": null },
    { "id": "PROD-PANEL", "tipo": "PRODUCTO", "nombre": "Panel de montaje", "descripcion": null },
    { "id": "PROV-ACERO", "tipo": "PROVEEDOR", "nombre": "Proveedor de acero", "descripcion": null }
  ],
  "dependencias": [
    { "origen": "INS-BARRA", "destino": "PROC-CORTE", "tipoRelacion": "habilita" },
    { "origen": "PROC-CORTE", "destino": "PROD-PANEL", "tipoRelacion": "habilita" },
    { "origen": "PROV-ACERO", "destino": "INS-BARRA", "tipoRelacion": "habilita" }
  ],
  "resumen": {
    "totalElementos": 4,
    "totalDependencias": 3
  }
}
```

El grafo vacío responde `200` con colecciones vacías y totales en cero.

### 3.7 `GET /api/v1/orden-produccion` — diagnóstico global de planta

Evalúa la red completa como DAG y devuelve el orden de preparación global si es acíclica, o un
reporte estructurado de ciclos si no lo es. **Responde siempre `200 OK`**: un ciclo es un resultado
de negocio válido y accionable, no un fallo de la petición.

**Comportamiento:**

1. Obtiene los elementos y dependencias del catálogo.
2. Si el catálogo está vacío ($V = \emptyset$), responde `200` con `esDag: true`, `orden: []`,
   `totalPasos: 0`, listas de ciclos y bloqueados vacías y `productosPlanificables: []`.
3. Aplica el ordenamiento topológico determinista (Kahn) sobre todo el grafo, desempatando por `id`
   ascendente.
4. Si ordena todos los elementos, el grafo es un DAG: devuelve `orden` completo,
   `totalPasos = |V|`, `ciclos: []`, `elementosBloqueados: []`, `productosBloqueados: []` y todos los
   productos del catálogo en `productosPlanificables`.
5. Si no ordena todos los elementos, hay al menos un ciclo: devuelve `esDag: false`, `orden: []` y
   `totalPasos: 0` (sin orden parcial), `ciclos` con un ciclo representativo por SCC cíclica,
   `elementosBloqueados`, `productosBloqueados` y `productosPlanificables` con los productos no
   bloqueados.

**Respuestas:**

| Código | Cuerpo | Cuándo |
| ------ | ------ | ------ |
| `200` | `OrdenProduccionRespuesta` con `esDag: true` | El grafo es un DAG. Devuelve la secuencia completa de preparación. |
| `200` | `OrdenProduccionRespuesta` con `esDag: false` | Hay ciclos. Devuelve el reporte estructurado y no emite orden parcial. |

No se emite `409` ni `ERR-10` desde este endpoint. `ERR-10` (`CONFIGURACION_CICLICA`) permanece en el
catálogo por compatibilidad histórica, pero F3 no lo usa.

**Ejemplo de respuesta `200` (DAG acíclico):**

```json
{
  "esDag": true,
  "orden": [
    { "paso": 1, "id": "PROV-ACERO", "tipo": "PROVEEDOR", "nombre": "Proveedor de acero" },
    { "paso": 2, "id": "INS-BARRA", "tipo": "INSUMO", "nombre": "Barra de acero" },
    { "paso": 3, "id": "PROC-CORTE", "tipo": "PROCESO", "nombre": "Corte de panel" },
    { "paso": 4, "id": "PROD-PANEL", "tipo": "PRODUCTO", "nombre": "Panel de montaje" }
  ],
  "totalPasos": 4,
  "ciclos": [],
  "elementosBloqueados": [],
  "productosBloqueados": [],
  "productosPlanificables": ["PROD-PANEL"]
}
```

**Ejemplo de respuesta `200` (red con un ciclo):**

```json
{
  "esDag": false,
  "orden": [],
  "totalPasos": 0,
  "ciclos": [
    { "secuencia": ["INS-BARRA", "PROC-CORTE", "INS-BARRA"] }
  ],
  "elementosBloqueados": ["INS-BARRA", "PROC-CORTE", "PROD-PANEL"],
  "productosBloqueados": ["PROD-PANEL"],
  "productosPlanificables": []
}
```

`elementosBloqueados` incluye los elementos de la SCC cíclica y los que dependen de ella. Un
elemento que solo es requisito previo del ciclo (por ejemplo, un proveedor que alimenta a un insumo
del ciclo) no está bloqueado.

### 3.8 `GET /api/v1/plan-entrega` — plan de preparación por producto

Devuelve el plan de preparación de uno o varios productos: la unión deduplicada de sus requisitos
previos, en orden topológico determinista.

Parámetros de consulta:

| Parámetro | Obligatorio | Regla |
| --------- | ----------- | ----- |
| `productos` | Sí | Lista de identificadores separados por coma. No puede estar vacía. Cada identificador se recorta y se pasa a mayúsculas; los duplicados se eliminan. |

**Comportamiento:**

1. Valida que `productos` esté presente y no esté vacío; si no, `422` `ERR-04`.
2. Normaliza y deduplica la lista. Cada identificador debe cumplir el formato de la sección 4.1; si
   no, `422` `ERR-05`.
3. Cada identificador debe existir en el catálogo; si no, `404` `ERR-02`.
4. Cada elemento debe ser de tipo `PRODUCTO`; si no, `422` `ERR-04`.
5. Si alguna validación falla, **falla la petición completa**: no se devuelve un plan parcial.
6. Calcula la unión de los ancestros de los productos solicitados y aplica Kahn sobre ese subgrafo.
7. Los productos cuyos requisitos alcanzan un ciclo quedan `BLOQUEADO`; los demás, `PLANIFICABLE`.
   `pasos` contiene solo la unión de requisitos de los productos planificables.
8. Si todos los productos están bloqueados, responde `200` con `pasos: []`, `totalPasos: 0` y todos
   los estados `BLOQUEADO`.
9. Un ciclo en una rama no relacionada no se considera ni bloquea el plan.

**Respuestas:**

| Código | Cuerpo | Cuándo |
| ------ | ------ | ------ |
| `200` | `PlanEntregaRespuesta` | La selección es válida, aunque todos los productos estén bloqueados. |
| `404` | Error `ERR-02` | Algún identificador no existe en el catálogo. |
| `422` | Error `ERR-04` | Falta `productos`, la lista está vacía o algún elemento no es de tipo `PRODUCTO`. |
| `422` | Error `ERR-05` | Algún identificador no cumple el formato. |

**Ejemplo de respuesta `200` (producto planificable):**

```json
{
  "productos": [
    { "id": "PROD-PANEL", "tipo": "PRODUCTO", "nombre": "Panel de montaje", "estado": "PLANIFICABLE" }
  ],
  "esPlanificable": true,
  "pasos": [
    { "paso": 1, "id": "PROV-ACERO", "tipo": "PROVEEDOR", "nombre": "Proveedor de acero" },
    { "paso": 2, "id": "INS-BARRA", "tipo": "INSUMO", "nombre": "Barra de acero" },
    { "paso": 3, "id": "PROC-CORTE", "tipo": "PROCESO", "nombre": "Corte de panel" },
    { "paso": 4, "id": "PROD-PANEL", "tipo": "PRODUCTO", "nombre": "Panel de montaje" }
  ],
  "totalPasos": 4,
  "ciclos": [],
  "elementosBloqueados": []
}
```

**Ejemplo de respuesta `200` (producto bloqueado):**

```json
{
  "productos": [
    { "id": "PROD-PANEL", "tipo": "PRODUCTO", "nombre": "Panel de montaje", "estado": "BLOQUEADO" }
  ],
  "esPlanificable": false,
  "pasos": [],
  "totalPasos": 0,
  "ciclos": [
    { "secuencia": ["INS-BARRA", "PROC-CORTE", "INS-BARRA"] }
  ],
  "elementosBloqueados": ["INS-BARRA", "PROC-CORTE", "PROD-PANEL"]
}
```

## 4. Reglas de validación

Las reglas se aplican en el dominio. La capa HTTP solo comprueba que la estructura de la petición es
interpretable; el resto se responde con los mismos códigos de error para que el resultado no dependa
de la capa (RNF-Q-04).

### 4.1 Elemento

| Campo | Regla | Error |
| ----- | ----- | ----- |
| `id` | Obligatorio. Debe ser texto. Recortar y pasar a mayúsculas. Entre 3 y 40 caracteres, primer carácter alfanumérico y el resto alfanumérico, guion o guion bajo. | `ERR-04` si falta, no es texto o no cumple el formato; `ERR-05` si cumple el formato pero no existe, en consultas |
| `tipo` | Obligatorio. Debe ser texto. Pasar a mayúsculas. Uno de `PROVEEDOR`, `INSUMO`, `PRODUCTO`, `PROCESO`. | `ERR-04` |
| `nombre` | Obligatorio. Debe ser texto. Recortar. Entre 3 y 80 caracteres y no vacío. | `ERR-04` |
| `descripcion` | Opcional. Texto de hasta 300 caracteres. | `ERR-04` |
| Cualquier otro | No permitido. | `ERR-06` |

### 4.2 Dependencia

| Campo | Regla | Error |
| ----- | ----- | ----- |
| `origen` | Obligatorio. Debe ser texto. Formato de identificador válido. Debe existir en el catálogo. | `ERR-04` si falta o no cumple formato; `ERR-02` si no existe |
| `destino` | Obligatorio. Igual que `origen`. | `ERR-04` o `ERR-02` |
| `origen` vs `destino` | No pueden ser iguales. | `ERR-07` |
| Combinación de tipos | Debe pertenecer a la matriz de esta sección. | `ERR-07` |
| `INSUMO → PROCESO` | El insumo debe tener al menos una arista entrante de `PROVEEDOR` o `PROCESO` antes de la inserción. | `ERR-07`, detalle en `origen` |
| Par `(origen, destino)` | No debe existir previamente. | `ERR-08` |
| Cualquier otro | No permitido. | `ERR-06` |

**Matriz de tipos vigente** (4 combinaciones permitidas de 16; el resto se rechaza con `ERR-07`):

| Tipo de origen | Tipos de destino permitidos |
| -------------- | --------------------------- |
| `PROVEEDOR` | `INSUMO` |
| `INSUMO` | `PROCESO` |
| `PROCESO` | `INSUMO`, `PRODUCTO` |
| `PRODUCTO` | Ninguno (terminal) |

Reglas asociadas:

- Un `PRODUCTO` no puede ser origen de ninguna dependencia (RF-F1-19).
- No se admite `PROCESO → PROCESO`; la secuencia entre procesos usa un `INSUMO` intermedio
  (RF-F1-21).
- Las aristas entrantes son requisitos simultáneos (AND); no se representan alternativas OR
  (RF-F1-20).
- La misma matriz y la misma comprobación de asociación se aplican en `POST /dependencias` y en
  `PUT /dependencias/{origen}/{destino}` (RNF-F1-10).

### 4.3 Numéricos y pesos

F1 no define ningún atributo numérico: ni cantidades, ni pesos, ni niveles. `AGENTS.md` menciona el
caso «pesos inválidos», pero `docs/brief.md` no define ninguna regla de pesos, por lo que no se
especifica aquí (ver `AMB-F1-01`). Si en el futuro se define, un valor numérico ausente, de tipo
incorrecto o fuera del rango permitido se rechazará con `ERR-04` indicando el campo, nunca se
ignorará ni se asumirá un valor por defecto.

## 5. Catálogo de errores

Sobre único para todos los endpoints:

```json
{
  "error": {
    "codigo": "ELEMENTO_DUPLICADO",
    "mensaje": "Ya existe un elemento con el identificador INS-TORNILLO.",
    "detalles": [
      { "campo": "id", "mensaje": "Identificador ya registrado." }
    ]
  }
}
```

| Campo | Tipo | Obligatorio | Descripción |
| ----- | ---- | ----------- | ----------- |
| `codigo` | texto | Sí | Código estable del error. No cambia de texto. |
| `mensaje` | texto | Sí | Descripción legible para la persona usuaria. |
| `detalles` | lista de objetos | No | Entradas con `campo` y `mensaje` por cada problema detectado. |

| ID | Código | HTTP | Cuándo | Requisito |
| -- | ------ | ---- | ------ | --------- |
| `ERR-01` | `ELEMENTO_DUPLICADO` | `409` | El `id` del elemento ya existe en el catálogo. | RF-F1-02 |
| `ERR-02` | `ELEMENTO_NO_ENCONTRADO` | `404` | Un elemento referenciado no existe. | RF-F1-05, RF-F1-06, RF-F1-12 |
| `ERR-03` | `PETICION_MAL_FORMADA` | `400` | El cuerpo no es JSON válido o su estructura no es la esperada. | RF-F1-11 |
| `ERR-04` | `VALIDACION_FALLIDA` | `422` | Un campo obligatorio falta, no es del tipo esperado o no cumple su regla de formato o rango. | RF-F1-03, RF-F1-11 |
| `ERR-05` | `IDENTIFICADOR_INVALIDO` | `422` | Un identificador de la ruta o de un parámetro de consulta no cumple el formato de identificador. | RF-F1-05, RF-F1-11 |
| `ERR-06` | `CAMPO_NO_PERMITIDO` | `422` | La petición incluye un campo que no existe en el recurso. | RF-F1-11 |
| `ERR-07` | `DEPENDENCIA_INVALIDA` | `422` | `origen` y `destino` son el mismo elemento, la combinación de tipos no pertenece a la matriz de la sección 4.2, o un `INSUMO` carece de la asociación previa exigida. | RF-F1-07, RF-F1-17 a RF-F1-21 |
| `ERR-08` | `DEPENDENCIA_DUPLICADA` | `409` | Ya existe una dependencia con el mismo par `(origen, destino)`. | RF-F1-08 |
| `ERR-09` | `TIPO_NO_ENCONTRADO` | `404` | La ruta solicitada no existe en la API. | RF-F1-12 |
| `ERR-10` | `CONFIGURACION_CICLICA` | `409` (histórico) | **No se emite en F3.** Permanece en el catálogo por compatibilidad. Los ciclos se reportan con `200` en `ciclos`, `elementosBloqueados`, `productosBloqueados` y `productosPlanificables`. | Histórico; ver RF-F3-03, RF-F3-04 |

Ejemplos:

```json
{
  "error": {
    "codigo": "DEPENDENCIA_DUPLICADA",
    "mensaje": "Ya existe una dependencia con origen PROC-CORTE y destino PROD-PANEL.",
    "detalles": [
      { "campo": "origen", "mensaje": "PROC-CORTE" },
      { "campo": "destino", "mensaje": "PROD-PANEL" }
    ]
  }
}
```

```json
{
  "error": {
    "codigo": "VALIDACION_FALLIDA",
    "mensaje": "La solicitud contiene datos inválidos.",
    "detalles": [
      { "campo": "tipo", "mensaje": "Debe ser uno de: PROVEEDOR, INSUMO, PRODUCTO, PROCESO." }
    ]
  }
}
```

Reglas transversales de error:

- Una respuesta de error nunca contiene datos de negocio: ni listas vacías, ni `total: 0`, ni un
  recurso parcial (RF-F1-12).
- Si hay varios problemas, se informa el primero detectado por campo y el resto se acumula en
  `detalles` cuando se detecta más de uno.
- Una petición rechazada no modifica el catálogo en ningún caso.
- El estado interno del servidor no se expone al cliente; su contenido se resume en `mensaje`.

## 6. Datos sintéticos de demostración

Para poder mostrar la red con contenido real, el backend debe poder inicializarse con un conjunto de
elementos y dependencias **sintéticos** y coherentes con el dominio de la sección 4 de
`graph-model.md`: proveedores, insumos, productos y procesos, sin datos de personas ni de empresas
reales. Ese conjunto se crea por el mismo camino que la API (registro de elementos y de
dependencias), no por una vía especial que omita las validaciones de F1. Su contenido exacto no es
parte del contrato y no se especifica aquí: pertenece a las features que lo consuman.

## 7. Trazabilidad del contrato

| Endpoint | Requisitos | Criterios de aceptación | Decisión de modelo |
| -------- | ---------- | ----------------------- | ------------------ |
| `POST /elementos` | RF-F1-01, RF-F1-02, RF-F1-03, RF-F1-11 | AC-F1-01, AC-F1-02, AC-F1-03, AC-F1-11, AC-F1-12 | `graph-model.md`, sección 3 |
| `GET /elementos` | RF-F1-04, RF-F1-13 | AC-F1-04, AC-F1-13 | `graph-model.md`, sección 3.4 |
| `GET /elementos/{id}` | RF-F1-05 | AC-F1-05 | `graph-model.md`, sección 1 |
| `POST /dependencias` | RF-F1-06, RF-F1-07, RF-F1-08, RF-F1-11, RF-F1-17 a RF-F1-21 | AC-F1-06, AC-F1-07, AC-F1-08, AC-F1-11, AC-F1-25 a AC-F1-30 | `graph-model.md`, secciones 2.1 y 4.1 |
| `GET /dependencias` | RF-F1-09, RF-F1-13 | AC-F1-09, AC-F1-13 | `graph-model.md`, sección 2.1 |
| `GET /grafo` | RF-F1-10, RF-F1-15 | AC-F1-10, AC-F1-15 | `graph-model.md`, sección 3 |
| `GET /reglas-dependencia` | RF-F1-22, RNF-F1-10 | AC-F1-31, AC-F1-32 | `graph-model.md`, sección 4.1 |
| `GET /plan-entrega` | RF-F3-05 a RF-F3-09 | AC-F3-05 a AC-F3-09 | `graph-model.md`, sección 6.5 |
| `GET /orden-produccion` | RF-F3-01 a RF-F3-04, RF-F3-10 | AC-F3-01 a AC-F3-04, AC-F3-10 | `graph-model.md`, sección 6.4 |

Las decisiones que sustentan este contrato están registradas en `docs/decisions/analyst.md`.


## 8. Contrato de API — F2: Análisis de impacto

**Alcance:** únicamente F2. No se definen endpoints de F3 ni de F4. Los endpoints de F2 no están
implementados todavía: este apartado fija el contrato que debe cumplir la implementación.

- Requisitos: `requirements.md` §9. Dirección y estructura: `graph-model.md` §8.
- Verificación: `acceptance-criteria.md` §7.

### 8.1 Principios

- Respeta la dirección `origen habilita destino` (sentido hacia adelante para el impacto).
- Diferencia explícita: elemento inexistente / elemento existente sin dependencias o afectados /
  elemento que afecta una cadena.
- Elementos visitados de manera comprensible, cada uno una sola vez.
- Recorrido propio (sin NetworkX para el cálculo).
- Errores explícitos, sin convertir un fallo en un resultado válido o vacío engañoso.
- No incluye información de ciclos ni de orden de preparación: eso es F3.

### 8.2 Recurso `Impacto`

| Campo | Tipo | Obligatorio en respuesta | Reglas |
| ----- | ---- | ------------------------ | ------ |
| `elemento` | objeto | Sí | Elemento consultado: `id`, `tipo` y `nombre`. |
| `afectados` | lista de objetos | Sí | Elementos alcanzables siguiendo aristas hacia adelante. Cada uno con `id`, `tipo` y `nombre`. |
| `total` | número | Sí | Cantidad de elementos de `afectados`. |

El contenido de `afectados` no se filtra por tipo: un proveedor, un insumo, un proceso o un producto
alcanzados son todos afectados (`RN-F2-02`).

Ejemplo de respuesta `200`:

```json
{
  "elemento": { "id": "INS-BARRA", "tipo": "INSUMO", "nombre": "Barra de acero" },
  "afectados": [
    { "id": "PROD-BANCO", "tipo": "PRODUCTO", "nombre": "Banco de montaje" },
    { "id": "PROD-PANEL", "tipo": "PRODUCTO", "nombre": "Panel de montaje" },
    { "id": "PROC-CORTE", "tipo": "PROCESO", "nombre": "Corte de panel" }
  ],
  "total": 3
}
```

Ejemplo de respuesta `200` cuando el elemento no habilita a nadie:

```json
{
  "elemento": { "id": "PROD-BANCO", "tipo": "PRODUCTO", "nombre": "Banco de montaje" },
  "afectados": [],
  "total": 0
}
```

El formato de `elemento` y de cada elemento de `afectados` es el de `Elemento` de la sección 2.1.

### 8.3 `GET /api/v1/impacto/{id}`

Devuelve el impacto de la indisponibilidad del elemento `{id}`: los elementos que se ven afectados
porque dependen de él, directa o indirectamente.

Parámetro de ruta:

| Parámetro | Obligatorio | Regla |
| --------- | ----------- | ----- |
| `id` | Sí | Identificador de elemento. Se normaliza a mayúsculas y debe cumplir el patrón de la sección 4.1. |

Respuestas:

| Código | Cuerpo | Cuándo |
| ------ | ------ | ------ |
| `200` | `Impacto` | El elemento existe. `afectados` puede estar vacía, con `total: 0`, cuando el elemento no habilita a nadie. |
| `404` | Error `ERR-02` | El `id` cumple el formato pero no existe en el catálogo. |
| `422` | Error `ERR-05` | El `id` de la ruta no cumple el formato de identificador. |
| `404` | Error `ERR-09` | La ruta solicitada no existe en la API. |

El endpoint no admite cuerpo ni parámetros de consulta.

### 8.4 Reglas de la respuesta

1. El conjunto de `afectados` es exactamente el conjunto de elementos alcanzables desde el elemento
   consultado siguiendo aristas `origen habilita destino` (`RN-F2-02`). El grafo no se invierte.
2. Los elementos que habilitan al elemento consultado no forman parte de `afectados`: son requisitos
   de ese elemento, no consecuencias de su indisponibilidad.
3. Cada alcanzable aparece una sola vez, aunque sea alcanzable por varios caminos.
4. Con ciclos en el grafo, el recorrido termina y devuelve los alcanzables sin repetir.
5. `afectados` se ordena por `id` ascendente, de forma estable y determinista.
6. Un elemento inexistente nunca produce `200` con `afectados` vacía: produce `404` `ERR-02`. Un
   `200` con `total: 0` corresponde a un elemento existente que no habilita a nadie.
7. La respuesta no incluye ningún campo de veredicto de ciclo ni de orden de preparación.
8. Una respuesta de error no contiene `elemento`, `afectados` ni `total`, como el resto de la API.

### 8.5 Trazabilidad del contrato

| Endpoint | Requisitos | Criterios de aceptación | Decisión de modelo |
| -------- | ---------- | ----------------------- | ------------------ |
| `GET /impacto/{id}` | RF-F2-01 a RF-F2-09, RNF-F2-01 a RNF-F2-03 | AC-F2-01 a AC-F2-15 | `graph-model.md` §8 |

El significado de «alcanzar» que da origen a este contrato está documentado en `graph-model.md` §8 y
en el `README.md` del repositorio (`RF-F2-09`).
## 9. Ajustes de inventario y gestión (2026-10-25)

### 9.1 Campos de inventario en `Elemento`

| Campo | Tipo | Aplica a | Regla |
| ----- | ---- | -------- | ----- |
| `stockDisponible` | entero ≥ 0 | `INSUMO` | Si se omite al crear, vale `0`. En otros tipos se rechaza con `422` (`VALIDACION_FALLIDA`). |
| `stockMinimo` | entero ≥ 0 | `INSUMO` | Nivel mínimo aceptable. Si se omite al crear, vale `0`. |
| `estadoStock` | `NO_APLICA` \| `SUFICIENTE` \| `BAJO` | Todos | `BAJO` si `stockDisponible < stockMinimo`; `NO_APLICA` en tipos sin inventario. |
| `alertaStock` | booleano | Todos | Verdadero solo cuando `estadoStock = "BAJO"`. |

Los campos calculados `estadoStock` y `alertaStock` los produce el backend; el cliente no debe
recalcularlos.

### 9.2 Endpoints de gestión

| Método | Ruta | Cuerpo | Respuesta |
| ------ | ---- | ------ | --------- |
| `PUT` | `/api/v1/elementos/{id}` | `{nombre?, descripcion?, stockDisponible?, stockMinimo?}` | `200` con el elemento actualizado |
| `DELETE` | `/api/v1/elementos/{id}` | — | `204`; elimina en cascada las relaciones del elemento |
| `PUT` | `/api/v1/dependencias/{origen}/{destino}` | `{origen, destino}` | `200` con la relación actualizada |
| `DELETE` | `/api/v1/dependencias/{origen}/{destino}` | — | `204` |
| `GET` | `/api/v1/reglas-dependencia` | — | `200` con `tipos` y las 16 `reglas` |

Errores nuevos: `DEPENDENCIA_NO_ENCONTRADA` (`404`) al borrar o editar una relación inexistente. No
tiene un código `ERR-nn` asignado en el catálogo de la sección 5 (decisión pendiente `AMB-F1-09`); la
respuesta usa el sobre de error común con un mensaje explícito. Los códigos `ERR-01` a `ERR-09`
conservan su significado.

### 9.3 Reglas de dependencia

La respuesta de `GET /api/v1/reglas-dependencia` contiene una entrada por cada par de tipos con
`tipoOrigen`, `tipoDestino`, `permitida` y `motivo`. La matriz permitida es la de la sección 4.2:
`PROVEEDOR → INSUMO`, `INSUMO → PROCESO`, `PROCESO → INSUMO` y `PROCESO → PRODUCTO`; `PRODUCTO` es
terminal. Un suministro que se enlaza a un proceso debe tener una arista entrante de proveedor o
proceso; si no la tiene, la API responde `422` `DEPENDENCIA_INVALIDA` con detalle en el campo
`origen`. La respuesta y la validación se generan desde la misma definición de dominio
(`RNF-F1-10`).

### 9.4 Impacto enriquecido con stock

`GET /api/v1/impacto/{id}` añade a cada elemento `descripcion`, `stockDisponible`, `stockMinimo`,
`estadoStock` y `alertaStock`, y un objeto `resumenStock`:

```json
"resumenStock": { "totalSuministros": 2, "suministrosBajoMinimo": 1 }
```

El conjunto de afectados y el recorrido no cambian por el stock; el stock es información de
contexto para el informe y la ficha.
