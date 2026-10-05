# AbastecePyme

Solución para una pequeña empresa manufacturera que permite registrar proveedores, insumos,
productos y procesos, declarar sus dependencias y visualizar la red de abastecimiento.

Los datos del proyecto son **sintéticos**: no corresponden a personas, proveedores ni operaciones
reales.

## Documentación

| Documento | Contenido |
| --------- | --------- |
| [`docs/brief.md`](docs/brief.md) | Fuente de verdad de necesidades, alcance y reglas de negocio |
| [`docs/requirements.md`](docs/requirements.md) | Requisitos funcionales y no funcionales de F1, trazabilidad y decisiones pendientes |
| [`docs/graph-model.md`](docs/graph-model.md) | Dirección de las aristas y representación del grafo |
| [`docs/api-contract.md`](docs/api-contract.md) | Contrato REST, validaciones y catálogo de errores |
| [`docs/architecture.md`](docs/architecture.md) | Capas, responsabilidades y convenciones |
| [`docs/acceptance-criteria.md`](docs/acceptance-criteria.md) | Criterios de aceptación y casos límite |
| [`docs/decisions/`](docs/decisions) | Registro de decisiones por agente |

## Estado del proyecto

Implementada únicamente la **F1 — Catálogo de dependencias**: alta y consulta de elementos y
dependencias, y visualización de la red. F2 (análisis de impacto), F3 (orden de producción y ciclos)
y F4 (tablero integrado) están especificadas en el brief pero no implementadas.

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

Arranca con el conjunto sintético de demostración de F1. Los datos viven en memoria, por lo que se
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

## API de F1

| Método | Ruta | Descripción |
| ------ | ---- | ----------- |
| `POST` | `/api/v1/elementos` | Crear un elemento del catálogo |
| `GET` | `/api/v1/elementos` | Listar elementos, con filtro opcional por `tipo` |
| `GET` | `/api/v1/elementos/{id}` | Consultar un elemento |
| `POST` | `/api/v1/dependencias` | Registrar una dependencia dirigida |
| `GET` | `/api/v1/dependencias` | Listar dependencias, con filtro por `origen` o `destino` |
| `GET` | `/api/v1/grafo` | Obtener la representación del grafo |

El detalle de los campos, los códigos de estado y el catálogo de errores están en
[`docs/api-contract.md`](docs/api-contract.md).

## Convenciones

Backend en `snake_case`, frontend en `camelCase` para funciones y variables y `PascalCase` para
componentes y tipos. El JSON de la API usa `lowerCamelCase`; la traducción ocurre en la capa de
infraestructura del backend y no se propaga al dominio. El detalle está en
[`docs/architecture.md`](docs/architecture.md#31-frontera-entre-el-código-python-y-el-json-de-la-api).