# Contrato de API — AbastecePyme (F1 y F2)

Contrato HTTP de **F1 — Catálogo de dependencias** y de **F2 — Análisis de impacto**.

- Requisitos: `requirements.md`. Dirección y estructura: `graph-model.md`.
- Verificación: `acceptance-criteria.md`.
- Alcance: las secciones 1 a 7 son de F1 y la sección 8 es de F2. Los endpoints de orden de
  producción y ciclos (F3) y de tablero (F4) **no** se definen aquí.

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
  "origen": "INS-TORNILLO",
  "destino": "PROD-PANEL",
  "tipoRelacion": "habilita"
}
```

La lectura es: «para producir el panel `PROD-PANEL` necesito el insumo `INS-TORNILLO`».

## 3. Endpoints

| Método | Ruta | Descripción | Requisitos |
| ------ | ---- | ----------- | ---------- |
| `POST` | `/api/v1/elementos` | Crear un elemento del catálogo | RF-F1-01, RF-F1-02, RF-F1-03, RF-F1-11 |
| `GET` | `/api/v1/elementos` | Listar elementos, con filtro opcional por tipo | RF-F1-04, RF-F1-13 |
| `GET` | `/api/v1/elementos/{id}` | Consultar un elemento por identificador | RF-F1-05 |
| `POST` | `/api/v1/dependencias` | Registrar una dependencia dirigida | RF-F1-06, RF-F1-07, RF-F1-08, RF-F1-11 |
| `GET` | `/api/v1/dependencias` | Listar dependencias, con filtro opcional por `origen` o `destino` | RF-F1-09, RF-F1-13 |
| `GET` | `/api/v1/grafo` | Obtener la representación del grafo del catálogo | RF-F1-10, RF-F1-15 |

No hay endpoints de modificación ni de eliminación en F1 (ver `requirements.md`, sección 8).
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
  "origen": "INS-TORNILLO",
  "destino": "PROD-PANEL"
}
```

Comportamiento:

1. Valida que `origen` y `destino` estén presentes y cumplan el formato de identificador.
2. Comprueba que ambos elementos existen en el catálogo.
3. Comprueba que `origen` y `destino` son distintos.
4. Comprueba que la dependencia no existe ya.
5. Inserta la arista y la devuelve.

Si cualquiera de las comprobaciones falla, no se registra nada: el catálogo queda intacto. La
dirección es la definida en `graph-model.md`: el origen habilita al destino.

Respuestas:

| Código | Cuerpo | Cuándo |
| ------ | ------ | ------ |
| `201` | `Dependencia` | Dependencia creada. Cabecera `Location: /api/v1/dependencias/{origen}/{destino}`. |
| `400` | Error `ERR-03` | Cuerpo ilegible o con estructura incorrecta. |
| `404` | Error `ERR-02` | `origen` o `destino` no existe. El detalle indica el campo. |
| `409` | Error `ERR-07` | La dependencia ya existe. |
| `422` | Error `ERR-04` a `ERR-06` | Formato inválido, tipo de dato incorrecto, campo desconocido, `origen` igual a `destino`. |

Ejemplo de respuesta `201`:

```json
{
  "origen": "INS-TORNILLO",
  "destino": "PROD-PANEL",
  "tipoRelacion": "habilita"
}
```

Las dependencias inversas (`A → B` y luego `B → A`) son relaciones distintas y ambas se registran:
forman un ciclo, y F1 no las rechaza ni las detecta (RF-F1-16).

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
    { "origen": "INS-TORNILLO", "destino": "PROD-PANEL", "tipoRelacion": "habilita" },
    { "origen": "PROC-CORTE", "destino": "PROD-PANEL", "tipoRelacion": "habilita" }
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
    { "id": "INS-TORNILLO", "tipo": "INSUMO", "nombre": "Tornillo hexagonal M6", "descripcion": null },
    { "id": "PROC-CORTE", "tipo": "PROCESO", "nombre": "Corte de panel", "descripcion": null },
    { "id": "PROD-PANEL", "tipo": "PRODUCTO", "nombre": "Panel de montaje", "descripcion": null }
  ],
  "dependencias": [
    { "origen": "INS-BARRA", "destino": "PROC-CORTE", "tipoRelacion": "habilita" },
    { "origen": "INS-TORNILLO", "destino": "PROD-PANEL", "tipoRelacion": "habilita" },
    { "origen": "PROC-CORTE", "destino": "PROD-PANEL", "tipoRelacion": "habilita" }
  ],
  "resumen": {
    "totalElementos": 4,
    "totalDependencias": 3
  }
}
```

El grafo vacío responde `200` con colecciones vacías y totales en cero.

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
| Par `(origen, destino)` | No debe existir previamente. | `ERR-08` |
| Cualquier otro | No permitido. | `ERR-06` |

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
| `ERR-07` | `DEPENDENCIA_INVALIDA` | `422` | `origen` y `destino` son el mismo elemento. | RF-F1-07 |
| `ERR-08` | `DEPENDENCIA_DUPLICADA` | `409` | Ya existe una dependencia con el mismo par `(origen, destino)`. | RF-F1-08 |
| `ERR-09` | `TIPO_NO_ENCONTRADO` | `404` | La ruta solicitada no existe en la API. | RF-F1-12 |

Ejemplos:

```json
{
  "error": {
    "codigo": "DEPENDENCIA_DUPLICADA",
    "mensaje": "Ya existe una dependencia con origen INS-TORNILLO y destino PROD-PANEL.",
    "detalles": [
      { "campo": "origen", "mensaje": "INS-TORNILLO" },
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
| `POST /dependencias` | RF-F1-06, RF-F1-07, RF-F1-08, RF-F1-11 | AC-F1-06, AC-F1-07, AC-F1-08, AC-F1-11 | `graph-model.md`, sección 2.1 |
| `GET /dependencias` | RF-F1-09, RF-F1-13 | AC-F1-09, AC-F1-13 | `graph-model.md`, sección 2.1 |
| `GET /grafo` | RF-F1-10, RF-F1-15 | AC-F1-10, AC-F1-15 | `graph-model.md`, sección 3 |

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