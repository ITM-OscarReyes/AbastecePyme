# Modelo del grafo — AbastecePyme

Documento de referencia para **F1 — Catálogo de dependencias** y **F2 — Análisis de impacto**.
Define la dirección de las relaciones y la representación del grafo, que son requisitos explícitos
de F1 en `docs/brief.md`, y su lectura para el análisis de impacto de F2 (sección 8).

- Requisitos relacionados: `requirements.md` (RF-F1-06, RF-F1-15, RF-F1-16, RNF-F1-03) y, para F2,
  `requirements.md` §9.
- Contrato HTTP: `api-contract.md` (secciones 1 a 7 para F1, sección 8 para F2).
- Verificación: `acceptance-criteria.md` (secciones 1 a 6 para F1, sección 7 para F2).

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