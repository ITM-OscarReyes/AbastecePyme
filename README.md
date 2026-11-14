# AbastecePyme

Solución para una pequeña empresa manufacturera que permite registrar proveedores, insumos,
productos y procesos, declarar sus dependencias y visualizar la red de abastecimiento.

Los datos del proyecto son **sintéticos**: no corresponden a personas, proveedores ni operaciones
reales.

## Documentación

| Documento | Contenido |
| --------- | --------- |
| [`docs/brief.md`](docs/brief.md) | Fuente de verdad de necesidades, alcance y reglas de negocio |
| [`docs/requirements.md`](docs/requirements.md) | Requisitos funcionales y no funcionales de F1, F2, F3 y F4, trazabilidad y decisiones pendientes |
| [`docs/graph-model.md`](docs/graph-model.md) | Dirección de las aristas y representación del grafo |
| [`docs/api-contract.md`](docs/api-contract.md) | Contrato REST, validaciones y catálogo de errores |
| [`docs/architecture.md`](docs/architecture.md) | Capas, responsabilidades y convenciones |
| [`docs/acceptance-criteria.md`](docs/acceptance-criteria.md) | Criterios de aceptación y casos límite |
| [`docs/decisions/`](docs/decisions) | Registro de decisiones por agente |

Los entregables de la feature viven aparte, en [`docs/entrega/`](docs/entrega): la bitácora de IA,
la traza manual del ejemplo pequeño y la salida de la última ejecución del script de aceptación.

## Estado del proyecto

Implementadas y verificadas la **F1 — Catálogo de dependencias**, la **F2 — Análisis de impacto** y la **F3 — Orden de producción y ciclos**, con las mejoras solicitadas sobre la interfaz: inventario y alertas de stock para suministros, edición y eliminación de elementos y relaciones con aviso de continuidad, reglas de dependencia por tipo, ficha modal de cada elemento, historial de los 10 análisis de impacto más recientes y guía de uso.

La **F4 — Tablero de abastecimiento demostrable** está **especificada** en `docs/` (tablero integrado, perfiles con permisos diferenciados y escenarios de aceptación) y **pendiente de implementación**. El tablero compondrá resultados reales de F1, F2 y F3; no añadirá algoritmos ni endpoints de cálculo.

## Requisitos

| Herramienta | Versión |
| ----------- | ------- |
| Python | 3.12 o superior |
| Node.js | 20.19+ o 22.12+ (versión con la que se ha construido el proyecto) |
| npm | Incluido con Node.js |

## Estructura

```
backend/
  app/
    dominio/        Modelo, reglas de negocio y catálogo
    aplicacion/     Casos de uso y puertos
    infraestructura/ Persistencia en memoria y datos sintéticos
    api/            Rutas y esquemas HTTP
frontend/
  src/
    components/     Componentes de presentación
    services/       Cliente de la API y traducción de errores
    types/          Tipos del contrato de la API
docs/               Especificación técnica y registro de decisiones
prompts/            Prompts de configuración y de generación de documentación
```

## Puesta en marcha

El backend y el frontend se ejecutan en dos terminales distintas. El frontend reenvía las
peticiones a la API mediante un proxy, por lo que ambos deben estar levantados a la vez.

### 1. Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\pip install -r requirements.txt
.\.venv\Scripts\uvicorn app.main:app --reload
```

Queda disponible en `http://127.0.0.1:8000`, con la API bajo `/api/v1` y la documentación
interactiva en `http://127.0.0.1:8000/docs`.

Arranca con el conjunto sintético de demostración: **27 elementos y 37 dependencias** que forman la
línea de acero, la línea de madera y sus subensamblajes. Los datos viven en memoria, por lo que se
restablecen al reiniciar el servidor.

### 2. Frontend

```powershell
cd frontend
npm install
npm run dev
```

Queda disponible en `http://localhost:3000`.

El proxy de Vite (`frontend/vite.config.ts`) redirige las peticiones que empiezan por `/api` hacia
`http://127.0.0.1:8000`. Si el backend cambia de puerto, hay que actualizar ese valor.

### 3. Verificar la instalación

1. Abrir `http://localhost:3000` y comprobar que la red se dibuja con los datos que trae el backend.
2. Abrir `http://127.0.0.1:8000/docs` y ejecutar `GET /api/v1/grafo`.

### 4. Script de aceptación de F1

El script de aceptación consume la API REST real con datos de prueba, sin frameworks añadidos.
Necesita el backend recién arrancado con el catálogo de demostración intacto.

```powershell
cd backend
.\.venv\Scripts\python.exe tests\verificacion_http.py http://127.0.0.1:8000
```

Imprime cada escenario con lo esperado, lo obtenido y si pasó o falló, y cierra con el recuento.
Cubre un escenario normal de negocio, un ciclo, elementos inexistentes, una ruta inexistente,
consultas sin datos y datos mal formados o repetidos. Sale con código `1` si algún escenario falla.

La salida de la última ejecución queda guardada en
`docs/entrega/salida-aceptacion-f1.txt`. Para regenerarla,
con el backend recién arrancado:

```powershell
cd backend
cmd /c ".venv\Scripts\python.exe -X utf8 tests\verificacion_http.py http://127.0.0.1:8000 > ..\docs\entrega\salida-aceptacion-f1.txt"
```

El resto de suites:

```powershell
cd backend   ; .\.venv\Scripts\python.exe -m pytest      # 209 pruebas (206 pasan, 3 de fallo esperado)
cd frontend  ; npm run test                              # 39 pruebas
              npm run test:e2e                           # 26 pruebas (backend en 8000)
              npm run test:e2e:vacio                     #  5 pruebas (catálogo vacío)
```

## Otros comandos del frontend

| Comando | Descripción |
| ------- | ----------- |
| `npm run dev` | Servidor de desarrollo con recarga en caliente |
| `npm run build` | Comprobación de tipos y compilación a `dist/` |
| `npm run preview` | Sirve localmente la compilación de `dist/` |
| `npm run lint` | Análisis estático con Oxlint |

## Dónde vive cada cosa

Las reglas de negocio, las validaciones y los cálculos sobre la red están en el backend. El frontend
es capa de presentación: consume la API real, muestra los errores que recibe sin reinterpretarlos
como estado vacío y no valida por su cuenta las reglas del catálogo.

La red se dibuja con Cytoscape, que solo dibuja lo que devuelve el backend: el frontend no calcula
recorridos, ciclos ni órdenes de producción.

## API

| Método | Ruta | Descripción |
| ------ | ---- | ----------- |
| `POST` | `/api/v1/elementos` | Crear un elemento del catálogo |
| `GET` | `/api/v1/elementos` | Listar elementos, con filtro opcional por `tipo` |
| `GET` | `/api/v1/elementos/{id}` | Consultar un elemento |
| `PUT` | `/api/v1/elementos/{id}` | Actualizar nombre, descripción e inventario |
| `DELETE` | `/api/v1/elementos/{id}` | Eliminar un elemento y sus relaciones |
| `POST` | `/api/v1/dependencias` | Registrar una dependencia dirigida |
| `GET` | `/api/v1/dependencias` | Listar dependencias, con filtro por `origen` o `destino` |
| `PUT` | `/api/v1/dependencias/{origen}/{destino}` | Cambiar los extremos de una relación |
| `DELETE` | `/api/v1/dependencias/{origen}/{destino}` | Eliminar una relación |
| `GET` | `/api/v1/reglas-dependencia` | Consultar las combinaciones de tipos permitidas |
| `GET` | `/api/v1/grafo` | Obtener la representación del grafo |
| `GET` | `/api/v1/impacto/{id}` | Consultar los elementos afectados por la indisponibilidad de un elemento |
| `GET` | `/api/v1/orden-produccion` | Obtener el diagnóstico global: orden de preparación válido (DAG) o reporte de ciclos |
| `GET` | `/api/v1/plan-entrega` | Obtener el plan de preparación de uno o varios productos |
| `GET` | `/api/v1/perfiles` | Listar los perfiles de demostración y su capacidad de escritura |
| `POST` | `/api/v1/sesion` | Iniciar una sesión de demostración con un perfil |
| `GET` | `/api/v1/sesion` | Consultar la sesión activa |
| `DELETE` | `/api/v1/sesion` | Cerrar la sesión activa |

Los suministros (`INSUMO`) incluyen `stockDisponible`, `stockMinimo`, `estadoStock` y
`alertaStock`. La alerta se activa cuando la cantidad disponible es inferior al mínimo aceptable.
El detalle de los campos, los códigos de estado y el catálogo de errores están en
[`docs/api-contract.md`](docs/api-contract.md).

Los endpoints de `perfiles` y `sesion` están **especificados para F4** y todavía no forman parte de la
API implementada; el resto de la tabla ya está disponible.

## Perfiles y sesión de demostración

La especificación de F4 distingue dos usuarios del brief:

| Perfil | Nombre visible | Puede escribir |
| ------ | -------------- | -------------- |
| `COMPRAS` | Responsable de compras | Sí: crea, edita y elimina elementos y relaciones |
| `PRODUCCION` | Coordinador de producción | No: solo consulta |

La sesión es **de demostración**: se elige un perfil con `POST /api/v1/sesion`, se recibe un token
opaco en memoria y se envía en la cabecera `Authorization: Bearer <token>` para escribir. No hay
contraseñas, no hay persistencia y las lecturas son abiertas. La autenticación real queda como
decisión pendiente (`AMB-F4-01`).

La autorización se aplica en el backend: una escritura sin sesión responde `401` y una escritura con
el perfil de producción responde `403`; en ambos casos el catálogo no cambia. La interfaz solo
refleja el permiso y explica en lenguaje de negocio qué perfil se necesita.

## Tablero de abastecimiento (F4)

El tablero es la quinta sección y la vista inicial. No calcula nada: compone resultados reales de
`GET /grafo`, `GET /impacto/{id}`, `GET /plan-entrega` y `GET /orden-produccion`. Muestra el resumen
de la cadena, la red con la dirección `origen habilita destino`, el impacto del elemento
seleccionado, el plan de entrega y la alerta de ciclos, y resalta la consulta relevante sobre el mapa.

Los cuatro escenarios de aceptación se ejecutan contra el backend real: cadena válida, elemento
inexistente, dato inválido y ciclo. La especificación completa está en
[`docs/requirements.md`](docs/requirements.md) §13 y los criterios en
[`docs/acceptance-criteria.md`](docs/acceptance-criteria.md) §11.

## Qué significa «alcanzar»

En este proyecto, **alcanzar** un elemento significa que existe un **camino dirigido** desde el
elemento consultado hasta ese elemento, siguiendo las aristas en la dirección definida: el `origen`
**habilita** al `destino`. Cada flecha se lee «para producir o preparar el destino, necesito que el
origen esté disponible».

Con esa dirección, el recorrido propio del proyecto avanza **hacia delante** desde el elemento
consultado. Los elementos así alcanzados son los **afectados** por su indisponibilidad: sus
dependientes directos e indirectos. Los elementos que lo habilitan son sus **requisitos previos** y
no se ven afectados por su indisponibilidad, así que no aparecen entre los afectados.

Ejemplo con la red sintética: si el proveedor de acero (`PROV-ACERO`) está indisponible, quedan
afectados la barra de acero (`INS-BARRA`), el tornillo hexagonal (`INS-TORNILLO`), el proceso de
corte (`PROC-CORTE`), el panel de montaje (`PROD-PANEL`) y el banco de montaje (`PROD-BANCO`).

La dirección es única y no se invierte nunca: el mismo sentido de recorrido sirve para el análisis de
impacto y para el orden de preparación. El significado también está documentado en
[`docs/graph-model.md`](docs/graph-model.md), sección 8.

## Convenciones

Backend en `snake_case`, frontend en `camelCase` para funciones y variables y `PascalCase` para
componentes y tipos. El JSON de la API usa `lowerCamelCase`; la traducción ocurre en la capa de
infraestructura del backend y no se propaga al dominio. El detalle está en
[`docs/architecture.md`](docs/architecture.md#31-frontera-entre-el-código-python-y-el-json-de-la-api).