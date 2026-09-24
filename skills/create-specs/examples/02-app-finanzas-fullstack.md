# Prompt de ejemplo: app de finanzas personales, full stack (semilla corta + versión detallada)

Uso: pegá la semilla o la versión detallada después de `/create-specs`. La semilla muestra que una descripción breve alcanza. La versión detallada es la referencia de **hasta dónde puede llegar un prompt rico**: módulo por módulo, sección por sección, pantalla por pantalla, para que las specs salgan completas de una.

## Versión corta (semilla)

> /create-specs App de finanzas personales full stack para registrar ingresos y gastos, categorizar transacciones, definir presupuestos mensuales por categoría, crear metas de ahorro, importar movimientos desde CSV/OFX, y ver reportes y alertas. Web responsiva + API + base de datos. Un solo usuario por cuenta con registro, login, 2FA y sesiones activas.

---

## Versión detallada (misma app, módulo por módulo)

> /create-specs Generá las specs del siguiente proyecto.
>
> **Proyecto**: **FinanzApp** — app de finanzas personales, **full stack**. Frontend web responsivo (React + TypeScript), backend API REST (Node.js + Fastify, TypeScript), PostgreSQL con ORM (Prisma), y jobs en background para importaciones y transacciones recurrentes. Un solo usuario por cuenta; sin multi-tenancy.
>
> **Alcance fijo**: registro/login con 2FA, cuentas, transacciones (manuales, recurrentes y transferencias), categorías con reglas automáticas, presupuestos mensuales, metas de ahorro, reportes, importación CSV/OFX, alertas y configuración. **No** incluye pagos, inversiones en activos reales, ni conexión bancaria automatizada (Open Banking) — se declara fuera de alcance en las specs.
>
> **Convención**: por cada módulo abajo se listan las **pantallas** (con campos y acciones exactos), las **reglas de negocio** y los **endpoints**. Todo endpoint, entidad y pantalla de las specs debe salir de esta descripción.
>
> ---
>
> ## MÓDULO 1 — AUTENTICACIÓN Y SEGURIDAD
>
> ### Pantallas
>
> 1. **Registro**: nombre, email, contraseña (mín. 10 caracteres, 1 mayúscula, 1 número), confirmación de contraseña. Al terminar: verificación de email (enlace con token de 30 min).
> 2. **Login**: email + contraseña; si el usuario tiene 2FA activo, segundo paso con código TOTP de 6 dígitos. Opción "recordarme" (sesión duradera 30 días, si no 24h).
> 3. **Recuperar contraseña**: email → enlace con token de 15 min → nueva contraseña.
> 4. **Configuración 2FA**: activar (muestra QR TOTP + código de respaldo de copiado obligatorio), desactivar (pide contraseña), regenerar códigos de respaldo (10 códigos únicos).
> 5. **Sesiones activas**: tabla con dispositivo, navegador, IP, ubicación aproximada, última actividad, botón "revocar" individual y "cerrar todas las demás".
>
> ### Reglas de negocio
>
> - Rate-limit en login/registro/recuperación (5 intentos → bloqueo 15 min con contador decreciente).
> - Bloqueo de cuenta tras 10 intentos de 2FA fallidos (desbloqueo solo con recuperación de contraseña).
> - JWT de acceso (15 min) + refresh token (30 días) rotativo, revocable por sesión.
> - Contraseñas con bcrypt (costo 12). Email verificado es requisito para iniciar sesión.
>
> ### Endpoints
>
> `POST /api/auth/register` · `POST /api/auth/verify-email` · `POST /api/auth/login` · `POST /api/auth/logout` · `POST /api/auth/refresh` · `POST /api/auth/forgot-password` · `POST /api/auth/reset-password` · `POST /api/auth/2fa/enable` · `POST /api/auth/2fa/disable` · `GET/POST /api/auth/sessions` · `DELETE /api/auth/sessions/:id` · `DELETE /api/auth/sessions`
>
> ---
>
> ## MÓDULO 2 — DASHBOARD
>
> ### Pantalla
>
> **Dashboard** (única pantalla, vista del mes corriente):
> - KPIs de cabecera: **ingresos del mes**, **gastos del mes**, **balance neto**, **tasa de ahorro %** (ingresos − gastos / ingresos).
> - Gráfico donut: gastos por categoría del mes (top 6 + "otros").
> - Gráfico de área: flujo de caja de los últimos 6 meses (ingresos vs gastos por mes).
> - Lista "transacciones recientes" (últimas 6, con fecha, categoría, cuenta y monto) con enlace a "ver todas".
> - Pantalla "alertas activas": presupuesto al límite, cuenta en negativo, meta en riesgo.
> - Saldo total por cuenta (suma de todas las cuentas) con desglose en tooltip.
>
> ### Reglas de negocio
>
> - Todos los KPIs se calculan del mes corriente según la zona horaria del usuario; los montos se muestran en la moneda base del usuario.
> - Carga con skeletons; datos servidos por un único endpoint agregado (sin N llamadas por KPI).
> - `prefers-reduced-motion`: sin animaciones de conteo de KPIs.
>
> ### Endpoints
>
> `GET /api/dashboard/summary?month=2026-09` (caché 60s)
>
> ---
>
> ## MÓDULO 3 — CUENTAS
>
> ### Pantallas
>
> 1. **Listado de cuentas**: tarjetas con nombre, banco/institución, tipo, saldo actual, y mini-gráfico de saldo de los últimos 6 meses; botón "agregar cuenta"; saldo total consolidado arriba.
> 2. **Formulario de cuenta** (crear/editar): nombre, tipo (efectivo / débito / crédito / inversión), institución (libre), moneda (fija por usuario), saldo inicial (solo al crear), límite de crédito y fecha de corte (solo tipo crédito), color de etiqueta.
> 3. **Detalle de cuenta**: saldo actual, movimientos del mes con filtros (rango de fechas, categoría, tipo, búsqueda), botones "registrar movimiento" y "transferir", indicador de última conciliación (fecha y saldo al momento de conciliar).
> 4. **Confirmación de borrado**: cuenta con transacciones exige confirmación escrita del nombre de la cuenta; las transacciones se reasignan a "Sin cuenta" en lugar de borrarse.
>
> ### Reglas de negocio
>
> - Credibilidad: la suma de saldos de todas las cuentas debe coincidir con el "saldo total" del dashboard (misma query de origen).
> - Cuenta de crédito muestra saldo "actual" = deuda pendiente; el disponible se calcula con el límite.
> - Al borrar cuenta, se guarda el saldo final como registro histórico del día del borrado.
>
> ### Endpoints
>
> `GET/POST /api/accounts` · `GET/PATCH/DELETE /api/accounts/:id` · `POST /api/accounts/:id/transfer` · `GET /api/accounts/:id/balance-history?months=6`
>
> ---
>
> ## MÓDULO 4 — TRANSACCIONES
>
> ### Pantallas
>
> 1. **Listado de transacciones** (pantalla principal): tabla con fecha, descripción, categoría (icono + color), cuenta, monto (+ verde ingreso / − rojo gasto) y acciones; agrupada por día; filtros combinables: rango de fechas, cuenta, categoría, tipo, monto mínimo/máximo, búsqueda por texto; orden por fecha descendente; paginación de 50 con "cargar más".
> 2. **Modal alta manual**: monto (con selector ingreso/gasto por defecto gasto), descripción, categoría, cuenta, fecha (default hoy), tags opcionales (máx 3), checkbox "transacción recurrente" (despliega configuración).
> 3. **Modal edición** (mismo formulario + botón "eliminar" con confirmación) y **edición en lote**: selección múltiple por checkboxes → "mover de categoría" o "marcar como ingreso/gasto" en una acción.
> 4. **Modal transferencia entre cuentas propias**: cuenta origen, cuenta destino (distinta), monto, fecha, descripción opcional; genera 2 transacciones ligadas (gasto en origen, ingreso en destino) con el mismo `transfer_id`.
> 5. **Editor de recurrentes**: lista de transacciones recurrentes con próxima ejecución y estado; formulario con frecuencia (diaria / semanal con día / mensual con día), monto, categoría, cuenta, fecha de inicio, fecha de fin opcional, activo/pausado; alineación "si el día 31 no existe → último día del mes".
> 6. **Importación** se detalla en el Módulo 9.
>
> ### Reglas de negocio
>
> - Toda transacción muta el saldo de su cuenta y los agregados del dashboard en la misma transacción de base de datos.
> - Una transferencia no puede tener origen = destino; la validación ocurre en el frontend y de nuevo en el backend.
> - Motor de recurrentes: job diario a las 04:00 genera las transacciones vencidas (desde la última ejecución hasta hoy), cada una verificando que la cuenta siga existiendo y el estado siga activo.
> - Deduplicación de importadas: hash único por (cuenta, fecha, monto con 2 decimales, descripción normalizada).
>
> ### Endpoints
>
> `GET /api/transactions?filters…&page=` · `POST /api/transactions` · `PATCH /api/transactions/:id` · `DELETE /api/transactions/:id` · `PATCH /api/transactions/batch` · `POST /api/transfers` · `GET/POST /api/recurring` · `PATCH/DELETE /api/recurring/:id`
>
> ---
>
> ## MÓDULO 5 — CATEGORÍAS Y REGLAS AUTOMÁTICAS
>
> ### Pantallas
>
> 1. **Gestor de categorías**: árbol de categorías por tipo (ingreso/gasto), cada una con nombre, icono (set de ~40) y color; por defecto listas completas pre-cargadas (Comida y bebida, Transporte, Vivienda, Servicios, Salud, Ocio, Ropa, Educación, Ingresos: Sueldo, Freelance, Otros); CRUD propio (crear/editar/eliminar con confirmación si tiene transacciones → se reasignan a "Sin categoría").
> 2. **Reglas automáticas** (dentro del gestor, pestaña "Reglas"): lista de reglas (patrón de texto, categoría destino, prioridad, estado); CRUD; patrón con coincidencia parcial (sin regex para el usuario).
> 3. **Sugerencia de categoría**: al escribir una transacción manual, si ya existieron 3+ transacciones con descripciones que normalizan igual, pre-sugiere la categoría más frecuente (con "usar" / "ignorar").
> 4. **Modo setup inicial** (primer login): asistente de 3 pasos para elegir las categorías que usará (pre-seleccionadas todas) — opcional, se puede saltar.
>
> ### Reglas de negocio
>
> - Las reglas se aplican en orden de prioridad (mayor primero); se evalúan al crear/importar transacciones y **no** retroactivamente.
> - "Sin categoría" es una categoría real de sistema, no editable ni eliminable.
>
> ### Endpoints
>
> `GET/POST /api/categories` · `PATCH/DELETE /api/categories/:id` · `GET/POST /api/categories/rules` · `PATCH/DELETE /api/categories/rules/:id` · `GET /api/categories/suggest?text=…`
>
> ---
>
> ## MÓDULO 6 — PRESUPUESTOS
>
> ### Pantallas
>
> 1. **Vista del mes**: selector de mes; lista de presupuestos por categoría de gasto (una por categoría) como barras de progreso: monto gastado / monto presupuestado; estados con color: normal (<80% verde), avanzando (80–100% ámbar), al límite (100% rojo), excedido (>100% rojo oscuro con monto de exceso); edición inline del monto.
> 2. **Borrador de presupuesto**: al crear el primer presupuesto del mes, sugerencia de montos basada en el promedio de los últimos 3 meses por categoría (con nota "sugerido por tu historial").
> 3. **Histórico**: tabla mes a mes de presupuesto vs gasto real por categoría (6 meses), con cálculo de % de cumplimiento.
>
> ### Reglas de negocio
>
> - Un presupuesto pertenece a (usuario, mes AAAA-MM, categoría) — único; no hay rollover de meses.
> - Al superar el 80% y el 100%, se dispara una alerta (Módulo 10) — email + in-app, una vez por umbral por mes (sin spam diario).
> - Los montos son siempre en moneda base del usuario.
>
> ### Endpoints
>
> `GET /api/budgets?month=` · `PUT /api/budgets/:categoryId?month=` · `DELETE /api/budgets/:categoryId?month=` · `GET /api/budgets/history?months=6&categoryId=…`
>
> ---
>
> ## MÓDULO 7 — METAS DE AHORRO
>
> ### Pantallas
>
> 1. **Listado de metas**: tarjetas con nombre, progreso (barra + %), monto ahorrado / objetivo, fecha meta, aporte mensual sugerido para llegar a tiempo; acciones "aportar", "retirar", "editar", "eliminar".
> 2. **Formulario de meta**: nombre, monto objetivo, fecha meta (opcional), cuenta destino, icono; muestra el cálculo de "aporte mensual necesario" en vivo (objetivo − ahorrado / meses restantes, con mes actual incluido).
> 3. **Modal aportar/retirar**: monto, fecha, descripción opcional → genera transacción de transferencia interna a la cuenta de la meta (movimiento sin categoría de gasto; tipo "ahorro").
> 4. **Meta completada**: confeti sutil (solo si no hay `prefers-reduced-motion`) + pasaje automático a "completadas" con fecha.
>
> ### Reglas de negocio
>
> - Aportar a una meta crea una transferencia entre cuentas (si la meta usa cuenta destino) — nunca un gasto.
> - La meta con fecha pasada y sin completar se marca "en riesgo" y genera alerta mensual.
>
> ### Endpoints
>
> `GET/POST /api/goals` · `PATCH/DELETE /api/goals/:id` · `POST /api/goals/:id/contribute` · `POST /api/goals/:id/withdraw`
>
> ---
>
> ## MÓDULO 8 — REPORTES
>
> ### Pantallas
>
> 1. **Reporte mensual/anual**: selector de período (mes o año) + comparación con período anterior; secciones: totales (ingresos, gastos, balance, % de cambio vs anterior), gastos por categoría (tabla ordenable + barras horizontales), top 10 comercios por gasto, ingresos vs gastos por mes (solo en anual).
> 2. **Exportación**: botones "Exportar PDF" (reporte armado en vista de impresión, con marca de agua del usuario) y "Exportar CSV" (detalle de transacciones del período).
> 3. **Vacío**: si el período no tiene transacciones, estado vacío con CTA "registrar tu primera transacción".
>
> ### Reglas de negocio
>
> - Los agregados se calculan en SQL (GROUP BY) — nunca se traen transacciones al frontend para sumar.
> - CSV exporta siempre todas las transacciones del período; PDF solo el resumen visual.
>
> ### Endpoints
>
> `GET /api/reports/summary?from=&to=&compare=` · `GET /api/reports/by-category?from=&to=` · `GET /api/reports/top-merchants?from=&to=&limit=10` · `GET /api/reports/export?format=csv|pdf`
>
> ---
>
> ## MÓDULO 9 — IMPORTACIÓN DE DATOS
>
> ### Pantallas
>
> 1. **Importar**: dropzone (CSV u OFX, máx 20MB); paso 2 "mapear columnas" (si el CSV no coincide con el formato esperado, selectores para asignar: fecha, descripción, monto, tipo [ingreso/gasto, opcional]); paso 3 "vista previa": tabla con las primeras 10 filas parseadas y conteo previsto.
> 2. **Progreso**: barra asíncrona con estados (procesando → n importadas · n duplicadas · n con error) y botón "ver errores" (tabla con fila y motivo: monto inválido, fecha inválida, duplicada).
> 3. **Historial de importaciones**: listado con fecha, archivo, resultados y opción de "re-importar" (borra el lote previo y vuelve a correr).
>
> ### Reglas de negocio
>
> - La importación corre como job en background (cola); el usuario puede seguir navegando; al terminar llega alerta in-app (+ email opcional).
> - Deduplicación por hash (ver Módulo 4). Las filas con error no detienen el lote: se reportan al final.
> - OFX: se parsea fecha, monto con signo (negativo = gasto), descripción y categoría si el banco la trae.
>
> ### Endpoints
>
> `POST /api/imports` (multipart) · `GET /api/imports` · `GET /api/imports/:id` · `GET /api/imports/:id/errors` · `POST /api/imports/:id/retry`
>
> ---
>
> ## MÓDULO 10 — ALERTAS Y NOTIFICACIONES
>
> ### Pantallas
>
> 1. **Centro de alertas**: campana en el header con contador no leído; panel desplegable con lista (tipo con icono, texto, fecha) y acciones por alerta (marcar leída, archivar); ver todas → pantalla con filtros (sin leer, archivo, tipo).
> 2. **Preferencias de alertas**: por tipo de alerta (presupuesto 80%/100%, cuenta en negativo, meta en riesgo, importación terminada, factura próxima) elegir canal: in-app, email, ambos o ninguno.
>
> ### Reglas de negocio
>
> - Tipos de alerta configurables; las de seguridad (nuevo login, 2FA desactivado) no se pueden desactivar y siempre van por email.
> - Contador no leído se decrementa al abrir el panel (no al marcar individualmente).
>
> ### Endpoints
>
> `GET /api/alerts?filter=` · `PATCH /api/alerts/:id` · `POST /api/alerts/read-all` · `GET/PUT /api/alert-preferences`
>
> ---
>
> ## MÓDULO 11 — CONFIGURACIÓN Y DATOS DEL USUARIO
>
> ### Pantallas
>
> 1. **Perfil**: nombre, email (verificado, con reenvío de verificación), avatar (carga de imagen 500KB máx, círculo), idioma (es / es-419 / en), moneda base (listado con símbolo y código ISO) y zona horaria (con selector por ciudad).
> 2. **Preferencias**: formato de fecha (DD/MM/AAAA u AAAA-MM-DD), formato de número (separador de miles/decimales, ejemplo en vivo), primer día de la semana (lunes/domingo).
> 3. **Datos**: botón "exportar todos mis datos" (descarga JSON completo: usuario, cuentas, transacciones, presupuestos, metas, reglas, preferencias) y botón "eliminar mi cuenta" (flujo de confirmación: contraseña + texto "ELIMINAR"; borrado físico inmediato de alertas/sesiones/contenido y soft-delete del usuario 30 días con cancelación por email).
>
> ### Reglas de negocio
>
> - Cambiar moneda base no convierte montos: se documenta en pantalla ("los valores históricos mantienen su monto; el cambio aplica a partir de ahora") con confirmación obligatoria.
> - La exportación genera el archivo en <5s (job síncrono por volumen típico; si supera 50MB, pasa a job con email).
>
> ### Endpoints
>
> `GET/PATCH /api/me` · `POST /api/me/avatar` · `GET/PUT /api/me/preferences` · `POST /api/me/export` · `DELETE /api/me`
>
> ---
>
> ## MODELO DE DATOS (entidades raíz)
>
> - `User` (email único, password hash, email_verified_at, 2fa_secret?, backup_codes[], timestamps) · `Session` (user_id FK, refresh_token_hash, device, ip, expires_at, revoked_at)
> - `Account` (user_id FK, name, type [cash|debit|credit|investment], institution, currency, initial_balance, credit_limit?, statement_day?, color, closed_at?)
> - `Transaction` (user_id FK, account_id FK, category_id FK nullable, type [income|expense], amount DECIMAL(12,2), description, date, tags[], transfer_id?, recurring_id?, import_id?, dedup_hash)
> - `Category` (user_id FK nullable [null = sistema], name, icon, color, type) · `CategoryRule` (pattern, category_id FK, priority, active)
> - `Budget` (user_id + category_id + month AAAAMM, amount, unique compuesto)
> - `SavingGoal` (name, target_amount, saved_amount, target_date?, account_id FK, status [active|completed]) · `GoalContribution` (goal_id, amount, date)
> - `RecurringTransaction` (freq, day/dow, amount, category_id, account_id, start_date, end_date?, active, last_run_at)
> - `ImportJob` (filename, status, imported_count, duplicate_count, error_count, mapping JSON?) · `ImportError` (job_id, row_number, reason)
> - `Alert` (type, payload, read_at?, archived_at?) · `AlertPreference` (type, channels) · `UserPreference` (locale, currency, timezone, date_format, number_format, week_start)
>
> **Índices**: `Transaction(user_id, date DESC)` y `(user_id, category_id, date)` para presupuestos/reportes; `Budget(user_id, month)`; `Session(user_id)`; búsqueda de texto con trigram sobre `description`.
>
> ---
>
> ## REQUISITOS NO FUNCIONALES
>
> - **Rendimiento**: API p95 < 400ms; dashboard agrega en una query y sirve < 200ms; lazy-load de imágenes; listados paginados de 50.
> - **Concurrencia**: operaciones contables atómicas (transacción DB sobre saldo + movimientos); manejo de conflictos en edición en lote (optimistic con `updated_at`).
> - **Jobs**: cola (Redis/BullMQ) para recurrentes (04:00), importaciones y emails; reintentos con backoff (3 intentos).
> - **Seguridad**: HTTPS, bcrypt costo 12, JWT corto + refresh rotativo, rate-limit en auth y exportación, input validation en cada endpoint (schema Zod), sin secretos en el repo (`.env` + plantilla), logs sin datos personales.
> - **Privacidad (derecho al olvido)**: exportación completa de datos + borrado físico a pedido; soft-delete 30 días con cancelación.
> - **Testing**: unit de reglas de negocio (dedup, recurrentes, presupuestos), integración de API por módulo, E2E de flujos críticos (registro → primera transacción; presupuesto excedido → alerta); cobertura mínima 70% de la capa de dominio.
> - **Despliegue**: Docker Compose (api + db + redis) para desarrollo; en producción, contenedores + base administrada + backups diarios.
>
> ---
>
> ### REGLAS IMPORTANTES PARA LAS SPECS
>
> - **Diseño**: la interfaz usa los colores **blanco, rosa y morado** — fondo blanco, superficies blancas/crema, textos en morado oscuro (secundario en morado grisáceo), acentos en **rosa** y **morado**, verde = ingreso, rojo = gasto, ámbar = presupuesto al límite. No definas valores hex en este prompt: al generar las specs, traducí esta descripción al sistema de diseño en `specs/frontend/02-design.md` (roles semánticos `base`, `surface`, `surface-elevated`, `border`, `text`, `text-secondary`, `text-muted`, `accent`, `success`, `error` + escala derivada de los acentos para hover/focus/estados) con valores concretos y contraste AA.
> - Las specs se organizan en los módulos listados (backend + db + frontend), con archivos y tasks por módulo — nada genérico, nada de placeholder.
> - Cada pantalla, endpoint y entidad de las specs debe existir por esta descripción: si una pantalla lista campos, los fields aparecen en el frontend, en el schema de la DB y en la validación del backend.
> - Los flujos críticos deben recorrerse de punta a punta en las specs: alta de transacción → afecta saldo de cuenta, dashboard y presupuesto; importación con duplicados → alerta al terminar.
> - No inventar funcionalidades fuera de los 11 módulos declarados.