# Modelo del grafo — AbastecePyme

Documento de referencia para **F1 — Catálogo de dependencias**, **F2 — Análisis de impacto** y **F3 — Orden y ciclos de producción**.
Define la dirección de las relaciones, la representación del grafo propio, su lectura para el análisis de impacto de F2 (sección 8), la matriz de tipos permitida (sección 4.1), la condición de DAG, el orden topológico determinista de preparación, el plan por entrega y el diagnóstico de ciclos sin bibliotecas de terceros para F3 (sección 6).

- Requisitos relacionados: `requirements.md` (RF-F1-06, RF-F1-15, RF-F1-16, RF-F1-17 a RF-F1-22, RNF-F1-03, RNF-F1-10, F2 en §9, y RF-F3-01 a RF-F3-10, RNF-F3-01 a RNF-F3-05 en §11).
- Contrato HTTP: `api-contract.md`.
- Verificación: `acceptance-criteria.md`.

## 1. Vocabulario

| Término | Significado en este proyecto |
| ------- | ---------------------------- |
| **Elemento** | Cualquier cosa que la empresa pueda tener que preparar, obtener o considerar: un proveedor, un insumo, un producto o un proceso interno. Es un nodo del grafo. |
| **Tipo de elemento** | Clasificación del elemento dentro del conjunto cerrado `PROVEEDOR`, `INSUMO`, `PRODUCTO`, `PROCESO`. |
| **Dependencia** | Relación dirigida entre dos elementos: el primero debe estar disponible antes que el segundo. Es una arista del grafo. |
| **Origen** | Elemento que habilita: es el requisito previo. |
| **Destino** | Elemento que requiere: necesita al origen para poder producirse o prepararse. |
| **Habilita** | Nombre de la relación tal como viaja en la API (`tipoRelacion`). |
| **Alcanzar** | Que existe un camino dirigido desde un elemento hasta otro. Es la base del análisis de impacto (F2) y del cálculo de requisitos previos (F3); F1 no lo calcula. |

## 2. Dirección de las aristas

### 2.1 Decisión

Una dependencia se representa como una arista dirigida:

```
origen  ──habilita──▶  destino
```

y significa exactamente:

> «Para producir o preparar el **destino**, necesito que el **origen** esté disponible.»

En los términos del brief, es la relación «B habilita A» con `B = origen` y `A = destino`, y es la
inversión de «A requiere B». Ambas frases describen el mismo hecho; lo que se fija aquí es hacia
dónde apunta la flecha.

La frase del brief «Para producir \_\_\_ necesito \_\_\_» se completa con los nombres de los
elementos. Ejemplos del dominio, con datos sintéticos:

| Arista | Frase | Lectura de negocio |
| ------ | ----- | ----------------- |
| `INS-TORNILLO → PROC-CORTE` | Para ejecutar el proceso de corte necesito el suministro de tornillos | El proceso depende del suministro |
| `PROV-ACERO → INS-BARRA` | Para preparar el suministro de barra de acero necesito al proveedor de acero | El suministro depende del proveedor |
| `PROC-CORTE → PROD-PANEL` | Para producir el panel necesito el proceso de corte previo | El producto depende de un proceso interno |
| `PROC-CORTE → PROD-BANCO` | Para producir el banco necesito el proceso de corte previo | Un proceso puede generar más de un producto |

Nótese que la frase sigue siendo coherente cuando el origen es un proveedor o un proceso: lo que
se necesita es que esté **disponible**, no que se produzca. Esa generalización es lo que permite
usar **una sola dirección para todos los tipos de elemento**, en lugar de una dirección por tipo.
Las combinaciones admitidas entre tipos se fijan en la sección 4.1.

### 2.2 Por qué la flecha apunta del requisito previo al dependiente

1. **Una sola dirección para todo el dominio.** El brief exige una interpretación clara de cada
   relación y prohíbe arreglar una dirección confusa con condicionales. Con la flecha
   `requisito previo → dependiente`, la lectura es siempre «esto habilita aquello», sin excepciones
   por tipo de elemento.
2. **La frase se invierte de forma verificable.** El brief pide comprobar si «Para producir \_\_\_
   necesito \_\_\_» deja de tener sentido al invertirla. Con esta dirección, invertir la arista
   cambia el significado de negocio de forma detectable: `PROC-CORTE → PROD-PANEL` significa algo
   y `PROD-PANEL → PROC-CORTE` significaría que el producto habilita al proceso, lo cual es falso en
   este dominio. La asimetría que exige el brief es observable en el modelo.
3. **Un solo sentido de recorrido para las features siguientes.** Con esta dirección, «qué se ve
   afectado si falta X» y «qué hay que preparar antes que Y» se obtienen recorriendo la red en el
   mismo sentido, de causa a consecuencia. No hace falta invertir el grafo ni decidir en tiempo de
   ejecución qué dirección usar según el tipo de consulta.
4. **Coherencia con el orden de preparación.** Un ordenamiento topológico de este grafo sitúa
   siempre al requisito previo antes que a su dependiente, que es precisamente un orden de
   preparación válido (relevante para F3, no implementado en F1).

### 2.3 Consecuencias de la decisión

- **Elementos alcanzables desde un elemento:** conjunto de elementos alcanzables siguiendo aristas **hacia adelante** desde ese elemento (los que habilita, directa o indirectamente). Es el impacto de una indisponibilidad y pertenece a F2. F1 no lo calcula.
- **Dependencias directas de un elemento:** conjunto de elementos alcanzables siguiendo aristas
  **hacia atrás** (los que lo habilitan). Es la lista de requisitos de preparación y pertenece a
  F3. F1 no la calcula.
- **Orden de preparación:** orden topológico de este mismo grafo, sin invertir. Pertenece a F3.
- **Ciclos:** una arista `A → B` junto con `B → A` es un ciclo. F1 las registra sin imponer
  restricciones (RF-F1-16); su detección pertenece a F3.

## 3. Representación del grafo

### 3.1 Definición formal

El grafo es un **dígrafo** `G = (V, E)`:

- `V` es el conjunto de elementos del catálogo, identificados por su `id`.
- `E ⊆ V × V` es el conjunto de dependencias, donde `(origen, destino) ∈ E` significa
  `origen habilita destino`.

### 3.2 Estructura de datos

La representación es propia del proyecto y se mantiene en la capa de dominio. F1 necesita solo
tres operaciones, por lo que no justifica una estructura más compleja:

| Pieza | Contenido | Para qué la usa F1 |
| ----- | --------- | ------------------- |
| conjunto de elementos | `id → elemento` (tipo `id` → elemento) | Listar, consultar y validar existencia |
| adyacencia de salida | `id → conjunto de ids de destino` | Saber a quién habilita un elemento y validar dependencias duplicadas |
| adyacencia de entrada | `id → conjunto de ids de origen` | Saber qué habilita a un elemento |

La adyacencia de entrada es un índice derivado de la de salida. Se mantiene para que la
representación pueda responder «qué requiere este elemento» sin recorrer toda la red, que es la
consulta que necesitará F3. No es un segundo modelo: ambos conjuntos de adyacencia se actualizan en
la misma operación de registro.

Alternativas descartadas:

- **Lista de aristas sueltas.** Basta para exponer el grafo, pero obligaría a recorrer todas las
  dependencias para responder una consulta de adyacencia y no refleja que las relaciones se
  consultan en ambos sentidos.
- **Grafo no dirigido.** Imposible: el brief exige una interpretación direccional de cada relación.
- **Biblioteca de grafos de terceros (por ejemplo, NetworkX).** `AGENTS.md` reserva NetworkX para
  visualizar resultados ya calculados; el modelo y sus estructuras son del proyecto (RNF-F1-03).
  Además, F1 no necesita algoritmos de grafos.

### 3.3 Invariantes

El grafo debe cumplir siempre:

1. Todo `id` presente en alguna adyacencia pertenece a `V`.
2. Toda arista `(origen, destino)` cumple `origen ≠ destino`.
3. No existen dos aristas con el mismo par `(origen, destino)`; no hay aristas paralelas.
4. Si `(origen, destino) ∈ E` y `(destino, origen) ∈ E`, ambas relaciones son válidas y distintas:
   forman un ciclo, y F1 lo permite.
5. Todo elemento de `V` tiene una entrada en la adyacencia de salida, aunque esté vacía. Un
   elemento sin dependencias es un elemento válido y consultable.
6. El grafo puede estar vacío: sin elementos y sin dependencias es un estado válido.

### 3.4 Estabilidad y orden

Las operaciones de listado entregan los elementos y las dependencias en un orden determinista y
estable, para que la API, la interfaz y las pruebas observen siempre la misma secuencia. El criterio
elegido es el identificador en orden ascendente.

## 4. Ejemplo de red sintética

Elementos y dependencias de ejemplo, con la dirección elegida. Solo se muestran para ilustrar la
representación; son los datos que deben esperar las features posteriores.

| Arista | Frase |
| ------ | ----- |
| `PROV-ACERO → INS-BARRA` | Para preparar la barra de acero necesito al proveedor de acero |
| `PROV-ACERO → INS-TORNILLO` | Para preparar los tornillos necesito al proveedor de acero |
| `INS-BARRA → PROC-CORTE` | Para el proceso de corte necesito la barra de acero |
| `INS-TORNILLO → PROC-CORTE` | Para el proceso de corte necesito los tornillos |
| `PROC-CORTE → PROD-PANEL` | Para el panel necesito el proceso de corte |
| `PROC-CORTE → PROD-BANCO` | Para el banco de montaje necesito el proceso de corte |
| `PROV-MADERA → INS-TABLERO` | Para preparar el tablero necesito al proveedor de madera |
| `PROV-MADERA → INS-BARNIZ` | Para preparar el barniz necesito al proveedor de madera |
| `INS-TABLERO → PROC-ENSAMBLE` | Para ensamblar el escritorio necesito el tablero |
| `INS-BARNIZ → PROC-ENSAMBLE` | Para ensamblar el escritorio necesito el barniz |
| `PROC-ENSAMBLE → PROD-ESCRITORIO` | Para el escritorio necesito el proceso de ensamble |

La red de demostración tiene dos líneas de producto: la línea de acero (paneles y bancos) y la
línea de madera (escritorios). Ambas respetan la misma dirección y las mismas reglas.

Grado de salida de `PROV-ACERO`: 2. Grado de salida de `PROC-CORTE`: 2. Grado de salida de
`PROV-MADERA`: 2. Con esta dirección, `PROV-ACERO` alcanza a sus dos suministros, al proceso y a
los dos productos de su línea; `PROV-MADERA` alcanza a sus dos suministros, al proceso de ensamble y
al escritorio. Los productos son terminales y no habilitan a otros elementos.

### 4.1 Combinaciones de tipos permitidas

La dirección es única (`origen habilita destino`), pero no toda combinación de tipos es una relación
de negocio válida. La matriz vigente, acordada con el cliente, es:

| Tipo de origen | Puede habilitar a | Combinaciones |
| -------------- | ----------------- | ------------- |
| `PROVEEDOR` | `INSUMO` | `PROVEEDOR → INSUMO` |
| `INSUMO` | `PROCESO` | `INSUMO → PROCESO` |
| `PROCESO` | `INSUMO`, `PRODUCTO` | `PROCESO → INSUMO`, `PROCESO → PRODUCTO` |
| `PRODUCTO` | Ninguno: es el final de la cadena | — |

De las 16 combinaciones posibles entre los cuatro tipos, **4 están permitidas y 12 se rechazan**.
La matriz completa, con el motivo de cada combinación permitida y rechazada, se expone en
`GET /api/v1/reglas-dependencia` y la valida el dominio en la creación y edición de relaciones
(RF-F1-17, RF-F1-22, RNF-F1-10).

Reglas que se derivan de la matriz:

1. **`PRODUCTO` es terminal.** No puede ser origen de ninguna relación. Sí puede recibir aristas de
   un `PROCESO` (`PROCESO → PRODUCTO`). Un producto no habilita a otro producto, ni a un proceso, ni
   a un insumo, ni a un proveedor.
2. **Un `INSUMO` debe estar asociado antes de habilitar un proceso.** Para registrar
   `INSUMO → PROCESO`, el insumo debe tener al menos una arista entrante de un `PROVEEDOR` o de un
   `PROCESO`. Sin esa asociación previa, la relación se rechaza (RF-F1-18). La asociación puede ser
   `PROVEEDOR → INSUMO` (suministro externo) o `PROCESO → INSUMO` (componente producido
   internamente).
3. **No se admite `PROCESO → PROCESO`.** La secuencia entre procesos se modela con un `INSUMO`
   intermedio: `PROC-ARMAR → INS-SUBENSAMBLE → PROC-ENSAMBLAR → PROD-MUEBLE`. El insumo intermedio
   representa el subensamblaje que un proceso produce y el siguiente consume (RF-F1-21).
4. **No hay alternativas OR.** Si un elemento tiene varias aristas entrantes, todas son requisitos
   simultáneos: el elemento requiere **todos** sus orígenes (semántica AND). El modelo no representa
   «A o B»; una alternativa sería una regla de negocio nueva y queda fuera de alcance
   (RF-F1-20, `AMB-F1-08`).
5. **Los ciclos solo pueden aparecer entre `INSUMO` y `PROCESO`.** Con esta matriz, `PROVEEDOR` no
   tiene aristas entrantes y `PRODUCTO` no tiene aristas salientes; el único par que puede cerrar un
   ciclo es `INSUMO ↔ PROCESO` (por ejemplo, `INS-BARRA → PROC-CORTE → INS-BARRA`). F1 los registra
   sin rechazarlos (RF-F1-16); F3 los detecta y los reporta.
6. **Un elemento sin dependencias sigue siendo válido.** La matriz restringe qué tipos pueden
   relacionarse, no obliga a que todo elemento tenga aristas. Un `PROVEEDOR` sin suministros, un
   `INSUMO` sin asociación, un `PROCESO` sin entradas o un `PRODUCTO` sin proceso que lo genere son
   estados válidos del catálogo (sección 5).

La validación de la matriz ocurre en el dominio, antes de modificar el catálogo, y se aplica tanto
al alta como a la edición de una dependencia. El frontend no duplica la matriz: la consulta en
`GET /api/v1/reglas-dependencia` para mostrarla y muestra el error del backend cuando una relación
se rechaza.

## 5. Elementos sin dependencias y grafo vacío

Ambos estados son parte del modelo, no errores:

- **Elemento sin dependencias:** elemento presente en `V` con ambos conjuntos de adyacencia vacíos.
  Es el nodo más simple del grafo y se registra sin ninguna condición adicional.
- **Grafo vacío:** `V = ∅` y `E = ∅`. El listado responde con colecciones vacías y totales en cero.
- **Dependencia hacia un elemento que existe y otro que no:** se rechaza la operación completa; no
  se registra una arista parcial ni un elemento implícito. El grafo nunca contiene nodos derivados
  de una dependencia: los nodos se crean únicamente al registrar elementos.

## 6. Modelo de F3 — Plan de entrega y diagnóstico de ciclos

F3 ofrece **dos consultas complementarias** sobre el mismo grafo:

| Consulta | Pregunta de negocio | Endpoint |
| -------- | ------------------- | -------- |
| **Plan de entrega** | «¿En qué orden preparo lo necesario para entregar estos productos?» | `GET /api/v1/plan-entrega?productos=...` |
| **Diagnóstico global de planta** | «¿La configuración completa de la planta permite un orden de producción? Si no, ¿qué ciclos la bloquean?» | `GET /api/v1/orden-produccion` |

La primera es la vista accionable para el coordinador de producción. La segunda es la vista de
diagnóstico: confirma si toda la red es un DAG y, cuando no lo es, describe los ciclos sin emitir un
orden parcial.

### 6.1 Definiciones: DAG y orden de preparación

En AbastecePyme, la red de dependencias es un dígrafo $G = (V, E)$ con la dirección de la sección 2.

1. **DAG (Grafo Dirigido Acíclico):** un dígrafo que no contiene ningún camino dirigido
   $v_0, v_1, \dots, v_k$ con $v_0 = v_k$ y $k \ge 1$.
2. **Orden de preparación (ordenamiento topológico):** una secuencia lineal de un conjunto de
   elementos en la que, para toda arista $(u, v) \in E$, $u$ aparece estrictamente antes que $v$.
   Con la dirección `origen habilita destino`, esto significa que todo requisito previo se prepara
   antes que el elemento que habilita.
3. **Existencia:** un dígrafo admite un ordenamiento topológico de todos sus elementos si y solo si
   es un DAG. Si existe al menos un ciclo, no existe un orden total válido. El sistema **no debe
   devolver un orden falso ni parcial** en ese caso (RF-F3-03).
4. **Subgrafo de requisitos de un producto:** el conjunto formado por el producto y todos sus
   ancestros en el grafo, es decir, todos los elementos desde los que existe un camino dirigido
   hasta el producto. Es el conjunto de elementos que deben prepararse para entregarlo.

### 6.2 Dirección de las aristas y grado de entrada

Con la dirección `origen habilita destino`:

- Los **requisitos previos directos** de $v$ son $\text{Pred}(v) = \{u \in V \mid (u, v) \in E\}$,
  almacenados en `_adyacencia_entrada[v]`.
- El **grado de entrada** de $v$ es $|\text{Pred}(v)|$: cuántos requisitos directos le faltan por
  preparar.
- Un elemento con grado de entrada 0 no tiene requisitos pendientes y está listo para prepararse.
- Al preparar $u$, se decrementa en 1 el grado de entrada de cada $v \in
  \text{adyacencia\_salida}[u]$. Cuando el grado llega a 0, $v$ queda habilitado.
- Las aristas entrantes son **conjuntas (AND)**: el grado de entrada cuenta todas, y $v$ no queda
  habilitado hasta que se hayan preparado todas. No se elige una entre varias.

### 6.3 Algoritmos propios (sin NetworkX)

Los algoritmos se implementan en la capa de dominio del proyecto. No se usa NetworkX ni otra
biblioteca de grafos para recorridos, ciclos, ordenamiento topológico ni cálculo de planes
(RNF-F3-01).

1. **Kahn para el orden topológico y la verificación de aciclicidad**
   - Calcular el grado de entrada de cada elemento con `_adyacencia_entrada`.
   - Mantener una cola de listos ordenada por `id` ascendente.
   - Extraer siempre el elemento listo con menor `id`, agregarlo al orden y decrementar el grado de
     entrada de sus destinos. Insertar en la cola los que lleguen a 0.
   - Si el orden contiene $|V|$ elementos, el grafo es un DAG y el orden es válido.
   - Si contiene menos, hay al menos un ciclo. En el **diagnóstico global** no se emite el orden
     parcial; en el **plan de entrega** se descartan los productos bloqueados y se planifican solo
     los que no dependen de un ciclo.
   - Complejidad: $O(|V| + |E|)$.

2. **Componentes fuertemente conexas (SCC) y ciclo representativo**
   - Para reportar ciclos se calculan las componentes fuertemente conexas del grafo (o del subgrafo
     del plan) con un algoritmo propio (por ejemplo, Tarjan o Kosaraju).
   - Una SCC es cíclica si contiene más de un elemento o si tiene una arista de un elemento a sí
     mismo. En este dominio no hay aristas reflexivas, así que una SCC cíclica tiene al menos dos
     elementos.
   - Por cada SCC cíclica se reporta **un ciclo representativo**, no todos los ciclos elementales.
     El ciclo se reconstruye como una secuencia cerrada $[c_1, c_2, \dots, c_k, c_1]$ donde cada
     paso $(c_i, c_{i+1})$ es una arista registrada. Para que sea determinista, la secuencia empieza
     en el menor `id` de la SCC y recorre los vecinos en orden ascendente de `id`.
   - Los ciclos se ordenan por el menor `id` de su SCC. Así, dos ejecuciones sobre el mismo estado
     producen la misma lista de ciclos (RNF-F3-03).
   - No se enumeran todos los ciclos elementales: hacerlo puede crecer de forma exponencial y no
     aporta información accionable. Un ciclo por región cíclica es suficiente para localizar la
     contradicción (RF-F3-04).

3. **Subgrafo de requisitos para el plan de entrega**
   - Dado un conjunto de productos solicitados, se calcula la unión de sus ancestros (incluidos los
     propios productos) recorriendo el grafo **hacia atrás** desde cada producto.
   - La unión se deduplica: un elemento que es requisito de varios productos aparece una sola vez.
   - Sobre ese subgrafo se aplica Kahn. Si el subgrafo es acíclico, el orden obtenido es el plan.
   - Si el subgrafo contiene ciclos, los productos cuyos requisitos alcanzan un ciclo quedan
     `BLOQUEADO`; los demás quedan `PLANIFICABLE`. El plan se calcula solo con la unión de los
     requisitos de los productos planificables.
   - Los ciclos y elementos bloqueados se reportan solo dentro del subgrafo solicitado; un ciclo en
     una rama no relacionada no afecta al plan (RF-F3-07).

### 6.4 Diagnóstico global de planta

`GET /api/v1/orden-produccion` responde siempre `200 OK`. El cuerpo distingue dos estados.

**Grafo acíclico (DAG):**

```json
{
  "esDag": true,
  "orden": [ "..." ],
  "totalPasos": 6,
  "ciclos": [],
  "elementosBloqueados": [],
  "productosBloqueados": [],
  "productosPlanificables": ["PROD-BANCO", "PROD-PANEL"]
}
```

- `orden` contiene **todos** los elementos en un orden topológico determinista.
- `totalPasos` es $|V|$.
- `ciclos`, `elementosBloqueados` y `productosBloqueados` están vacíos.
- `productosPlanificables` contiene todos los productos del catálogo, ordenados por `id`.

**Grafo con ciclos** (red de ejemplo con una rama de acero cíclica y una rama de madera acíclica):

```json
{
  "esDag": false,
  "orden": [],
  "totalPasos": 0,
  "ciclos": [
    { "secuencia": ["INS-BARRA", "PROC-CORTE", "INS-BARRA"] }
  ],
  "elementosBloqueados": ["INS-BARRA", "PROC-CORTE", "PROD-BANCO", "PROD-PANEL"],
  "productosBloqueados": ["PROD-BANCO", "PROD-PANEL"],
  "productosPlanificables": ["PROD-ESCRITORIO"]
}
```

- `orden` está vacío y `totalPasos` es 0: **no se emite un orden parcial ni falso** (RF-F3-03).
- `ciclos` contiene un ciclo representativo por SCC cíclica.
- `elementosBloqueados` contiene los elementos que Kahn no pudo ordenar: los que están en una SCC
  cíclica y los que dependen, directa o indirectamente, de ella. Un elemento que solo es requisito
  previo de un ciclo (por ejemplo, un proveedor que alimenta a un insumo del ciclo) no está
  bloqueado.
- `productosBloqueados` son los productos incluidos en `elementosBloqueados`.
- `productosPlanificables` son los productos del catálogo que no están bloqueados. La secuencia
  accionable para ellos se obtiene con el plan de entrega, no con este diagnóstico.

El diagnóstico global no devuelve `409` ni un sobre de error: la existencia de ciclos es un
resultado de negocio válido y estructurado, no un fallo de la petición.

### 6.5 Plan de entrega por producto

`GET /api/v1/plan-entrega?productos=A,B` recibe una lista de uno o más productos y devuelve el plan
de preparación de sus requisitos.

Reglas:

1. La lista es obligatoria y no puede estar vacía. Se normaliza cada identificador (recorte y
   mayúsculas) y se eliminan duplicados; el resultado se ordena por `id`.
2. Cada identificador debe cumplir el formato de identificador de la sección 4.1 de
   `api-contract.md`; si no, `422` `ERR-05`.
3. Cada identificador debe existir en el catálogo; si no, `404` `ERR-02`.
4. Cada elemento debe ser de tipo `PRODUCTO`; si no, `422` `ERR-04`.
5. Si alguna validación falla, **falla la petición completa**: no se devuelve un plan parcial para
   los productos válidos (RF-F3-08).
6. El plan contiene la unión deduplicada de los requisitos de los productos planificables, en orden
   topológico determinista. Si todos los productos están bloqueados, `pasos` es `[]`, `totalPasos`
   es 0 y todos los estados son `BLOQUEADO`; la respuesta sigue siendo `200` (RF-F3-06).
7. Un producto sin requisitos previos produce un plan con un único paso: él mismo.
8. Un ciclo en una rama no relacionada con los productos solicitados no se considera y no bloquea el
   plan (RF-F3-07).

Ejemplo de respuesta con un producto planificable:

```json
{
  "productos": [
    { "id": "PROD-PANEL", "tipo": "PRODUCTO", "nombre": "Panel de montaje", "estado": "PLANIFICABLE" }
  ],
  "esPlanificable": true,
  "pasos": [
    { "paso": 1, "id": "PROV-ACERO", "tipo": "PROVEEDOR", "nombre": "Proveedor de acero" },
    { "paso": 2, "id": "INS-BARRA", "tipo": "INSUMO", "nombre": "Barra de acero" },
    { "paso": 3, "id": "INS-TORNILLO", "tipo": "INSUMO", "nombre": "Tornillo hexagonal M6" },
    { "paso": 4, "id": "PROC-CORTE", "tipo": "PROCESO", "nombre": "Corte de panel" },
    { "paso": 5, "id": "PROD-PANEL", "tipo": "PRODUCTO", "nombre": "Panel de montaje" }
  ],
  "totalPasos": 5,
  "ciclos": [],
  "elementosBloqueados": []
}
```

Ejemplo de respuesta con un producto bloqueado:

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

### 6.6 Casos estructurales

- **Grafo vacío ($V = \emptyset$):** es un DAG trivial. Diagnóstico global: `esDag: true`,
  `orden: []`, `totalPasos: 0`, `productosPlanificables: []`. Plan de entrega: cualquier producto
  solicitado responde `404` `ERR-02`, porque no existe.
- **Elementos aislados:** tienen grado de entrada y de salida 0. Entran en el orden global por `id`
  ascendente y, si son productos, su plan es un único paso.
- **Componentes disconexas acíclicas:** el orden global las intercala de forma determinista por
  `id`. El plan de un producto solo incluye su propia componente de requisitos.
- **Varios productos con requisitos compartidos:** la unión deduplica; cada elemento aparece una
  sola vez en `pasos`.
- **Ciclo simple de dos elementos:** `INS-A → PROC-B → INS-A` produce
  `secuencia: ["INS-A", "PROC-B", "INS-A"]` y ambos elementos en `elementosBloqueados`.
- **Varios ciclos independientes:** se reporta un ciclo representativo por SCC cíclica, ordenados
  por el menor `id` de cada SCC.
- **Ciclo en una rama no solicitada:** el plan de un producto de otra rama no lo incluye ni se
  bloquea por él.
- **Todos los productos solicitados bloqueados:** `200` con `pasos: []` y todos los estados
  `BLOQUEADO`; no se devuelve `409` ni un plan vacío presentado como éxito.

## 7. Decisiones relacionadas

| Decisión | Registro |
| -------- | -------- |
| Dirección única `origen habilita destino` | `docs/decisions/analyst.md` |
| Representación del grafo con adyacencias de entrada y salida propias del proyecto | `docs/decisions/analyst.md` |
| F1 registra ciclos sin detectarlos | `docs/decisions/analyst.md` |
| Matriz de tipos permitida (4 de 16) y `PRODUCTO` terminal | `docs/decisions/analyst.md` |
| Semántica AND de las aristas entrantes; sin alternativas OR | `docs/decisions/analyst.md` |
| Asociación previa del `INSUMO` antes de habilitar un proceso | `docs/decisions/analyst.md` |
| F3 con plan de entrega por producto y diagnóstico global de planta | `docs/decisions/analyst.md` |
| Diagnóstico global con `200` y reporte estructurado de ciclos; `ERR-10` no se emite | `docs/decisions/analyst.md` |
| Un ciclo representativo por SCC cíclica | `docs/decisions/analyst.md` |
| F3 orden topológico determinista (Kahn) y detección de ciclos por SCC sin NetworkX | `docs/decisions/analyst.md` |

## 8. Relevancia para F2 — Análisis de impacto

- **Sentido del recorrido:** para determinar qué se afecta por la indisponibilidad de un elemento `X`, se recorre el grafo en **sentido hacia adelante** desde `X` siguiendo aristas `X → Y` (donde `X` habilita a `Y`). Los elementos alcanzables son los afectados directa o indirectamente.
- **"Alcanzar":** existe un camino dirigido desde el elemento consultado al elemento alcanzado. Esto define el conjunto de afectados.
- **Conjunto de afectados:** es exactamente el conjunto de elementos alcanzables hacia adelante. No se filtra por tipo de elemento: un proveedor, un insumo, un proceso o un producto alcanzados son todos afectados.
- **Predecesores no afectados:** los elementos que habilitan al elemento consultado (sus requisitos previos) no forman parte del conjunto de afectados. La indisponibilidad de un elemento no afecta a quienes dependen de él.
- **Diferenciación:** elemento inexistente ≠ elemento existente sin dependencias salientes ≠ elemento que afecta una cadena. Un identificador mal formado es, además, una tercera situación, distinta de «inexistente».
- **Recorrido propio:** el cálculo debe realizarse con recorrido propio del proyecto (sin NetworkX para recorridos/caminos/impacto). NetworkX solo podría usarse para visualizar resultados ya calculados, no para el cálculo.
- **Ciclos:** si existen ciclos (registrados en F1), el recorrido debe terminar (manejo de visitados) y devolver elementos alcanzables de forma comprensible; no se asume grafo acíclico.
- **Coherencia:** la dirección definida es invariante; no se invierte el grafo para el análisis de impacto.
- **Documentación:** este significado de «alcanzar» está escrito en el `README.md` del repositorio, como exige el brief de F2.
- **Contrato:** la forma de la respuesta y los códigos de error están en `api-contract.md` §8.

