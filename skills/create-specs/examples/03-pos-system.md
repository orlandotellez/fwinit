# Prompt de specs — POS System (multitenancy, Fastify + Prisma, escritorio Tauri)

Uso: pegá este prompt después de `/create-specs`.

> /create-specs Generá las specs del siguiente proyecto.
>
> **Proyecto**: **POS System** — sistema de **Punto de Venta (POS)** completo, **full stack**, **multi-tenant**. Backend API REST en **Node.js + Fastify + Prisma** sobre **PostgreSQL**, y un frontend **React + Vite** con **dual target**: navegador web y escritorio **Tauri**. Orientado a pequeños y medianos comercios que necesitan gestionar productos, inventario, ventas, servicios compuestos, proveedores y configuración de su tienda.
>
> ---
>
> ## 0. Contexto del repositorio (leer antes de generar)
>
> El repositorio **puede tener ya un árbol `specs/`** generado previamente. Antes de escribir nada:
>
> 1. Leé `specs/docs/01-descripcion-proyecto.md` y `specs/docs/02-ejecucion-local.md` si existen, para no duplicar ni contradecir lo ya escrito.
> 2. **No borres ni sobrescribas** archivos de specs existentes sin aprobación explícita. Actualizá en el lugar, agregá lo que falta y creá solo los archivos nuevos que la descripción de abajo justifique.
> 3. El árbol final debe quedar con esta forma: `docs/` (01-descripcion-proyecto, 02-ejecucion-local, 03-requisitos-del-producto), `modules/backend/`, `modules/db/`, `modules/frontend/`, `modules/api/`, y `tasks/` con un archivo por área de funcionalidad (nunca vacío).
>
> ---
>
> ## 1. STACK TECNOLÓGICO
>
> | Capa | Tecnología | Versión |
> |---|---|---|
> | Backend | Node.js + Fastify | 5.x |
> | ORM | Prisma | 6.x |
> | Base de datos | PostgreSQL | 16+ |
> | Frontend | React + Vite + TypeScript | 18.x |
> | UI kit | Radix UI (themes) | — |
> | Routing cliente | React Router | 6.x |
> | Desktop wrapper | Tauri | 2.x |
> | Cache | Redis (opcional) | — |
>
> El monorepo tiene dos directorios principales:
>
> - `backend-fastify/` — API REST (Fastify + Prisma), organizado por módulos en `src/modules/<feature>/` con capas `domain`, `application`, `presentation` e `infrastructure`. Las rutas se registran todas desde `src/presentation/routes.ts` y el server en `src/server.ts`.
> - `frontend/` — SPA React + Vite, mismo código para navegador y Tauri.
>
> El schema de base de datos vive en `backend-fastify/prisma/schema.prisma` y es la fuente de verdad del modelo de datos.
>
> `GET /health` vive **fuera** de `/api/v1` y devuelve el estado del servicio: versión, uptime, estado de la conexión a PostgreSQL y (si está habilitado) de Redis. Es el endpoint que usan despliegues y balanceadores para decidir si la instancia responde.
>
> ---
>
> ## 2. CONVENCIONES TRANSVERSALES DE LA API
>
> - **Prefijo**: todos los endpoints de negocio bajo `/api/v1`.
> - **Auth**: cookies `httpOnly` `accessToken` (15 min) y `refreshToken` (7 días). `sameSite=strict` en producción, `lax` en desarrollo. Nunca devolver tokens en el body de la respuesta.
> - **Content-Type**: `application/json`. No hay uploads ni multipart en el alcance actual.
> - **Errores**: `{ "message": "..." }` con status code apropiado — 400 (validación de forma), 401 (sin sesión o token inválido), 403 (rol insuficiente), 404 (no existe o no pertenece al store), 409 (conflicto de unicidad: barcode duplicado), 422 (regla de negocio violada: stock insuficiente, último admin), 429 (rate limit), 500 (fallo no previsto). Nunca filtrar stack traces ni detalle interno de SQL.
> - **Paginación**: todos los LIST devuelven `{ items: [...], total, page, limit, hasMore }`. `page` es 1-based, `limit` por defecto 20, máximo 100. `total` es el total del filtro aplicado, no del catálogo completo.
> - **Multi-tenancy**: **toda** query de negocio se filtra por `store_id` derivado de la sesión, nunca por un parámetro del request. `storeGuard` rechaza requests sin contexto de tienda, y un `adminGuard` rechaza requests de un rol sin permiso. Cada endpoint debe declarar qué guard aplica.
> - **Dinero**: todos los importes (`price`, `cost`, `subtotal`, `total`, `discount`, `tax`) son `DECIMAL(10,2)` en PostgreSQL. En el JSON de la API viajan como **string decimal con punto** (`"1250.50"`), nunca float binario. El frontend **nunca** suma ni resta importes en `number`: todo cálculo de totales vive en el backend y el cliente solo formatea.
> - **Fechas**: ISO 8601 UTC en la API (`"2026-09-25T14:03:00Z"`), formato local solo en la capa de presentación. Timestamps en `TIMESTAMPTZ`.
> - **Soft-delete**: `product`, `category`, `supplier` y `service` usan `deleted_at TIMESTAMPTZ`. Las entidades de histórico (`sale`, `sale_item`, `inventory_movement`, `inventory_batch`) **no** se borran nunca.
>
> | Recurso | `admin` | `cajero` |
> |---|---|---|
> | `POST /auth/register-store` | sí (público) | n/a |
> | login, logout, refresh, verify-email, resend, forgot/reset password | sí | sí |
> | `POST /auth/register` (crear cajeros) | sí | no |
> | `GET /users`, `GET /users/:id`, `POST /users`, `PUT /users/:id`, `DELETE /users/:id` | sí | no |
> | `/products` (CRUD) | sí | sí |
> | `GET /categories` | público (sin auth) | público |
> | `/services` (CRUD) | sí | sí |
> | `/sales` (alta, listado, detalle, reportes) | sí | sí |
> | `/inventory` y `/inventory/batches` | sí | sí |
> | `/suppliers` (CRUD) | sí | sí |
> | `GET /settings`, `PUT /settings` | sí | sí |
>
> ---
>
> ## MÓDULO 1 — AUTENTICACIÓN Y TIENDAS (multi-tenant)
>
> ### Pantallas
>
> 1. **Crear tienda** (`/register-store`, pública): nombre de la tienda, nombre del administrador, email, contraseña (mín. 8 caracteres), confirmación, teléfono del negocio opcional, ciudad. Al terminar redirige a `/login` con un mensaje de éxito. Es el **único** punto de entrada al sistema para un comercio nuevo.
> 2. **Login** (`/login`): email + contraseña. Dos pasos si el email no está verificado (ver 3). Errores distintos para credenciales inválidas vs email sin verificar. En escritorio soporta `Cmd/Ctrl+L` para enfocar el usuario.
> 3. **Verificar email** (`/verify-email`): input de **código de 6 caracteres** (alfanumérico, sin distinguir mayúsculas), opción "reenviar código" con cooldown de 60s. Campo auto-focus, mayúsculas forzado, sin espacios.
> 4. **Olvidé mi contraseña** (`/forgot-password`): email → mensaje neutro ("si el email existe, te enviamos un código") → pantalla de `reset-password` con código, nueva contraseña y confirmación.
> 5. **Sesiones activas** (dentro de Configuración): tabla con dispositivo, navegador, IP, última actividad, sesión actual marcada, botón revocar por fila.
>
> ### Reglas de negocio
>
> - `POST /auth/register-store` es **transaccional y atómico**: crea `store` + `user` (rol `admin`) + `settings` con valores por defecto, o no crea nada.
> - El código de verificación de email tiene **6 caracteres**, expira en **15 minutos** y es de **un solo uso**. El código de reseteo de contraseña se emite bajo la clave `reset:<email>` para que ambos flujos no colisionen.
> - El login no revela si un email existe: mensaje único para credenciales inválidas.
> - **Rotación de refresh**: cada `POST /auth/refresh` revoca la sesión vieja y crea una sesión nueva con tokens nuevos. Reutilizar un refresh ya revocado revoca **toda** la familia de sesiones del usuario (detección de robo de token).
> - Rate limit: 5 intentos de login por email+IP en 15 minutos → 429. 3 envíos de código de verificación por hora.
> - Contraseñas con hash **bcrypt** (costo 12). Nunca se edita una contraseña por `PUT /users/:id` — el reseteo pasa siempre por forgot/reset.
> - Un usuario soft-deleted no puede iniciar sesión ni refrescar token.
>
> ### Endpoints
>
> `POST /api/v1/auth/register-store` (público) · `POST /api/v1/auth/register` (admin) · `POST /api/v1/auth/login` · `POST /api/v1/auth/refresh` · `POST /api/v1/auth/logout` · `POST /api/v1/auth/verify-email` · `POST /api/v1/auth/resend-verification` · `POST /api/v1/auth/forgot-password` · `POST /api/v1/auth/reset-password` · `GET /api/v1/auth/sessions` · `DELETE /api/v1/auth/sessions/:id`
>
> ---
>
> ## MÓDULO 2 — USUARIOS (solo `admin`)
>
> ### Pantallas
>
> 1. **Listado de usuarios**: tabla con nombre, email, rol (badge), estado (activo / eliminado lógicamente), fecha de alta; buscador con debounce; paginación server-side; botón "nuevo usuario".
> 2. **Formulario de usuario** (crear/editar): nombre, email, rol (`admin` | `cajero`), contraseña (solo al crear, con reglas visibles en vivo), teléfono opcional, activo/inactivo. Al crear se envía la verificación de email. El email es único **dentro del store**, no global.
> 3. **Detalle de usuario**: datos, rol, última actividad, sesión actual, acciones de editar y desactivar.
> 4. **Confirmación de baja**: el usuario **no se borra físicamente** — se marca `deleted_at`. El diálogo explica qué pasa con sus ventas históricas (se conservan con su nombre) y que puede cancelarse dentro de los 30 días.
>
> ### Reglas de negocio
>
> - El último `admin` activo de un store no se puede degradar ni desactivar: 422 con mensaje explícito (evita dejar la tienda sin administración).
> - Un usuario no puede eliminarse a sí mismo.
> - No existe endpoint para cambiar la contraseña: solo forgot/reset.
> - Un `cajero` nunca alcanza los endpoints de usuarios: 403.
>
> ### Endpoints
>
> `GET /api/v1/users` (filtros `search`, paginación) · `GET /api/v1/users/:id` · `POST /api/v1/users` · `PUT /api/v1/users/:id` · `DELETE /api/v1/users/:id`
>
> ---
>
> ## MÓDULO 3 — PRODUCTOS Y CATEGORÍAS
>
> ### Pantallas
>
> 1. **Listado de productos** (pantalla de trabajo del admin): tabla densa con imagen/ícono, nombre, código de barras, categoría, proveedor, precio, costo, **stock actual** y **estado de stock** (badge: `ok` / `bajo` / `agotado`). Filtros combinables: búsqueda por nombre o código, categoría, solo activos, solo bajo stock, solo agotados. Paginación server-side. Acciones por fila: editar, duplicar, desactivar, eliminar.
> 2. **Formulario de producto** (crear/editar): nombre, descripción, código de barras (único en el store, escaneo directo con lector), categoría, proveedor, **precio** y **costo** (2 decimales, teclado numérico en escritorio), **stock inicial** (solo al crear), **stock mínimo** (umbral de alerta de bajo stock), unidad de medida, activo. Aviso en vivo de si el código de barras ya existe.
> 3. **Detalle de producto**: datos, categoría y proveedor resueltos, stock actual, últimos 10 movimientos de inventario, ventas de las últimas 4 semanas, acciones de ajuste rápido de stock.
> 4. **Gestor de categorías** (pestaña dentro de Productos): tabla con nombre, slug, cantidad de productos asociados, estado; alta y edición en línea; borrado lógico. `GET /categories` es **público** porque el formulario de producto lo necesita.
> 5. **Escaneo de código de barras** (integrado en el formulario y en la caja): el input de búsqueda acepta el código escaneado y resuelve a la ficha del producto en menos de 300ms, con foco automático de vuelta al campo de búsqueda.
>
> ### Reglas de negocio
>
> - Código de barras **único por store**, ignorando productos soft-deleted. Repetirlo devuelve 409.
> - `PUT /products/:id` acepta `null` explícito en `category_id` y `supplier_id` para **desenlazar** la relación. La spec debe documentar que `null` y "campo no enviado" significan lo mismo: desvinculan.
> - `DELETE` es **soft-delete** (`deleted_at`): el producto desaparece de los listados y de la caja, pero las ventas y los movimientos históricos lo conservan.
> - `low_stock` = `stock > 0 AND stock <= stock_min`; `out_of_stock` = `stock <= 0`. Un producto con `stock_min = 0` nunca aparece como bajo stock.
> - `GET /products/:id` incluye `category` y `supplier` **resumidos** (id + nombre), nunca el objeto completo.
> - El stock del producto **nunca se actualiza directamente**: todo cambio pasa por un movimiento de inventario (ver Módulo 6). `POST /products` con stock inicial es el único caso que escribe stock, y genera su movimiento de tipo `entrada`.
>
> ### Endpoints
>
> `GET /api/v1/products` (filtros `search`, `category_id`, `active`, `low_stock`, `out_of_stock`, paginación) · `GET /api/v1/products/:id` · `GET /api/v1/products/barcode/:barcode` · `POST /api/v1/products` · `PUT /api/v1/products/:id` · `DELETE /api/v1/products/:id` · `GET /api/v1/categories` (**público, sin auth**) · `POST /api/v1/categories` · `PUT /api/v1/categories/:id` · `DELETE /api/v1/categories/:id`
>
> ---
>
> ## MÓDULO 4 — SERVICIOS COMPUESTOS
>
> Un **servicio** es un producto vendido como paquete que **consume** otros productos del inventario (ej. "Corte + Barba + Lavado", "Combo familiar" que consume 2 bebidas + 1 pan + 1 pollo). Es lo que diferencia a un POS de servicios de un POS de retail puro.
>
> ### Pantallas
>
> 1. **Listado de servicios**: tabla con nombre, precio, cantidad de productos que consume, activo. Filtros `search` y `active`.
> 2. **Formulario de servicio**: nombre, descripción, precio, activo, y un **editor de productos consumidos** (filas con producto, cantidad y stock disponible; agregar/quitar filas; validación de stock al guardar).
> 3. **Detalle de servicio**: datos + tabla de `service_products` con producto y cantidad consumida, más el stock que tendría si se vendiera completo.
>
> ### Reglas de negocio
>
> - Un producto **no puede consumirse a sí mismo** dentro de un servicio (422).
> - La cantidad consumida es un entero **≥ 1**, y un mismo producto no se repite dentro del mismo servicio.
> - Borrado de servicio es **soft-delete**; los servicios ya vendidos siguen legibles en las ventas históricas.
> - Al vender un servicio, el descuento de stock es la cantidad de `service_products` multiplicada por las unidades vendidas — salvo override explícito (ver Módulo 5).
>
> ### Endpoints
>
> `GET /api/v1/services` (filtros `search`, `active`) · `GET /api/v1/services/:id` (incluye `service_products[]` con cantidad) · `POST /api/v1/services` · `PUT /api/v1/services/:id` · `DELETE /api/v1/services/:id`
>
> ---
>
> ## MÓDULO 5 — VENTAS (POS) — la pantalla más importante del sistema
>
> ### Pantallas
>
> 1. **Caja / POS** (`/pos`, pantalla principal del cajero): layout de dos paneles.
>    - **Izquierda — catálogo**: buscador con foco permanente (acepta escaneo de código de barras), filtros rápidos por categoría, grilla de productos con precio y stock, y una fila de productos **favoritos / frecuentes** arriba.
>    - **Derecha — ticket en construcción**: líneas con producto, cantidad editable, precio unitario, subtotal y botón de eliminar por línea; selector de **cantidad de servicio** cuando la línea es un servicio; selector de **override de productos** cuando la línea es un servicio (modo auto por catálogo o custom); resumen de **subtotal / descuento / total**; acciones masivas (descuento de línea, descuento general, limpiar ticket).
>    - **Barra inferior fija**: selector de **método de pago** (efectivo, tarjeta, transferencia, otro), campo de **recibido** (solo efectivo: calcula el vuelto en vivo), botón **COBRAR** (ancho, atajo `F2`), botón cancelar (`Esc`).
>    - Estados: ticket vacío con instrucción, cálculo de vuelto, venta en curso (spinner + bloqueo de inputs), venta confirmada.
> 2. **Confirmación de venta**: resumen imprimible del ticket con datos de la tienda y del cajero, opción de **imprimir** (impresora térmica; ver configuración en Módulo 9), botón "nueva venta" que limpia el ticket sin navegar.
> 3. **Listado de ventas**: tabla con fecha/hora, ticket nº, cajero, cantidad de líneas, método de pago y total. Filtros combinables: rango de fechas, cajero, método de pago. Paginación server-side. Clic en fila → detalle.
> 4. **Detalle de venta**: cabecera (nº, fecha, cajero, tienda, método de pago, impuestos, total), tabla de items regulares y bloque de **items de servicio** con el detalle de los productos que consumió cada uno. Todo en modo lectura: **una venta no se edita ni se borra** (ver reglas), y la UI no debe ofrecer esos botones.
> 5. **Reporte de ventas**: selector de rango de fechas, tarjetas de totales (ventas totales, cantidad de tickets, ticket promedio), ventas por método de pago, top productos con su participación.
> 6. **Tendencia de ingresos**: gráfico de líneas de ingresos por día / semana / mes dentro del rango elegido, con selector de agrupación.
>
> ### Reglas de negocio
>
> - `POST /sales` es **transaccional**: valida stock, crea la venta, sus items, sus items de servicio y **todos** los movimientos de inventario correspondientes, o no crea nada.
> - Una venta acepta **items regulares y de servicio mezclados** en el mismo payload.
> - Servicio con productos **auto**: el backend busca `service_products` y descuenta cantidad × unidades. Servicio con productos **custom** (override en el momento de la venta): el cliente declara qué productos y cuántas unidades consume cada uno y el backend **usa ese override, no el del catálogo**.
> - La validación de stock cubre **todos** los productos, regulares y de servicio. Stock insuficiente → **422**, y el mensaje dice exactamente qué producto falta y cuánto.
> - El **precio se congela en el momento de la venta**: `sale_items.price` guarda el precio unitario cobrado y `product_name` guarda el nombre, aunque el catálogo cambie después. El total histórico de una venta es inmutable.
> - Una venta **no se edita ni se elimina**; las correcciones se hacen con un movimiento de inventario de tipo `ajuste` y queda la traza.
> - Los reportes se calculan en **SQL** (agregaciones), nunca trayendo las ventas al frontend para sumar. `revenue-trend` agrupa por `day | week | month` y **rellena con cero** los intervalos sin ventas, para que el gráfico no tenga huecos.
> - Numeración de ticket **secuencial y única por store**.
> - Un cajero solo ve y opera las ventas de **su** tienda.
> - `POST /sales` acepta `Idempotency-Key` opcional: el mismo key repetido devuelve la venta ya creada en lugar de duplicar (evita el doble cobro por doble clic).
>
> ### Endpoints
>
> `POST /api/v1/sales` · `GET /api/v1/sales` (filtros `start_date`, `end_date`, `user_id`, `payment_method`, paginación) · `GET /api/v1/sales/:id` · `GET /api/v1/sales/report?start_date=&end_date=` · `GET /api/v1/sales/revenue-trend?start_date=&end_date=&group_by=day|week|month`
>
> ---
>
> ## MÓDULO 6 — INVENTARIO
>
> ### Pantallas
>
> 1. **Movimientos** (listado): tabla con fecha, producto, tipo (badge: entrada / salida / ajuste), cantidad con signo, stock resultante, usuario, lote asociado, nota. Filtros por producto y tipo de movimiento, paginación server-side.
> 2. **Historial por producto**: ficha de un producto con stock actual, stock mínimo, gráfico de evolución de stock y tabla completa de sus movimientos (entrada inicial, ventas, lotes, ajustes manuales). Acción **ajustar stock** desde esta pantalla.
> 3. **Bajo stock**: listado de productos debajo del umbral, ordenado por criticidad (relación stock/stock_min ascendente), con la cantidad sugerida de reposición y acceso directo al formulario de lote de entrada con ese producto precargado.
> 4. **Movimiento individual** (modal): producto, tipo (`entrada` | `salida` | `ajuste`), cantidad, stock final resultante (**calculado por el backend**, nunca por el cliente), nota opcional.
>
> ### Reglas de negocio
>
> - `entrada` suma, `salida` resta, `ajuste` **fija** el stock al valor indicado (y deja registrado el delta real en la nota). Ningún movimiento puede dejar el stock negativo salvo `ajuste` explícito a un valor ≥ 0.
> - **Todo cambio de stock pasa por `inventory_movement`.** No existe ningún endpoint que actualice `product.stock` directamente: el stock es siempre el último valor resultante de los movimientos del producto.
> - Cada movimiento registra el usuario que lo originó y, si viene de una venta, el `sale_id`; si viene de un lote, el `batch_id`.
> - `GET /inventory/low-stock` excluye productos con `stock_min = 0` y productos soft-deleted.
>
> ### Endpoints
>
> `GET /api/v1/inventory` (filtros `product_id`, `movement_type`, paginación) · `GET /api/v1/inventory/product/:id` · `POST /api/v1/inventory` · `GET /api/v1/inventory/low-stock`
>
> ---
>
> ## MÓDULO 7 — INVENTARIO POR LOTES (batch)
>
> Un **lote** es un movimiento masivo de entrada, salida o ajuste sobre **varios productos a la vez** (compra a proveedor, corrección de conteo físico, merma). Crea un único registro agrupado, sus items, y un `inventory_movement` por producto, todo en una sola transacción.
>
> ### Pantallas
>
> 1. **Nuevo lote** (wizard): tipo de movimiento (`entrada` | `salida` | `ajuste`), proveedor (obligatorio en `entrada`, opcional en el resto), fecha, nota, y un **editor de items**: agregar producto (búsqueda por nombre o código de barras), cantidad por producto, y stock disponible/resultante calculado. Editable en línea, con validación por fila antes de enviar.
> 2. **Listado de lotes**: tabla con fecha, tipo, proveedor, cantidad de items, total de unidades, usuario. Filtros por tipo de movimiento y proveedor, paginación server-side.
> 3. **Detalle de lote**: cabecera + tabla de items con producto, cantidad, stock antes y stock después de cada item, y el resumen del efecto total del lote.
>
> ### Reglas de negocio
>
> - La creación del lote es **atómica**: si una sola fila falla (producto inexistente, cantidad inválida, stock insuficiente en una salida), **no** se crea ningún movimiento.
> - Un lote puede contener un mismo producto **una sola vez** (filas repetidas → 422).
> - El `movement_type` del lote se propaga a todos sus `inventory_movement`.
> - Un lote registra siempre su autor y es **inmutable**: no hay `PUT /batches/:id` ni `DELETE`. Para corregirlo se crea un lote de ajuste nuevo que lo referencia en la nota.
> - El impacto en el stock de cada item se muestra en el detalle **antes** de confirmar, calculado por el backend.
>
> ### Endpoints
>
> `POST /api/v1/inventory/batches` · `GET /api/v1/inventory/batches` (filtros `movement_type`, `supplier_id`, paginación) · `GET /api/v1/inventory/batches/:id`
>
> ---
>
> ## MÓDULO 8 — PROVEEDORES
>
> ### Pantallas
>
> 1. **Listado de proveedores**: tabla con nombre, contacto (teléfono/email), cantidad de productos asociados, estado (activo/inactivo). Filtros `search` e `is_active`, paginación.
> 2. **Formulario de proveedor**: nombre, razón social opcional, teléfono, email, dirección, contacto, activo.
> 3. **Detalle de proveedor**: datos, `_count.products` y listado de esos productos; acción directa "nuevo lote de entrada con este proveedor" (entra al Módulo 7 con el proveedor precargado).
>
> ### Reglas de negocio
>
> - Proveedor inactivo: sigue visible y sus lotes y productos históricos se conservan, pero **no aparece** en el selector al crear o editar un producto.
> - Borrado lógico (`deleted_at`): los productos que lo referencian conservan la relación en el histórico.
>
> ### Endpoints
>
> `GET /api/v1/suppliers` (filtros `search`, `is_active`, paginación) · `GET /api/v1/suppliers/:id` (incluye `_count.products`) · `POST /api/v1/suppliers` · `PUT /api/v1/suppliers/:id` · `DELETE /api/v1/suppliers/:id`
>
> ---
>
> ## MÓDULO 9 — CONFIGURACIÓN DEL NEGOCIO (settings)
>
> ### Pantallas
>
> 1. **Configuración** (pantalla única, seccionada):
>    - **Negocio**: nombre, dirección, teléfono, email, número de ticket siguiente.
>    - **Impuestos y tarifas**: porcentaje de impuesto, si los precios lo incluyen o no, valor de envío / delivery (si aplica).
>    - **Ticket**: encabezado con nombre y dirección, pie del ticket (mensaje del comercio), tamaño de papel (80mm / 58mm).
>    - **Impresora**: nombre/configuración de la impresora térmica, ancho de línea, mostrar logo, cortar papel automáticamente, vista previa del ticket en HTML.
>    - Guardar muestra el estado del resultado (guardado / error) y deshabilita el botón mientras guarda.
>
> ### Reglas de negocio
>
> - `GET /settings` devuelve la config del **store de la sesión**; si la fila no existe, `PUT` la crea (upsert) con los valores por defecto del store.
> - Los settings son **por store**, nunca globales.
> - Cambiar la configuración **no altera** ventas ya emitidas: precio e impuestos quedan congelados en la venta.
>
> ### Endpoints
>
> `GET /api/v1/settings` · `PUT /api/v1/settings`
>
> ---
>
> ## MÓDULO 10 — FRONTEND: shell, navegación y escritorio
>
> ### Shell de la aplicación
>
> - Layout de dos zonas: **sidebar** de navegación (fija, colapsable a iconos) + **contenido** con **header** (nombre de la tienda, cajero actual, acciones rápidas) y área de páginas.
> - Navegación: **POS · Ventas · Productos · Servicios · Inventario · Proveedores · Usuarios · Configuración** (Usuarios visible solo para `admin`). Ítem activo marcado de forma permanente, no solo por hover.
> - Logout siempre accesible, con **confirmación** si hay un ticket en construcción en el POS.
> - Manejo de sesión: expiración del `accessToken` → refresco silencioso; si el refresh falla → redirección a `/login` con aviso "tu sesión expiró".
> - Rutas protegidas: cualquier ruta bajo el shell requiere sesión y contexto de tienda; sin sesión se redirige a `/login`.
> - 404 y error 500 con páginas propias en el mismo sistema visual.
>
> ### Dual target: navegador y Tauri
>
> - El **mismo código** corre en los dos targets. Ninguna página puede asumir que existe `window.__TAURI__` sin comprobarlo.
> - La URL base de la API se resuelve por target: en web, desde variables de entorno; en escritorio, desde la configuración de la app (configurable en Ajustes, con valor por defecto `http://localhost:3000`), para que el mismo build de escritorio apunte al backend local o a uno remoto.
> - Lo que **solo** existe en escritorio se declara explícitamente y degrada en web sin romper: impresión a impresora térmica, exportación de reportes a archivo con diálogo de guardado (Tauri dialog/fs cuando esté disponible, con fallback de descarga en el navegador) y atajos de teclado globales.
> - Configuración de ventana en Tauri: tamaño por defecto, tamaño mínimo, título con el nombre de la tienda, y confirmación al cerrar si hay un ticket abierto.
> - **Fuera de alcance**: modo offline con base local, sincronización offline, notificaciones push nativas, instalación como servicio del sistema, kiosco con auto-login.
>
> ### Sistema de diseño
>
> La interfaz es **oscura, neutra y densa en datos**: fondo casi negro neutro, superficies apenas más claras, **bordes finos en lugar de sombras**, tipografía compacta y tabular para las cifras, y **el color usado solo para comunicar significado** — verde éxito, rojo error o peligro, ámbar alerta (bajo stock, stock negativo), azul para datos y series. Sin color decorativo, sin degradados, sin glassmorphism.
>
> El color no distingue marcas ni rellena espacio: el chrome de la aplicación es neutro y el color aparece únicamente donde hay significado (estado de stock, resultado de una operación, serie de un gráfico). En la pantalla de caja la legibilidad de los números es prioridad: cifras tabulares alineadas a la derecha, importes con separador de miles y 2 decimales siempre, nunca truncados (`1250.50`, no `1.2k`).
>
> **Regla**: en este prompt los colores se nombran de forma natural — **no definas valores hex aquí**. Al generar las specs, traducí esta descripción al sistema de diseño en `specs/frontend/02-design.md`: roles semánticos (`base`, `surface`, `surface-elevated`, `border`, `text`, `text-secondary`, `text-muted`, `accent`, `success`, `error`, `warning`, `info`) con valores concretos y coherentes, contraste AA en todo el texto, y una escala derivada de esos roles para hover, focus y estados activos. Ese archivo debe quedar consumible por el skill de diseño del repo, que lee los tokens desde ahí.
>
> ### Requisitos de densidad y accesibilidad operativa
>
> - Densidad: las tablas de productos, ventas e inventario muestran la mayor cantidad de filas útil sin scroll (fila de 36–40px, tipografía 13–14px), con separación suficiente para no ser una pared de texto.
> - Accesibilidad: foco visible en todo control, navegación completa por teclado, `aria-live` en los mensajes de error y en el resultado de la venta, un único `<h1>` por pantalla, contraste AA en todos los textos (incluidos los badges de estado, que son los que más se olvidan).
> - Responsive: usable en tablet y móvil para consultar stock y ventas. La **pantalla de caja está optimizada para escritorio** (ratón, teclado y lector de códigos de barras) y en móvil debe seguir siendo operable con scroll táctil, aunque no sea la experiencia principal.
>
> ---
>
> ## MODELO DE DATOS (entidades raíz)
>
> - `Store` (name, slug, phone, email, address, city, timestamps) — un comercio.
> - `User` (store_id FK, name, email **[único por store]**, password_hash, role [`admin`|`cajero`], phone, email_verified_at, active, deleted_at) · `Session` (user_id FK, store_id FK, refresh_token_hash, device, ip, expires_at, revoked_at, token_family)
> - `Category` (store_id FK, name, slug, deleted_at) — vive en el módulo de productos y es público por GET.
> - `Supplier` (store_id FK, name, business_name, phone, email, address, is_active, deleted_at)
> - `Product` (store_id FK, category_id FK?, supplier_id FK?, name, description, barcode **[único por store, ignorando soft-deleted]**, price DECIMAL(10,2), cost DECIMAL(10,2), stock, stock_min, unit, active, deleted_at)
> - `Service` (store_id FK, name, description, price DECIMAL(10,2), active, deleted_at) · `ServiceProduct` (service_id FK, product_id FK, quantity **int ≥ 1**, único compuesto (service_id, product_id))
> - `Sale` (store_id FK, user_id FK, ticket_number **[único por store]**, subtotal DECIMAL(10,2), discount DECIMAL(10,2), tax DECIMAL(10,2), total DECIMAL(10,2), payment_method [`efectivo`|`tarjeta`|`transferencia`|`otro`], created_at)
> - `SaleItem` (sale_id FK, product_id FK?, service_id FK?, product_name **snapshot**, unit_price DECIMAL(10,2), quantity **int**, subtotal DECIMAL(10,2), type [`product`|`service`]) · `SaleServiceItem` (sale_item_id FK, product_id FK, quantity **override en la venta**) — solo para servicios con override custom.
> - `InventoryMovement` (store_id FK, product_id FK, movement_type [`entrada`|`salida`|`ajuste`], quantity **con signo**, stock_after, user_id FK, sale_id FK?, batch_id FK?, note, created_at)
> - `InventoryBatch` (store_id FK, user_id FK, movement_type, supplier_id FK?, note, created_at) · `InventoryBatchItem` (batch_id FK, product_id FK, quantity, stock_before, stock_after, único compuesto (batch_id, product_id))
> - `Settings` (store_id FK **[único]**, business_name, address, phone, email, tax_rate DECIMAL(5,2), tax_included, ticket_header, ticket_footer, paper_size [`80mm`|`58mm`], printer_name, print_logo, print_cut)
>
> **Invariantes de datos**:
>
> - Todo importe es `DECIMAL(10,2)`. Prohibido `FLOAT` / `DOUBLE PRECISION` para dinero. Cero aritmética de dinero en `float` en el frontend.
> - Soft-delete (`deleted_at TIMESTAMPTZ`) en `product`, `category`, `supplier`, `service`. **No** en `sale`, `sale_item`, `inventory_movement`, `inventory_batch`: el histórico es inmutable.
> - Todo listado de negocio incluye `WHERE store_id = $1` derivado de la sesión. Los índices empiezan por `store_id`.
> - Índices: `Product(store_id, deleted_at)`, `Product(store_id, barcode)` (único parcial `WHERE deleted_at IS NULL`), `Product(store_id, category_id)`, `Sale(store_id, created_at DESC)`, `Sale(store_id, payment_method)`, `Sale(store_id, user_id)`, `Sale(store_id, ticket_number)` (único), `InventoryMovement(store_id, product_id, created_at DESC)`, `InventoryMovement(store_id, movement_type)`, `InventoryBatch(store_id, created_at DESC)`, `User(store_id, email)` (único parcial `WHERE deleted_at IS NULL`), `Session(user_id)`, `Session(refresh_token_hash)`, `Settings(store_id)` (único).
> - Búsqueda por texto: `ILIKE` con índice **trigram** (`pg_trgm`) sobre `name` de productos, servicios y proveedores — el parámetro `search` de los LIST es coincidencia parcial, no exacta.
> - Todos los timestamps son `TIMESTAMPTZ` en **UTC**.
>
> ---
>
> ## REQUISITOS NO FUNCIONALES
>
> - **Rendimiento**: API p95 < 300ms para lecturas de lista y detalle. La pantalla de caja resuelve una búsqueda por código de barras en < 300ms percibidos, con respuesta del servidor < 120ms. Reportes de un mes completo < 2s. Listas paginadas de a 20, máximo 100.
> - **Escritura de stock y venta**: crear una venta con items de servicio debe resolverse en < 500ms; es la operación más crítica del sistema.
> - **Concurrencia**: dos cajas registrando ventas al mismo tiempo sobre el mismo producto → el stock se descuenta de forma consistente (transacción con bloqueo de fila, o `UPDATE ... WHERE stock >= qty` verificando filas afectadas). Nunca se permite stock negativo por condición de carrera.
> - **Seguridad**: HTTPS en producción, bcrypt (costo 12), `accessToken` corto (15 min) + `refreshToken` rotativo, cookies `httpOnly`, rate limit en auth, validación de input en **cada** endpoint con esquema, `store_id` derivado de sesión y **nunca** del body/query, CORS con lista blanca de orígenes, secretos solo por variables de entorno (plantilla `.env.example`, nunca valores reales en el repo), logs sin contraseñas ni tokens.
> - **Multi-tenancy**: el aislamiento entre stores es requisito de **seguridad**, no de funcionalidad. Toda spec de endpoint debe indicar explícitamente cómo se aplica el filtro de tienda.
> - **Auditoría**: `inventory_movement.user_id` y `sale.user_id` permiten reconstruir quién hizo qué. Un usuario eliminado lógicamente conserva la trazabilidad de sus operaciones.
> - **Redis (opcional)**: caché de `GET /settings` y de los reportes agregados con TTL corto (60s) e **invalidación explícita** al cambiar settings o registrar una venta. El sistema debe funcionar completo **sin Redis** (fallback directo a Postgres).
> - **Testing**: unitarios de las reglas de negocio (cálculo de totales, descuento de stock de servicios, override custom, umbral de bajo stock); integración de API por módulo contra Postgres real (no SQLite); E2E de los flujos críticos: `registro de tienda → login → alta de producto → venta con servicio → stock descontado → venta visible en el reporte`; cobertura mínima **70%** en la capa de aplicación.
> - **Despliegue**: el backend corre en contenedor; PostgreSQL 16 gestionado con backups diarios; el build de escritorio se firma antes de distribuirse.
>
> ---
>
> ### REGLAS IMPORTANTES PARA LAS SPECS
>
> - Cada endpoint, entidad, pantalla y tarea de las specs debe existir por esta descripción: si un endpoint declara campos, esos campos aparecen en el schema de la DB, en la validación del backend y en el formulario del frontend. Si una pantalla lista campos, esos campos existen en el schema.
> - **Orden de construcción recomendado** (por dependencias, no por importancia): `users` → `suppliers` → `categories` → `products` → `services` → `inventory` + `batch-inventory` → `sales` → `settings`. Las ventas van cerca del final porque dependen de productos, servicios e inventario. Si el prompt y el código existente se contradicen en algún comportamiento no descrito acá, gana el código y la discrepancia queda anotada como tarea en el módulo correspondiente.
> - No inventar funcionalidades fuera de los módulos declarados. Explícitamente **fuera de alcance**: pagos en línea o pasarelas, marketplace, app móvil nativa, e-commerce público, suscripciones y facturación del software, multi-idioma, modo offline, y comisiones por vendedor.
> - Los flujos críticos se recorren de punta a punta en las specs: **crear tienda → el admin inicia sesión → crea cajeros → carga productos y proveedores → registra un lote de entrada → vende un producto regular y un servicio con override → el stock de todos los productos baja correctamente → la venta aparece en el reporte y en la tendencia de ingresos**.
> - Las tareas de `tasks/` cubren backend, db y frontend de cada área, y los task files de db incluyen los índices y las restricciones únicas que sostienen las invariantes de datos de arriba.
> - `docs/03-requisitos-del-producto.md` se escribe al final, en lenguaje de negocio, con la tabla de roles, las pantallas, las tecnologías por capa, el resumen de endpoints y tablas, y los flujos paso a paso.


