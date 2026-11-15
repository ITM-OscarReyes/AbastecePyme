# Guía Maestra de Exposición — Feature 4: Tablero de Abastecimiento Integrado y Gobernanza de Perfiles

Documento de preparación para la sustentación y exposición de la **Feature 4 (F4)** de **AbastecePyme**.
Cubre: puesta en marcha, valor de negocio, cambios técnicos en backend y frontend, guion paso a paso de navegación («dónde dar clic y qué decir») y respuestas a preguntas técnicas de evaluación.

---

## 1. Puesta en Marcha Rápida (Comandos de Ejecución)

El sistema opera con arquitectura desacoplada: **Backend (FastAPI)** y **Frontend (React + Vite)** en dos terminales independientes.

### Terminal 1: Backend (Python 3.12+)
Abrir una terminal de PowerShell en la raíz del proyecto:
```powershell
cd backend
.\.venv\Scripts\activate
uvicorn app.main:app --reload --port 8000
```
* **URL Backend**: `http://127.0.0.1:8000`
* **Swagger / Contrato API**: `http://127.0.0.1:8000/docs`
* *Nota*: Al iniciar, el backend precarga en memoria el catálogo de demostración de **27 elementos y 37 dependencias** (líneas de manufactura de metal y madera).

### Terminal 2: Frontend (Node.js + React + TypeScript)
Abrir una segunda terminal en la raíz del proyecto:
```powershell
cd frontend
npm run dev
```
* **URL Aplicación Web**: `http://localhost:3000`
* *Nota*: El frontend incluye un proxy en Vite que reenvía automáticamente cualquier llamada a `/api/*` hacia `http://127.0.0.1:8000`.

---

## 2. Resumen Ejecutivo: ¿Qué es la Feature 4 y qué problema resuelve?

### El Reto de Negocio
Hasta la Feature 3, el sistema contaba con módulos independientes:
* **F1**: Catálogo de elementos y mapa visual de la cadena.
* **F2**: Análisis de impacto ante roturas o fallas.
* **F3**: Cálculo de orden de preparación (DAG) y detección de cuellos de botella por ciclos.

Sin embargo, el gerente de planta y el responsable de compras tenían que navegar de pestaña en pestaña para entender la situación. Además, **cualquier usuario podía modificar o borrar componentes críticos**, lo cual representaba un riesgo operativo para una empresa manufacturera real.

### La Solución de la Feature 4 (F4)
1. **Tablero de Control de Abastecimiento Unificado**: Una cabina de mando como vista inicial que integra en tiempo real los datos del catálogo (F1), el análisis de impacto (F2) y el diagnóstico de producción (F3) **sin crear un endpoint monolítico agregador** y **sin duplicar algoritmos en el cliente**.
2. **Gobernanza y Perfiles Operativos Diferenciados**:
   * **`Responsable de compras` (`COMPRAS`)**: Puede gestionar proveedores, dar de alta insumos, registrar relaciones y editar o eliminar componentes.
   * **`Coordinador de producción` (`PRODUCCION`)**: Modo de consulta y planificación; evalúa impactos y pedidos pero tiene restringida la modificación del catálogo para proteger la continuidad de la planta.
3. **Escenarios de Aceptación Demostrables**: Capacidad de verificar en vivo cadena válida, elemento inexistente, validación de permisos y detección de dependencias circulares con datos sintéticos auditables.

---

## 3. ¿Cuáles fueron los Cambios Técnicos Específicos para esta F4?

### En el Backend (`backend/`)
* **Modelo de Dominio (`app/dominio/sesion.py`)**:
  * Entidad `Sesion` con token opaco generado en memoria criptográficamente y perfil asociado.
* **Capa de Aplicación (`app/aplicacion/perfiles.py` y `casos_de_uso.py`)**:
  * `Perfil`: Clase inmutable con `id`, `nombre` y `puede_escribir`.
  * `PERFILES_DISPONIBLES`: `COMPRAS` (`puede_escribir=True`) y `PRODUCCION` (`puede_escribir=False`).
  * Casos de uso: `ListarPerfiles`, `AbrirSesion`, `ObtenerSesion`, `CerrarSesion`, `AutorizarEscritura`.
* **Infraestructura (`app/infraestructura/almacen_sesiones.py`)**:
  * `AlmacenSesionesMemoria`: Repositorio en memoria que almacena y valida tokens opacos de demostración.
* **Capa API REST (`app/api/rutas.py`)**:
  * Nuevos endpoints:
    * `GET /api/v1/perfiles`: Retorna los perfiles disponibles y sus capacidades.
    * `POST /api/v1/sesion`: Recibe `{ "perfil": "COMPRAS" | "PRODUCCION" }` y emite un token de sesión.
    * `GET /api/v1/sesion`: Describe la sesión activa según cabecera `Authorization: Bearer <token>`.
    * `DELETE /api/v1/sesion`: Cierra la sesión e invalida el token.
  * Guardia de autorización `_autorizar_escritura()`: Inyectada en `POST /elementos`, `PUT /elementos/{id}`, `DELETE /elementos/{id}`, `POST /dependencias`, etc. Si no hay sesión emite `401 ERR-11`; si la sesión es `PRODUCCION` emite `403 ERR-12`.

### En el Frontend (`frontend/`)
* **Tipos del Contrato (`src/types/index.ts`)**:
  * Incorporación de `Perfil`, `PerfilId`, `PerfilesRespuesta`, `SesionRespuesta` y `EntradaSesionDto`.
  * Expansión de `TabActiva = 'tablero' | 'red' | 'catalogo' | 'impacto' | 'produccion'`.
* **Servicio de API (`src/services/api.ts`)**:
  * Almacenamiento del token de sesión en memoria (`tokenSesionActual`).
  * Interceptor Axios para inyectar automáticamente `Authorization: Bearer <token>` en todas las peticiones salientes.
  * Métodos `obtenerPerfiles()`, `crearSesion()`, `obtenerSesion()`, `cerrarSesion()`.
* **Nueva Vista: `VistaTablero.tsx` (`src/components/VistaTablero.tsx`)**:
  * 5 Tarjetas KPI principales (Proveedores, Insumos con alertas de stock, Procesos, Productos, Conexiones).
  * Bloque de Continuidad Operativa (muestra estado DAG de planta o alerta de ciclos bloqueantes).
  * Bloque de Plan de Entrega Rápido (selección de productos finales y visualización secuencial).
  * Bloque de Alertas de Suministros Críticos (insumos bajo stock mínimo).
  * Módulo In-Situ de Análisis de Impacto (evalúa la cascada de afectación sin cambiar de pantalla).
  * Sección de Escenarios de Demostración Operativa.
* **Barra de Navegación (`src/components/HeaderNavbar.tsx`)**:
  * Pestaña *"Tablero"* como primera opción (atajo de teclado `0`).
  * Selector desplegable de Perfiles (`COMPRAS` vs `PRODUCCION`) con indicador visual de modo ("Edición permitida" vs "Solo consulta").
  * Botones *"Nuevo Componente"* y *"Crear relación"* con deshabilitación condicional y tooltip de seguridad si se está en perfil de consulta.
* **Protección en Modales y Paneles (`PanelDetalleNodo.tsx` y `ModalDetalleElemento.tsx`)**:
  * Restricción de botones de edición y eliminación si el usuario no tiene rol `COMPRAS`.
* **Guía de Usuario (`src/components/ModalAyudaOperativa.tsx`)**:
  * Incorporación de la explicación de roles operativos y atajos rápidos de navegación `0` a `4`.
* **Orquestación en `App.tsx`**:
  * Inicialización automática de sesión en arranque (`tabActiva = 'tablero'`).
  * Atajo de teclado global `0` para saltar al Tablero.

---

## 4. Guion Paso a Paso para la Exposición (Qué Hacer y Qué Decir)

### Minuto 0:00 - 1:00 | Introducción y Pantalla de Inicio
* **Acción**: Abrir el navegador en `http://localhost:3000`.
* **Qué mostrar**: Señalar que la aplicación abre directamente en la sección **Tablero** (o pulsar la tecla `0` en el teclado para demostrar el atajo).
* **Qué decir**:
  > *"Buenos días / tardes. Para esta entrega de la Feature 4, nos enfocamos en resolver dos necesidades fundamentales de la pequeña empresa manufacturera: **visibilidad integral** y **gobernanza operativa**.*
  > *Anteriormente contábamos con el catálogo de dependencias, el análisis de impacto y el orden de producción en vistas separadas. En F4 creamos el **Tablero de Control de Abastecimiento**, que consolida toda la información crítica en una única pantalla de comando en tiempo real."*

### Minuto 1:00 - 2:30 | Explicación de los KPIs y Arquitectura de Composición
* **Acción**: Apuntar a las tarjetas superiores: Proveedores (2), Insumos (13), Procesos (6), Productos (6) y Conexiones (37).
* **Qué mostrar**: El insumo con alerta de stock (marcado en rojo *"1 bajo mín."*).
* **Qué decir**:
  > *"Aquí vemos el pulso de la fábrica: cuántas fuentes externas tenemos, qué materias primas están activas, cuántas estaciones de trabajo operan y cuántos productos terminados podemos despachar.*
  > *Un aspecto arquitectónico crucial: **el frontend no inventa datos ni duplica algoritmos**. No hay cálculos de grafos hechos en JavaScript. La vista consume directamente los endpoints del backend (`/grafo`, `/orden-produccion`, `/plan-entrega`, `/impacto`), componiéndolos de forma reactiva y asíncrona sin sobrecargar el servidor con endpoints agregadores innecesarios."*

### Minuto 2:30 - 4:00 | Demostración de Perfiles y Control de Acceso (F4 Core)
* **Acción**:
  1. Mostrar en la esquina superior derecha el badge del perfil activo: **Responsable de compras** (icono azul con *"Edición permitida"*).
  2. Señalar los botones **"Nuevo Componente"** y **"Crear relación"**: están activos y listos para interactuar.
  3. Hacer clic en el selector de perfil y cambiar a **Coordinador de producción**.
  4. Observar cómo el badge cambia a verde con *"Solo consulta"*, y los botones de alta pasan a estar deshabilitados con el tooltip: *"Acción restringida: solo disponible para Responsable de compras"*.
* **Qué decir**:
  > *"Uno de los requisitos solicitados por el docente para F4 fue: 'no cualquiera puede modificar la cadena'.*
  > *Implementamos un sistema de demostración basado en roles: el **Responsable de compras** tiene autorización para alterar el catálogo y crear conexiones; mientras que el **Coordinador de producción** entra en modo consulta.*
  > *Esto no es solo cosmético en pantalla: el backend valida en cada petición de escritura (`POST`, `PUT`, `DELETE`) un token de sesión en la cabecera `Authorization: Bearer <token>`. Si alguien intentara enviar una modificación sin el perfil de compras, el backend rechaza la transacción con código `403 ERR-12` sin alterar la base de datos."*

### Minuto 4:00 - 5:30 | Diagnóstico de Planta y Plan de Entrega (F3 integrado en Tablero)
* **Acción**:
  1. Mirar la tarjeta izquierda *"Diagnóstico General de Planta"*. Mostrar el veredicto en verde: *"Cadena sin dependencias circulares — 25 pasos de preparación óptimos"*.
  2. En el panel inferior *"Plan de Entrega por Producto"*, hacer clic en el chip **"Mesa de trabajo metálica"** o **"Escritorio"**.
  3. Ver cómo se despliega la secuencia exacta de operaciones (corte, soldadura, ensamble) y su estado *"Viable para entrega"*.
* **Qué decir**:
  > *"Desde el mismo tablero el coordinador puede verificar la viabilidad de un pedido específico. Al tocar un producto, el sistema consulta el plan de entrega en tiempo real y enumera el paso a paso necesario para cumplir la orden de trabajo.*
  > *Si existiera una dependencia circular en la fábrica, este panel alertaría inmediatamente en rojo indicando qué productos quedan bloqueados y qué circuito cerrado está impidiendo la producción."*

### Minuto 5:30 - 7:00 | Alertas de Stock y Evaluación de Impacto In-Situ (F2 integrado en Tablero)
* **Acción**:
  1. Ir a la columna derecha: *"Alertas de Suministro y Stock"*.
  2. Mostrar el insumo con stock crítico (por ejemplo, `INS-BARNIZ` o láminas de acero).
  3. Hacer clic en el botón amarillo **"Impacto"** al lado del insumo.
  4. Observar cómo en la caja inferior *"Consulta Rápida de Impacto"* se evalúa al instante: muestra cuántos procesos y productos finales se verían paralizados por ese suministro.
  5. Hacer clic en *"Ver en el mapa"*: la app navega limpiamente a la sección de Cadena resaltando el elemento.
* **Qué decir**:
  > *"Aquí vemos la integración con F2: el encargado de compras detecta un material bajo mínimo y con un solo clic evalúa la cascada de impacto. El sistema le dice: 'si este insumo falta, se frenan 3 procesos y 2 productos terminados'.*
  > *Además, distingue con total precisión cuando un producto es terminal y no afecta a nadie más, de cuando un elemento no existe o tiene datos mal formados, respondiendo siempre en lenguaje de negocio de planta."*

### Minuto 7:00 - 8:00 | Conclusiones y Cierre
* **Qué decir**:
  > *"En conclusión, la Feature 4 culmina el ciclo del producto AbastecePyme: logramos una solución modular, responsive (desde móviles de 360px hasta monitores 4K), con arquitectura limpia y principios SOLID, donde cada agente aportó a una suite de pruebas automatizadas con 100% de éxito y cero errores de compilación. Quedo atento a sus preguntas."*

---

## 5. Preguntas Frecuentes y Respuestas Técnicas para el Jurado

### P1: ¿Por qué no crearon un endpoint único `GET /api/v1/tablero` en el backend?
* **Respuesta**:
  > *"Por principio de Responsabilidad Única e Inversión de Dependencias (SOLID). Un endpoint agregador obligaría al backend a acoplar múltiples casos de uso en una sola estructura monolítica. Si el cálculo de impacto o de plan cambiara, afectaría al tablero completo. Al componer modularmente desde el cliente las rutas `/grafo`, `/orden-produccion`, `/plan-entrega` e `/impacto`, cada widget del tablero tiene su propio ciclo de vida, su propio spinner de carga y su propio manejo de fallos sin bloquear la interfaz."*

### P2: ¿El frontend implementa algoritmos de grafos o cálculo de caminos?
* **Respuesta**:
  > *"No. La regla del proyecto prohíbe taxativamente implementar algoritmos de grafo (Kahn, Tarjan SCC, DFS) en el frontend. Toda la lógica matemática reside en la capa de dominio de Python (`backend/app/dominio/catalogo.py`). El frontend se limita estrictamente a la presentación y mapeo visual de los identificadores devueltos por la API."*

### P3: ¿Cómo funciona la seguridad de perfiles y sesiones?
* **Respuesta**:
  > *"Es una sesión de demostración en memoria diseñada específicamente para cumplir con el alcance del brief sin inventar un sistema de autenticación complejo de contraseñas. El cliente invoca `POST /api/v1/sesion` enviando el perfil deseado (`COMPRAS` o `PRODUCCION`). El servidor genera un token opaco y lo guarda en memoria. Las solicitudes de modificación incluyen este token en la cabecera estándar `Authorization: Bearer <token>`. La función `_autorizar_escritura()` en el enrutador valida el permiso antes de ejecutar cualquier mutación del catálogo."*

### P4: ¿Cómo probaron la calidad del código?
* **Respuesta**:
  > *"Contamos con pruebas en múltiples niveles:
  > 1. **Pruebas de Arquitectura estática (`arquitectura.test.ts`)**: 17 pruebas que inspeccionan el código fuente verificando que no existan variables en snake_case, ni palabras prohibidas, ni algoritmos duplicados, ni datos sintéticos quemados.
  > 2. **Pruebas de Contrato (`tableroYSesion.test.ts` y `ordenProduccion.test.ts`)**: Validan que los interceptores de Axios envíen los encabezados correctos y procesen las respuestas de la API.
  > 3. **Compilación de Producción**: Verificada con Vite y TypeScript strict mode con 0 errores."*
