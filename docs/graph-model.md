# Modelo del grafo — AbastecePyme

Documento de referencia para **F1 — Catálogo de dependencias**, **F2 — Análisis de impacto** y **F3 — Orden y ciclos de producción**.
Define la dirección de las relaciones, la representación del grafo propio, su lectura para el análisis de impacto de F2 (sección 8), la condición de DAG, el orden topológico determinista de preparación y los algoritmos de detección de ciclos sin bibliotecas de terceros para F3 (sección 9).

- Requisitos relacionados: `requirements.md` (RF-F1-06, RF-F1-15, RF-F1-16, RNF-F1-03, F2 en §9, y RF-F3-01 a RF-F3-06, RNF-F3-03 en §11).
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

La dirección es única, pero no toda combinación de tipos es una relación de negocio válida:

| Tipo de origen | Puede habilitar a |
| -------------- | ----------------- |
| `PROVEEDOR` | `INSUMO`, `PROCESO`, `PRODUCTO` |
| `INSUMO` | `PROCESO`, `PRODUCTO` |
| `PROCESO` | `INSUMO`, `PRODUCTO` |
| `PRODUCTO` | Ninguno: es el final de la cadena |

Además, un `INSUMO` debe estar asociado a un `PROVEEDOR` o a un `PROCESO` antes de enlazarse con
un proceso o producto. La matriz completa, con el motivo de cada combinación, se expone en
`GET /api/v1/reglas-dependencia` y la valida el dominio en la creación y edición de relaciones.

## 5. Elementos sin dependencias y grafo vacío

Ambos estados son parte del modelo, no errores:

- **Elemento sin dependencias:** elemento presente en `V` con ambos conjuntos de adyacencia vacíos.
  Es el nodo más simple del grafo y se registra sin ninguna condición adicional.
- **Grafo vacío:** `V = ∅` y `E = ∅`. El listado responde con colecciones vacías y totales en cero.
- **Dependencia hacia un elemento que existe y otro que no:** se rechaza la operación completa; no
  se registra una arista parcial ni un elemento implícito. El grafo nunca contiene nodos derivados
  de una dependencia: los nodos se crean únicamente al registrar elementos.

## 6. Modelo de F3 — Orden de producción y detección de ciclos

### 6.1 Definición de Grafo Dirigido Acíclico (DAG) y Orden de Producción

En AbastecePyme, la red de dependencias registrada en el catálogo es un dígrafo $G = (V, E)$. Para que una configuración de producción sea realizable y no contradictoria, el grafo debe ser un **Grafo Dirigido Acíclico** (DAG, por sus siglas en inglés: *Directed Acyclic Graph*).

1. **Definición de DAG:** Un dígrafo que no contiene ningún camino dirigido $v_0, v_1, \dots, v_k$ tal que $v_0 = v_k$ ($k \ge 1$).
2. **Orden de Producción / Preparación (Ordenamiento Topológico):**
   Dado que una arista $(u, v) \in E$ significa «$u$ habilita a $v$» («para preparar o producir $v$, se requiere que $u$ esté disponible previamente»), un orden de preparación válido es una secuencia lineal de todos los elementos de $V$, $v_1, v_2, \dots, v_n$, tal que para cada arista dirigida $(u, v) \in E$, $u$ aparece estrictamente **antes** que $v$ en la secuencia.
3. **Existencia:** Un dígrafo admite un ordenamiento topológico si y solo si es acíclico (es un DAG). Si existe al menos un ciclo, es imposible establecer un orden secuencial válido sin violar alguna dependencia previa; en este caso, el sistema **no debe devolver un orden falso ni parcial**, sino reportar la imposibilidad y alertar sobre los ciclos detectados.

### 6.2 Dirección de las aristas y grado de entrada (In-Degree)

Con la dirección fijada en la sección 2 (`origen habilita destino`):
- Los **requisitos previos directos** de un elemento $v$ son sus predecesores inmediatos: $\text{Pred}(v) = \{u \in V \mid (u, v) \in E\}$ (representados en `_adyacencia_entrada[v]`).
- El **grado de entrada** ($\text{in-degree}$) de $v$ es $|\text{Pred}(v)|$. Representa exactamente el **número de requisitos pendientes que deben prepararse antes de $v$**.
- Elementos con $\text{in-degree} = 0$: son aquellos que **no tienen requisitos pendientes** (por ejemplo, proveedores externos o insumos base que no dependen de ningún proceso o elemento previo). Estos elementos están listos para ser despachados o preparados de inmediato en el paso inicial.
- Cuando un elemento $u$ se prepara, todos los elementos $v$ a los que habilita ($v \in \text{adyacencia\_salida}[u]$) ven reducido su contador de requisitos pendientes en 1. En cuanto el contador de $v$ llega a 0, $v$ pasa a estar habilitado para su preparación.

### 6.3 Algoritmos propios de resolución (Sin NetworkX)

De acuerdo con `AGENTS.md` (RNF-F3-03), los algoritmos no deben utilizar NetworkX ni bibliotecas externas.

Se especifican dos enfoques complementarios y deterministas implementados en la capa de dominio:

1. **Algoritmo de Kahn (para cálculo del orden topológico y verificación de aciclicidad):**
   - **Inicialización:** Calcular el in-degree de cada elemento $v \in V$ usando `adyacencia_entrada`.
   - **Cola de listos:** Los elementos con in-degree igual a 0 se colocan en una estructura ordenada alfabéticamente por `id` ascendente para garantizar **determinismo estricto**.
   - **Iteración:** En cada paso, se extrae el elemento $u$ disponible con menor `id`, se agrega a la lista `orden`, y para cada $v \in \text{adyacencia\_salida}[u]$, se decrementa su in-degree en 1. Si el in-degree de $v$ llega a 0, $v$ entra a la cola de listos (manteniendo el orden determinista).
   - **Criterio de finalización:** Si la lista `orden` contiene $|V|$ elementos, el grafo es un DAG y `orden` es el orden de producción determinista válido.
   - Si la lista `orden` contiene menos de $|V|$ elementos, el grafo contiene al menos un ciclo. En este caso, el orden de producción global es irrealizable.

2. **Detección y reporte estructurado de ciclos (Búsqueda DFS con colores / back-edges):**
   - Cuando el algoritmo detecta que existen elementos no procesados (o para un análisis determinista recorriendo nodos en orden alfabético), se identifican los ciclos existentes.
   - Mediante DFS con tres estados de color por nodo:
     - `BLANCO` (no visitado),
     - `GRIS` (en la pila de recursión del camino actual),
     - `NEGRO` (visitado completamente).
   - Al explorar desde un nodo en orden alfabético y encontrar una arista hacia un nodo `GRIS`, se ha detectado una *back-edge* (arista de retroceso), lo que confirma un ciclo cerrado.
   - **Reporte del ciclo:** Se reconstruye el ciclo exacto como una secuencia ordenada de identificadores: $[c_1, c_2, \dots, c_k, c_1]$, donde cada paso $(c_i, c_{i+1})$ es una dependencia registrada, terminando en el nodo inicial para evidenciar el lazo cerrado (ej. `["A", "B", "C", "A"]`).
   - Si existen múltiples componentes o lazos, se reporta al menos un ciclo cerrado elemental unívoco y los elementos involucrados en el bloqueo.

### 6.4 Casos estructurales del grafo en F3

- **Grafo vacío ($V = \emptyset$):** Es un DAG trivial. El orden de preparación es una lista vacía `[]`, sin ciclos (`es_dag: true`).
- **Nodos aislados (elementos sin dependencias):** Tienen in-degree 0 y out-degree 0. Entran en el orden de preparación inmediatamente (ordenados por su `id`). No generan contradicciones.
- **Grafos disconexos / Múltiples componentes:** Si todas las componentes son acíclicas, el ordenamiento procesa cada componente según sus dependencias respetando el desempate determinista por `id`. Si alguna componente tiene un ciclo, todo el grafo se clasifica como cíclico para producción general (`es_dag: false`).
- **Ciclo simple de 2 nodos:** $A \to B$ y $B \to A$. Reporte de ciclo: `["A", "B", "A"]`.
- **Ciclos en subgrafos:** Si un subgrafo contiene un ciclo pero otros nodos son independientes, el sistema reporta que no es posible generar un orden global válido debido al ciclo en el subgrafo, identificando exactamente la secuencia del ciclo.

## 7. Decisiones relacionadas

| Decisión | Registro |
| -------- | -------- |
| Dirección única `origen habilita destino` | `docs/decisions/analyst.md` |
| Representación del grafo con adyacencias de entrada y salida propias del proyecto | `docs/decisions/analyst.md` |
| F1 registra ciclos sin detectarlos | `docs/decisions/analyst.md` |
| F3 orden topológico determinista (Kahn) y detección de ciclos estructurada (DFS) sin NetworkX | `docs/decisions/analyst.md` |

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

## 9. Modelo de F3 — Orden de producción y detección de ciclos

### 9.1 Definición de Grafo Dirigido Acíclico (DAG) y Orden de Producción

En AbastecePyme, la red de dependencias registrada en el catálogo es un dígrafo $G = (V, E)$. Para que una configuración de producción sea realizable y no contradictoria, el grafo debe ser un **Grafo Dirigido Acíclico** (DAG, por sus siglas en inglés: *Directed Acyclic Graph*).

1. **Definición de DAG:** Un dígrafo que no contiene ningún camino dirigido $v_0, v_1, \dots, v_k$ tal que $v_0 = v_k$ ($k \ge 1$).
2. **Orden de Producción / Preparación (Ordenamiento Topológico):**
   Dado que una arista $(u, v) \in E$ significa «$u$ habilita a $v$» («para preparar o producir $v$, se requiere que $u$ esté disponible previamente»), un orden de preparación válido es una secuencia lineal de todos los elementos de $V$, $v_1, v_2, \dots, v_n$, tal que para cada arista dirigida $(u, v) \in E$, $u$ aparece estrictamente **antes** que $v$ en la secuencia.
3. **Existencia:** Un dígrafo admite un ordenamiento topológico si y solo si es acíclico (es un DAG). Si existe al menos un ciclo, es imposible establecer un orden secuencial válido sin violar alguna dependencia previa; en este caso, el sistema **no debe devolver un orden falso ni parcial**, sino reportar la imposibilidad y alertar sobre los ciclos detectados.

### 9.2 Dirección de las aristas y grado de entrada (In-Degree)

Con la dirección fijada en la sección 2 (`origen habilita destino`):
- Los **requisitos previos directos** de un elemento $v$ son sus predecesores inmediatos: $\text{Pred}(v) = \{u \in V \mid (u, v) \in E\}$ (representados en `_adyacencia_entrada[v]`).
- El **grado de entrada** ($\text{in-degree}$) de $v$ es $|\text{Pred}(v)|$. Representa exactamente el **número de requisitos pendientes que deben prepararse antes de $v$**.
- Elementos con $\text{in-degree} = 0$: son aquellos que **no tienen requisitos pendientes** (por ejemplo, proveedores externos o insumos base que no dependen de ningún proceso o elemento previo). Estos elementos están listos para ser despachados o preparados de inmediato en el paso inicial.
- Cuando un elemento $u$ se prepara, todos los elementos $v$ a los que habilita ($v \in \text{adyacencia\_salida}[u]$) ven reducido su contador de requisitos pendientes en 1. En cuanto el contador de $v$ llega a 0, $v$ pasa a estar habilitado para su preparación.

### 9.3 Algoritmos propios de resolución (Sin NetworkX)

De acuerdo con `AGENTS.md` (RNF-F3-03), los algoritmos no deben utilizar NetworkX ni bibliotecas externas.

Se especifican dos enfoques complementarios y deterministas implementados en la capa de dominio:

1. **Algoritmo de Kahn (para cálculo del orden topológico y verificación de aciclicidad):**
   - **Inicialización:** Calcular el in-degree de cada elemento $v \in V$ usando `adyacencia_entrada`.
   - **Cola de listos:** Los elementos con in-degree igual a 0 se colocan en una estructura ordenada alfabéticamente por `id` ascendente para garantizar **determinismo estricto**.
   - **Iteración:** En cada paso, se extrae el elemento $u$ disponible con menor `id`, se agrega a la lista `orden`, y para cada $v \in \text{adyacencia\_salida}[u]$, se decrementa su in-degree en 1. Si el in-degree de $v$ llega a 0, $v$ entra a la cola de listos (manteniendo el orden determinista).
   - **Criterio de finalización:** Si la lista `orden` contiene $|V|$ elementos, el grafo es un DAG y `orden` es el orden de producción determinista válido.
   - Si la lista `orden` contiene menos de $|V|$ elementos, el grafo contiene al menos un ciclo. En este caso, el orden de producción global es irrealizable.

2. **Detección y reporte estructurado de ciclos (Búsqueda DFS con colores / back-edges):**
   - Cuando el algoritmo detecta que existen elementos no procesados (o para un análisis determinista recorriendo nodos en orden alfabético), se identifican los ciclos existentes.
   - Mediante DFS con tres estados de color por nodo:
     - `BLANCO` (no visitado),
     - `GRIS` (en la pila de recursión del camino actual),
     - `NEGRO` (visitado completamente).
   - Al explorar desde un nodo en orden alfabético y encontrar una arista hacia un nodo `GRIS`, se ha detectado una *back-edge* (arista de retroceso), lo que confirma un ciclo cerrado.
   - **Reporte del ciclo:** Se reconstruye el ciclo exacto como una secuencia ordenada de identificadores: $[c_1, c_2, \dots, c_k, c_1]$, donde cada paso $(c_i, c_{i+1})$ es una dependencia registrada, terminando en el nodo inicial para evidenciar el lazo cerrado (ej. `["A", "B", "C", "A"]`).
   - Si existen múltiples componentes o lazos, se reporta al menos un ciclo cerrado elemental unívoco y los elementos involucrados en el bloqueo.

### 9.4 Casos estructurales del grafo en F3

- **Grafo vacío ($V = \emptyset$):** Es un DAG trivial. El orden de preparación es una lista vacía `[]`, sin ciclos (`es_dag: true`).
- **Nodos aislados (elementos sin dependencias):** Tienen in-degree 0 y out-degree 0. Entran en el orden de preparación inmediatamente (ordenados por su `id`). No generan contradicciones.
- **Grafos disconexos / Múltiples componentes:** Si todas las componentes son acíclicas, el ordenamiento procesa cada componente según sus dependencias respetando el desempate determinista por `id`. Si alguna componente tiene un ciclo, todo el grafo se clasifica como cíclico para producción general (`es_dag: false`).
- **Ciclo simple de 2 nodos:** $A \to B$ y $B \to A$. Reporte de ciclo: `["A", "B", "A"]`.
- **Ciclos en subgrafos:** Si un subgrafo contiene un ciclo pero otros nodos son independientes, el sistema reporta que no es posible generar un orden global válido debido al ciclo en el subgrafo, identificando exactamente la secuencia del ciclo.
