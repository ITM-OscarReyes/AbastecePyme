# Modelo del grafo — AbastecePyme

Documento de referencia para **F1 — Catálogo de dependencias**. Define la dirección de las
relaciones y la representación del grafo, que son requisitos explícitos de F1 en `docs/brief.md`.

- Requisitos relacionados: `requirements.md` (RF-F1-06, RF-F1-15, RF-F1-16, RNF-F1-03).
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
| `INS-TORNILLO → PROD-BANCO` | Para producir el banco de montaje necesito el insumo de tornillos | El producto depende del insumo |
| `PROV-ACERO → INS-BARRA` | Para preparar el insumo de barra de acero necesito al proveedor de acero | El insumo depende del proveedor |
| `PROC-CORTE → PROD-PANEL` | Para producir el panel necesito el proceso de corte previo | El producto depende de un proceso interno |
| `PROD-PANEL → PROD-CONJUNTO` | Para producir el conjunto final necesito el panel | Un producto puede requerir otro producto |

Nótese que la frase sigue siendo coherente cuando el origen es un proveedor o un proceso: lo que
se necesita es que esté **disponible**, no que se produzca. Esa generalización es lo que permite
usar **una sola dirección para todos los tipos de elemento**, en lugar de una dirección por tipo.

### 2.2 Por qué la flecha apunta del requisito previo al dependiente

1. **Una sola dirección para todo el dominio.** El brief exige una interpretación clara de cada
   relación y prohíbe arreglar una dirección confusa con condicionales. Con la flecha
   `requisito previo → dependiente`, la lectura es siempre «esto habilita aquello», sin excepciones
   por tipo de elemento.
2. **La frase se invierte de forma verificable.** El brief pide comprobar si «Para producir \_\_\_
   necesito \_\_\_» deja de tener sentido al invertirla. Con esta dirección, invertir la arista
   cambia el significado de negocio de forma detectable: `INS-TORNILLO → PROD-BANCO` significa algo
   y `PROD-BANCO → INS-TORNILLO` significaría que el banco habilita al tornillo, lo cual es falso en
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
| `INS-BARRA → PROC-CORTE` | Para el proceso de corte necesito la barra de acero |
| `PROC-CORTE → PROD-PANEL` | Para el panel necesito el proceso de corte |
| `INS-TORNILLO → PROD-PANEL` | Para el panel necesito tornillos |
| `PROD-PANEL → PROD-BANCO` | Para el banco de montaje necesito el panel |
| `INS-TORNILLO → PROD-BANCO` | Para el banco de montaje necesito tornillos |

Grado de salida de `INS-TORNILLO`: 2. Grado de salida de `INS-BARRA`: 1. Con esta dirección,
`INS-TORNILLO` alcanza a `PROC-CORTE`, `PROD-PANEL` y `PROD-BANCO`, que son los procesos y
productos afectados si el insumo no está disponible.

## 5. Elementos sin dependencias y grafo vacío

Ambos estados son parte del modelo, no errores:

- **Elemento sin dependencias:** elemento presente en `V` con ambos conjuntos de adyacencia vacíos.
  Es el nodo más simple del grafo y se registra sin ninguna condición adicional.
- **Grafo vacío:** `V = ∅` y `E = ∅`. El listado responde con colecciones vacías y totales en cero.
- **Dependencia hacia un elemento que existe y otro que no:** se rechaza la operación completa; no
  se registra una arista parcial ni un elemento implícito. El grafo nunca contiene nodos derivados
  de una dependencia: los nodos se crean únicamente al registrar elementos.

## 6. Lo que F1 no hace con el grafo

Para evitar que la implementación de F1 se adelante a otras features, queda explícito que F1 no
detecta ciclos, no calcula caminos, no cuenta niveles, no produce orden topológico y no valida que la
red sea «producible». F1 solo registra, valida, almacena y expone la estructura.

## 7. Decisiones relacionadas

| Decisión | Registro |
| -------- | -------- |
| Dirección única `origen habilita destino` | `docs/decisions/analyst.md` |
| Representación del grafo con adyacencias de entrada y salida propias del proyecto | `docs/decisions/analyst.md` |
| F1 registra ciclos sin detectarlos | `docs/decisions/analyst.md` |