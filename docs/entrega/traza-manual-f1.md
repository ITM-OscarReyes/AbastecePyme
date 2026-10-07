# Traza manual de F1 — Catálogo de dependencias

Ejemplo pequeño recorrido a mano. Los valores de las respuestas
se obtuvieron ejecutando el backend real con `uvicorn app.main:app`.

**Dirección del grafo:** `origen → destino`, con `tipoRelacion: "habilita"`, y la lectura "Para
producir el destino necesito el origen" (ver [`graph-model.md`](../graph-model.md), sección 2).

---

## 1. Registrar un elemento: `POST /api/v1/elementos`

Petición:

```json
{"id": "prov-plastico", "tipo": "proveedor", "nombre": "Proveedor de plastico"}
```

Recorrido por capas, hacia dentro:

| Paso | Capa | Qué ocurre |
| ---- | ---- | ---------- |
| 1 | `api/rutas.py` | Lee el cuerpo y construye la petición. No valida nada todavía |
| 2 | `aplicacion/casos_de_uso.py` → `CrearElemento.ejecutar` | Rechaza campos desconocidos (`_rechazar_campos_desconocidos`); con `{"id", "tipo", "nombre"}` no hay ninguno, así que sigue |
| 3 | `dominio/elemento.py` → `Elemento.crear` | Normaliza y valida: `prov-plastico` → `PROV-PLASTICO`, `proveedor` → `PROVEEDOR`, nombre no vacío y hasta 120 caracteres |
| 4 | `dominio/catalogo.py` → `registrar_elemento` | Comprueba unicidad del `id` en el catálogo completo. Crea las dos entradas de adyacencia vacías: `_adyacencia_salida["PROV-PLASTICO"] = set()` y `_adyacencia_entrada[...] = set()` |
| 5 | `infraestructura/repositorio_memoria.py` → `guardar` | Devuelve el catálogo al almacén |
| 6 | `api/esquemas.py` | Traduce `snake_case` → `lowerCamelCase` al serializar |

Respuesta, tal como se obtuvo:

```json
201 {"id":"PROV-PLASTICO","tipo":"PROVEEDOR","nombre":"Proveedor de plastico","descripcion":null}
```

Los tres cambios de valor son decisiones del dominio, no del transporte:
`prov-plastico → PROV-PLASTICO`, `proveedor → PROVEEDOR` y `descripcion` ausente → `null`.

---

## 2. Registrar una dependencia válida: `POST /api/v1/dependencias`

Petición:

```json
{"origen": "prov-plastico", "destino": "INS-BARRA"}
```

| Paso | Capa | Qué ocurre |
| ---- | ---- | ---------- |
| 1 | `api/rutas.py` | Recibe el cuerpo |
| 2 | `aplicacion/casos_de_uso.py` → `RegistrarDependencia.ejecutar` | `_rechazar_campos_desconocidos` contra `{"origen", "destino"}`; luego `normalizar_identificador` en ambos campos |
| 3 | `dominio/catalogo.py` → `registrar_dependencia` | **3a.** `origen in self._elementos` → `True`<br>**3b.** `destino in self._elementos` → `True`<br>**3c.** `origen == destino` → `False`<br>**3d.** `destino in self._adyacencia_salida[origen]` → `False` (no duplicada) |
| 4 | `dominio/catalogo.py` | `self._adyacencia_salida["PROV-PLASTICO"].add("INS-BARRA")` y `self._adyacencia_entrada["INS-BARRA"].add("PROV-PLASTICO")`: la arista se guarda en los dos índices |
| 5 | `api/esquemas.py` | Serializa con `tipoRelacion` fijo en `"habilita"` |

```json
201 {"origen": "PROV-PLASTICO", "destino": "INS-BARRA", "tipoRelacion": "habilita"}
```

---

## 3. El mismo caso con `destino` inexistente

Petición: `{"origen": "prov-plastico", "destino": "NO-EXISTE"}`

El recorrido se corta en el paso **3b**: `destino not in self._elementos`. El dominio lanza
`ElementoNoEncontrado` con `DetalleError(campo="destino", ...)`, el adaptador HTTP lo traduce y el
caso de uso **no llega a `guardar()`**, de modo que el catálogo queda intacto
(`AC-F1-06c` y `AC-F1-11d`).

```json
404 {"error": {"codigo": "ELEMENTO_NO_ENCONTRADO",
     "mensaje": "No existe un elemento con el identificador NO-EXISTE.",
     "detalles": [{"campo": "destino", "mensaje": "El elemento 'NO-EXISTE' no existe en el catálogo."}]}}
```

Mismo camino, mismo código, distinto resultado: la distinción entre "formato inválido" y "no
existe" la hace `validacion.py` (que responde `422 ERR-05`) frente a `catalogo.py` (que responde
`404 ERR-02`).

---

## 4. Consulta filtrada: `GET /api/v1/dependencias?origen=prov-plastico`

| Paso | Capa | Qué ocurre |
| ---- | ---- | ---------- |
| 1 | `api/rutas.py` | Lee el parámetro `origen` de la query |
| 2 | `aplicacion/casos_de_uso.py` → `ListarDependencias.ejecutar` | `validar_identificador_consulta("prov-plastico", "origen")` lo normaliza a `PROV-PLASTICO` |
| 3 | `dominio/catalogo.py` → `listar_dependencias` | Recorre `sorted(self._adyacencia_salida)` y para cada origen `sorted(self._adyacencia_salida[o])`; después filtra `dep.origen == origen` |
| 4 | `api/esquemas.py` | Devuelve la colección y el `total` |

```json
200 {"dependencias": [{"origen": "PROV-PLASTICO", "destino": "INS-BARRA", "tipoRelacion": "habilita"}], "total": 1}
```

El orden sale de `sorted`, no del orden de inserción: dos lecturas idénticas sobre el mismo estado
devuelven colecciones idénticas (`AC-F1-18`). Un filtro sin coincidencias responde `200` con lista
vacía, no `404` (`AC-F1-13c`).

---

## 5. Estado resultante del grafo: `GET /api/v1/grafo`

El caso de uso `ObtenerGrafo.ejecutar` solo devuelve el agregado; no calcula recorridos, niveles,
ciclos ni órdenes (`AC-F1-10c`). Tras los pasos anteriores, con el catálogo de demostración:

```json
{"resumen": {"totalElementos": 7, "totalDependencias": 7}, ...}
```

**Comprobación manual del resumen**: 6 elementos de demostración + `PROV-PLASTICO` = 7; 6
dependencias de demostración + `PROV-PLASTICO → INS-BARRA` = 7. Las dos cuentas coinciden con lo
devuelto, que es lo que exige `AC-F1-10`.

Orden de lectura de la red con estos datos, escrito a partir de las siete aristas anteriores.

En forma de cadena, siguiendo la dirección de las flechas:

```
PROV-ACERO     --> INS-BARRA --> PROC-CORTE --+
PROV-PLASTICO  --> INS-BARRA                  +--> PROD-PANEL --> PROD-BANCO
                              INS-TORNILLO  --+
                              INS-TORNILLO  -------------------------> PROD-BANCO
```

Y tal como el dominio lo guarda realmente en `Catalogo._adyacencia_salida`, que es la misma lista
que devuelve `GET /grafo`:

| Origen | Destinos |
| ------ | -------- |
| `INS-BARRA` | `PROC-CORTE` |
| `INS-TORNILLO` | `PROD-BANCO`, `PROD-PANEL` |
| `PROC-CORTE` | `PROD-PANEL` |
| `PROD-PANEL` | `PROD-BANCO` |
| `PROV-ACERO` | `INS-BARRA` |
| `PROV-PLASTICO` | `INS-BARRA` |

Una flecha `A -> B` se lee "para producir `B` necesito `A`". Hay nodos con dos entradas
(`PROD-PANEL` recibe de `PROC-CORTE` y de `INS-TORNILLO`; `INS-BARRA` recibe de `PROV-ACERO` y de
`PROV-PLASTICO`) y con dos salidas (`INS-TORNILLO` habilita `PROD-PANEL` y `PROD-BANCO`). La
estructura admite cualquier forma.

F1 devuelve esta estructura tal como está: el análisis de qué se alcanza a partir de un nodo es F2
y el orden de preparación es F3, y ninguno de los dos está implementado ni calculado aquí.
