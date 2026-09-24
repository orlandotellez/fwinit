# Prompt de specs — Sitio público de pastelería (Dulce Atelier)

Uso: pegá este prompt después de `/create-specs`.

> /create-specs Generá las specs del siguiente proyecto.
>
> **Proyecto**: sitio **solo frontend, 100% estático** (HTML/CSS/JS o Astro, sin backend, sin base de datos, sin panel administrativo) para una pastelería artesanal llamada **"Dulce Atelier"**.
>
> El sitio es únicamente la **parte pública**. No diseñes dashboard, panel administrativo, login, registro, checkout interno ni páginas privadas — el proyecto **no tiene backend ni autenticación**. Los "pedidos" siempre terminan en WhatsApp o en un formulario `mailto:` / un servicio externo de formularios estático (ej. Formspree), nunca en un carrito ni en una pasarela de pago propia.
>
> A diferencia de una landing de una sola página, este es ahora un **sitio de varias páginas** conectadas por una navegación común: **Inicio, Menú/Pasteles (catálogo), Ficha de producto (plantilla individual por cada producto), Nosotros, Contacto** y **Preguntas frecuentes**. Todas comparten el mismo sistema de diseño, header y footer.
>
> ---
>
> ## 0. Mapa del sitio
>
> 1. **Inicio** (`/`) — landing de marca, resumen y CTAs de conversión.
> 2. **Menú / Pasteles** (`/menu`) — catálogo completo con filtros por categoría.
> 3. **Ficha de producto** (`/productos/[slug]`) — página individual por cada producto, generada desde una plantilla única.
> 4. **Nosotros** (`/nosotros`) — historia, equipo, obrador, valores.
> 5. **Contacto** (`/contacto`) — formulario, WhatsApp, mapa, horarios.
> 6. **Preguntas frecuentes** (`/preguntas-frecuentes`) — FAQ ampliado (la sección de la home es solo un adelanto).
> 7. **404** — página de error simple, en el mismo sistema de diseño, con CTA de vuelta al inicio.
>
> Todas las páginas comparten: **Header/Navbar**, **Footer**, **paleta, tipografía, espaciado, sombras y animaciones** definidos abajo, y el mismo componente de **CTA de WhatsApp flotante** (ver sección 1.3).
>
> ---
>
> ## 1. Sistema de diseño (aplica a TODO el sitio)
>
> ### 1.1 Paleta (en lenguaje natural — vos la convertís en sistema de diseño)
> El sitio es de color **blanco, rosa y morado**: fondos blancos y crema muy claro; textos en **morado oscuro** (con **morado grisáceo** para el texto secundario); acentos en **rosa** (detalles, hover, estados activos) y **morado** (enlaces, elementos destacados, secciones oscuras como el footer); bordes y separadores en **crema suave**; éxito en verde suave y errores en rojo suave.
>
> **Regla**: en este prompt los colores se nombran de forma natural — **no definas valores hex aquí**. Al generar las specs, traducí esta descripción al sistema de diseño en `specs/frontend/02-design.md`: roles semánticos (`base`, `surface`, `surface-elevated`, `border`, `text`, `text-secondary`, `text-muted`, `accent`, `success`, `error`) con valores concretos y coherentes entre sí, contraste AA en todo el texto, y la escala derivada de los acentos (rosa y morado) para hover, focus, bordes destacados y fondos suaves.
>
> ### 1.2 Tipografía
> **Inter** en toda la interfaz (display, texto, botones, formularios — sin excepciones, sin fuentes manuscritas ni serif).
> - Escala: display 64px/1.1 (hero de Inicio), H1 de página interior 48px/1.15, H2 40px/1.2, H3 24px/1.3, H4 19px/1.3 (usado en fichas de producto y FAQ), body 17px/1.6, body pequeño 15px/1.6, caption 13px/1.4.
> - H2 y H1 con `letter-spacing: -0.01em`; body normal; captions con `letter-spacing: 0.06em` + uppercase.
> - Jerarquía siempre por tamaño y peso (500/600), nunca por color solo.
>
> ### 1.3 Componentes globales
> - **Header/Navbar fijo** (ver sección 2), presente en las 7 páginas, con el ítem activo resaltado (subrayado permanente, no solo hover).
> - **Botón flotante de WhatsApp**: círculo 56px, fondo morado oscuro, ícono blanco, esquina inferior derecha, `position: fixed`, aparece después de 200px de scroll con fade-in 300ms, oculto en el formulario de Contacto (para no tapar el botón de enviar). `aria-label="Escribir por WhatsApp"`.
> - **Breadcrumbs**: presentes en Menú, Ficha de producto, Nosotros, Contacto y FAQ (no en Inicio). Formato `Inicio / Menú / Pastel de Chocolate`, caption 13px, separador `/` en crema, último ítem en morado oscuro sin link.
> - **Footer** (ver sección 11), idéntico en todas las páginas.
>
> ### 1.4 Espaciado
> Secciones separadas por 96–120px; gutter de contenedor 24px (móvil) / 32px (tablet) / 48px (desktop); ancho máximo de contenido 1200px (1040px en páginas de texto largo como Nosotros y FAQ, para mejorar legibilidad).
>
> ### 1.5 Formas y sombras
> Radios 12–16px (tarjetas) y 999px (botones/inputs/chips de filtro); sombras solo `0 8px 30px` morado oscuro al 8% — muy suaves, nada de drop shadows duras ni neumorfismo.
>
> ### 1.6 Fotografía (regla global)
> Todas las fotos propias de pastelería, con brief visual idéntico: luz natural difusa lateral, fondo neutro cálido (crema o madera clara), encuadre editorial (no centrado perfecto), profundidad de campo baja, saturadas pero no artificiales. Cada imagen con `alt` descriptivo específico (ej. "Pastel de chocolate de tres capas con ganache brillante, vista de tres cuartos"), nunca genérico ("imagen 1").
>
> **Especificaciones técnicas de imagen** (aplican a todo el sitio):
> - Formatos: `.webp` como principal, con fallback `.jpg` vía `<picture>`.
> - Compresión: calidad 75–80, sin artefactos visibles.
> - `loading="lazy"` en toda imagen fuera del primer viewport; `loading="eager"` + `fetchpriority="high"` solo en la foto del hero de Inicio y en la foto principal de la ficha de producto.
> - `width`/`height` (o `aspect-ratio` en CSS) explícitos en cada imagen para evitar *layout shift*.
> - Al menos 2 tamaños servidos con `srcset` (ej. 640px y 1280px de ancho) para fotos grandes de hero/producto.
> - Como el sitio es estático sin CMS, las imágenes reales se reemplazan por placeholders de alta fidelidad (mismo aspect ratio y paleta de color que el brief) durante el desarrollo, listos para sustituir 1 a 1 por fotografía final.
>
> ### 1.7 Animaciones globales
> Solo reveal al hacer scroll (fade-up 400ms, `ease-out`, `translateY(16px)→0`), con `prefers-reduced-motion: reduce` que las desactiva. Sin parallax, sin marquesinas, sin autoplay. Transiciones de página: fade simple 200ms al navegar entre rutas (si el framework lo soporta), nunca transiciones bruscas o slides.
>
> ### 1.8 Responsive
> Desktop ≥1024px · tablet 768–1023px · móvil <768px. Ninguna sección puede quedar con texto cortado o con scroll horizontal no intencional (la única excepción permitida es el scroll horizontal de chips de filtro en Menú, en móvil).
>
> ### 1.9 Accesibilidad
> Contraste AA en todo texto, focus visible en todos los enlaces/botones/inputs, navegación completa por teclado, menú móvil con `aria-expanded`, iconos decorativos con `aria-hidden`, formularios con `<label>` asociado a cada input (nunca solo placeholder), mensajes de error de formulario anunciados con `aria-live="polite"`, encabezados en orden jerárquico correcto (un solo `<h1>` por página).
>
> ### 1.10 SEO y metadatos
> Cada página con `<title>` y `meta description` únicos, Open Graph (`og:title`, `og:description`, `og:image`) y Twitter Card. Las fichas de producto generan su propio `og:image` usando la foto principal del producto. Slugs de URL en minúsculas, sin tildes, con guiones (ej. `/productos/pastel-de-chocolate`). `sitemap.xml` estático generado con las 6+ rutas.
>
> ---
>
> ## 2. HEADER / NAVBAR (global, todas las páginas)
>
> **Layout**: barra fija arriba (74px de alto), contenido en contenedor de 1200px: logo a la izquierda, enlaces centrados, CTA a la derecha.
> - Logo: wordmark **"Dulce Atelier"** en Inter 600, 20px, color morado oscuro (sin icono), linkea a Inicio.
> - Enlaces: **Inicio · Menú · Nosotros · Contacto** (17px, color morado grisáceo; el ítem de la página activa en morado oscuro con subrayado fijo 2px).
> - CTA derecha: botón **"Hacer pedido"** (relleno morado oscuro, texto crema, radio 999px, padding 12x28px) — enlaza a WhatsApp con mensaje prellenado genérico ("Hola, quiero hacer un pedido en Dulce Atelier").
>
> **Comportamiento**:
> - Al scrollear 40px+: navbar pasa a fondo crema translúcido al 85% + `backdrop-filter: blur(12px)` + borde inferior 1px crema. En páginas interiores (no Inicio) el navbar arranca directamente con este fondo, ya que no hay hero transparente debajo.
> - Enlaces hover: color morado oscuro + subrayado animado (2px, ancho 0→100%, 200ms).
> - CTA hover: reversa (fondo crema, texto morado oscuro) con sombra suave.
>
> **Móvil (<768px)**: menú hamburguesa (3 líneas, animación a ✕ al abrir). Panel desplegable a pantalla completa con fondo crema, enlaces 24px con espacio generoso, CTA ancho completo. Cerrar con ✕, tocando fuera o con tecla `Esc`. El scroll del body se bloquea mientras está abierto. Foco atrapado dentro del panel mientras está abierto (accesibilidad).
>
> ---
>
> ## 3. PÁGINA: INICIO (`/`)
>
> ### 3.1 HERO
> **Layout**: 2 columnas (60/40), min-height 92vh, contenedor 1200px centrado verticalmente. Desktop: texto izquierda, foto derecha. Tablet: 50/50. Móvil: columna única (texto, luego foto).
>
> **Contenido (izquierda)**:
> - Eyebrow: **PASTELERÍA ARTESANAL** — caption 13px uppercase, `letter-spacing 0.08em`, color rosa.
> - H1 display 64px: **"Momentos especiales merecen algo dulce."** — 2 líneas, la palabra "dulce" en itálica (Inter Italic) y color morado oscuro.
> - Párrafo (17px, máx 520px): "Pasteles y postres hechos artesanalmente con ingredientes seleccionados, recetas cuidadas y mucho cariño."
> - Botones: **Ver menú** (primario, relleno morado oscuro, enlaza a `/menu`) · **Hacer un pedido** (secundario, contorno 2px morado oscuro, enlaza a WhatsApp).
> - Micro-línea: "Pedidos con 48h de anticipación" con punto rosado decorativo.
>
> **Foto (derecha)**: pastel de chocolate de 3 capas recién decorado sobre pedestal de cerámica, luz lateral, fondo crema difuso, ganache brillante con movimiento capturado. Proporción 4:5, radio 20px, sin marco ni sombra dura (ocupa todo el alto de la columna). Hover: escala 1.02 suave (600ms). `alt`: "Pastel de chocolate de tres capas recién decorado sobre pedestal de cerámica".
>
> **Debajo del hero** (borde superior 1px crema): 3 indicadores en fila, check rosado + texto 17px — **100% artesanal · Ingredientes seleccionados · Pedidos personalizados**. Móvil: apilados, espaciado 16px.
>
> ### 3.2 CATEGORÍAS / EXPLORAR
> **Layout**: grid editorial asimétrico de 5 tarjetas en 2 filas (desktop): una ancha (2 columnas, foto 4:5), una estrecha (1 columna, foto 16:10), segunda fila invertida. Tablet: 3+2. Móvil: 1 columna, tarjetas 4:5.
>
> **Encabezado**: H2 **"Algo para cada ocasión"** + párrafo 17px "Descubre nuestras creaciones y encuentra el postre perfecto para tu momento." (máx 560px).
>
> **Tarjetas** (5): **Pasteles · Cupcakes · Tartas · Galletas · Postres individuales**. Cada una enlaza a `/menu?categoria=slug` (filtro preseleccionado).
> - Foto propia por categoría (pastel completo en pedestal / cupcake en primer plano con cobertura en espiral / tarta de frutas en rejilla de horno / stack de galletas artesanales / vaso de postre en capas), título H3 24px, enlace **"Explorar →"** (flecha se desplaza 4px a la derecha en hover).
> - Hover de tarjeta: foto escala 1.03 (500ms) + sombra suave. Sin flip, sin zoom exagerado.
> - Fondos alternados entre tarjetas (blanco / crema) para ritmo editorial.
>
> ### 3.3 PRODUCTOS DESTACADOS
> **Layout**: grid de 4 columnas (desktop, gap 24px) / 2 tablet / 1 móvil. Encabezado H2 **"Los favoritos de la casa"** + enlace a la derecha **"Ver menú completo →"** (a `/menu`).
>
> **Cada tarjeta de producto** enlaza a su ficha individual `/productos/[slug]` (ver sección 5):
> - Foto 3:4 (brief: pastel entero/porción estilizada, luz difusa, fondo crema).
> - Nombre H3 24px · descripción corta 15px morado grisáceo (máx 2 líneas, elipsis) · precio 17px 600 morado oscuro (formato "$12.900").
> - Botón **"Ver producto"** (texto chocolate, contorno fino ancho completo inferior; hover: relleno chocolate + texto crema).
>
> **4 productos destacados** (subconjunto del catálogo completo de la sección 5.4): Pastel de Chocolate, Red Velvet, Tarta de Fresas, Cheesecake.
>
> **Móvil**: 1 columna, tarjetas apiladas, botón siempre visible. Sin carrusel.
>
> ### 3.4 SECCIÓN EDITORIAL
> **Layout**: 2 columnas 55/45. Desktop: foto izquierda, texto derecha. Móvil: foto arriba (4:5), texto debajo.
>
> - Foto: persona decorando un pastel con manga pastelera — manos en acción, encuadre cerrado, luz de ventana, fondo con ingredientes desenfocados.
> - Eyebrow **HECHO A MANO** (rosa). H2 40px **"Cada detalle importa."** Párrafo (máx 480px): "Desde la preparación de nuestras masas hasta la decoración final, cada creación pasa por nuestras manos. Queremos que cada pastel no solo se vea especial, sino que también se recuerde."
> - Botón **"Conoce nuestra historia"** (primario chocolate, enlaza a `/nosotros`).
> - Firma Inter 600 15px: "— Dulce Atelier".
>
> ### 3.5 PASTEL PERSONALIZADO
> **Layout**: fondo morado oscuro (única sección oscura de Inicio). Texto centrado, ancho 720px.
>
> - H2 blanco **"¿Tienes algo especial en mente?"** Párrafo en crema: "Diseñamos pasteles personalizados para cumpleaños, bodas, aniversarios y cualquier celebración."
> - Botón **"Solicitar un pastel personalizado"** (relleno crema, texto morado oscuro; hover: relleno rosa) — enlaza a `/contacto?motivo=personalizado`.
> - Lista de 4 checks en 2 columnas (desktop): **✓ Diseño personalizado · ✓ Sabores a elección · ✓ Tamaños diferentes · ✓ Decoración artesanal**.
> - Galería mini (si hay espacio): 3 fotos horizontales de pasteles personalizados (boda, cumpleaños, empresarial), radio 16px, `alt` propio. Móvil: ocultar 1 foto.
>
> ### 3.6 PROCESO
> **Layout**: 3 columnas (desktop) / 1 columna (móvil), padding vertical 120px, gap 48px.
>
> - H2 **"Así de fácil"** + "Tres pasos, cero complicaciones."
> - Número gigante 96px Inter 600 en crema: **01 — Elige** ("Explora nuestros sabores y diseños.", ícono magdalena) · **02 — Personaliza** ("Cuéntanos cómo quieres tu pastel.", ícono lápiz) · **03 — Recibe** ("Preparamos tu pedido y coordinamos la entrega.", ícono camioneta).
> - Móvil: pasos apilados con línea vertical conectora izquierda.
>
> ### 3.7 TESTIMONIOS
> **Layout**: 3 tarjetas blancas en fila (desktop) / 1 columna (móvil), gap 24px, radio 16px, borde 1px crema, sin sombra.
>
> - H2 **"Lo que dicen nuestros clientes"**.
> - "Además de precioso, estaba delicioso. Todos preguntaron dónde lo habíamos comprado." — **María**, etiqueta "Pedido de cumpleaños".
> - "El pastel quedó exactamente como lo imaginábamos." — **Andrea**, etiqueta "Pastel personalizado".
> - "Excelente atención y el sabor fue increíble." — **Carlos**, etiqueta "Entrega a domicilio".
> - Comilla decorativa rosada grande (tipográfica), texto 18px/1.5, nombre 15px 600 chocolate, etiqueta 11px sobre recuadrito superior.
>
> ### 3.8 GALERÍA
> **Layout**: masonry con CSS `columns` (desktop: 3, gap 16px; tablet: 2; móvil: 1). 6–9 fotos en alturas variadas (2:3, 1:1, 3:4 alternadas).
>
> - Fotos: pastel con velas encendidas · cupcakes con cobertura en espiral · flores comestibles (macro) · preparación de masa en bowl de cerámica · ingredientes en mesa de madera · detalle de ganache cayendo.
> - Cierre: enlace centrado **"Síguenos en Instagram →"** con ícono lineal de Instagram.
> - Fade-up al scroll por grupo de fotos (no individual). Hover: zoom 1.03 con sombra suave.
>
> ### 3.9 CTA FINAL
> **Layout**: ancho completo con fondo fotográfico (pastel en mesa de madera), overlay morado oscuro al 55%, texto centrado, padding 140px vertical.
>
> - H1/H2 blanco 60px: **"Haz que tu próxima celebración sea un poco más dulce."**
> - Párrafo en crema (máx 560px): "Cuéntanos qué estás celebrando y nosotros nos encargamos del resto."
> - Botones: **"Hacer un pedido"** (relleno crema, texto morado oscuro) + **"Hablar por WhatsApp"** (contorno 2px crema, ícono WhatsApp; hover: relleno rosado).
> - `alt` del fondo vacío (`aria-hidden`) — foto decorativa.
>
> ---
>
> ## 4. PÁGINA: MENÚ / PASTELES (`/menu`)
>
> Catálogo completo del sitio — reemplaza la necesidad de "ver más" desde Inicio.
>
> **Header de página**: H1 48px **"Nuestro menú"** + párrafo 17px "Cada creación está hecha por encargo, con ingredientes frescos y mucho cuidado en cada detalle." Breadcrumb: `Inicio / Menú`.
>
> **Filtros por categoría** (chips horizontales, scroll horizontal en móvil): **Todos · Pasteles · Cupcakes · Tartas · Galletas · Postres individuales**. Chip activo: fondo morado oscuro, texto crema. Chip inactivo: borde 1px crema, texto morado grisáceo, hover con borde morado oscuro. El filtro actualiza la URL (`?categoria=`) sin recargar la página; permite compartir el link filtrado.
>
> **Buscador simple** (opcional, a la derecha de los filtros en desktop): input con ícono de lupa, placeholder "Buscar un postre...", filtra por nombre en tiempo real (client-side, sin backend).
>
> **Grid de productos**: 4 columnas (desktop) / 2 (tablet) / 1 (móvil), gap 24px. Mismo componente de tarjeta que "Productos destacados" de Inicio (sección 3.3), pero mostrando **todo el catálogo**, no solo 4.
>
> **Catálogo completo** (12 productos — datos exactos, organizados por categoría):
>
> **Pasteles**
> 1. **Pastel de Chocolate** — "Chocolate intenso, crema de vainilla y ganache." — $18.500 — `pastel-de-chocolate`
> 2. **Red Velvet** — "Bizcocho suave, crema de queso y frutos rojos." — $16.200 — `red-velvet`
> 3. **Pastel de Zanahoria** — "Especias cálidas, nueces tostadas y frosting de queso crema." — $15.800 — `pastel-de-zanahoria`
>
> **Tartas**
> 4. **Tarta de Fresas** — "Base crujiente, crema pastelera y fresas frescas." — $14.800 — `tarta-de-fresas`
> 5. **Tarta de Limón** — "Curd de limón intenso sobre base crocante, merengue tostado." — $13.500 — `tarta-de-limon`
>
> **Postres individuales**
> 6. **Cheesecake** — "Cheesecake cremoso con coulis de frutos rojos." — $13.900 — `cheesecake`
> 7. **Mousse de Chocolate** — "Mousse aireado de chocolate 70%, crocante de avellanas." — $6.500 — `mousse-de-chocolate`
> 8. **Tiramisú Clásico** — "Capas de bizcocho al café, mascarpone y cacao." — $7.200 — `tiramisu-clasico`
>
> **Cupcakes**
> 9. **Cupcake Red Velvet** — "Versión individual del clásico, con cobertura de queso crema." — $3.200 — `cupcake-red-velvet`
> 10. **Cupcake de Vainilla** — "Bizcocho de vainilla de Madagascar, buttercream suave." — $2.900 — `cupcake-de-vainilla`
>
> **Galletas**
> 11. **Galletas de Chocolate** — "Crocantes por fuera, suaves por dentro, con trozos de chocolate." — $1.800 (unidad) / $9.500 (caja x6) — `galletas-de-chocolate`
> 12. **Alfajores Artesanales** — "Masa amantecada rellena de manjar, bañados en chocolate." — $2.200 (unidad) / $11.500 (caja x6) — `alfajores-artesanales`
>
> **Estado vacío del filtro** (si una búsqueda no encuentra resultados): ilustración lineal simple + texto "No encontramos nada con ese nombre. Probá con otra palabra o mirá el menú completo." + botón para limpiar filtros.
>
> **Móvil**: 1 columna, sin carrusel, filtros como fila con scroll horizontal.
>
> ---
>
> ## 5. PÁGINA: FICHA DE PRODUCTO (`/productos/[slug]`)
>
> Plantilla única, reutilizada para los 12 productos del catálogo (y cualquier producto futuro). El contenido varía por producto pero la estructura es idéntica.
>
> **Breadcrumb**: `Inicio / Menú / [Nombre del producto]`.
>
> ### 5.1 Cabecera de producto
> **Layout**: 2 columnas (55/45 galería-info en desktop). Móvil: galería arriba, info debajo.
>
> **Galería (izquierda)**:
> - 1 foto principal grande (radio 16px, aspect-ratio 4:5), con 3–4 miniaturas debajo (aspect-ratio 1:1) que cambian la foto principal al hacer clic/tap (sin librería pesada: JS simple).
> - Fotos sugeridas por producto: (1) producto entero, encuadre editorial · (2) corte transversal mostrando capas/relleno · (3) detalle de textura/decoración en macro · (4) producto en contexto (mesa servida, packaging).
> - `alt` único y descriptivo por cada foto (ej. "Corte del Pastel de Chocolate mostrando las tres capas de ganache").
>
> **Info (derecha)**:
> - Categoría (caption uppercase, rosado) enlaza de vuelta a `/menu?categoria=`.
> - H1 40px: nombre del producto.
> - Precio H3 24px 600 morado oscuro. Si el producto tiene variantes de tamaño/formato (ej. galletas y alfajores con precio por unidad y por caja), mostrar un selector tipo chip (**Unidad · Caja x6**) que actualiza el precio mostrado.
> - Descripción larga (2–3 párrafos, 17px, tono cálido y artesanal — no genérico de e-commerce). Ejemplo de tono para Pastel de Chocolate: "Nuestro pastel insignia. Tres capas de bizcocho de chocolate intenso, separadas por una crema de vainilla suave y cubiertas con un ganache brillante que se sirve recién templado. Ideal para quienes buscan un sabor clásico, hecho sin atajos."
> - **Selector de tamaño** (chips): Individual (6–8 porciones) · Mediano (10–12 porciones) · Grande (16–20 porciones), con nota de precio referencial por tamaño ("desde $X").
> - Botón primario **"Consultar disponibilidad por WhatsApp"** (relleno chocolate, ancho completo en móvil) — arma automáticamente un mensaje prellenado con el nombre del producto y el tamaño elegido.
> - Botón secundario **"Escribir por correo"** (contorno) — abre `mailto:` con asunto prellenado.
> - Micro-línea: "Pedidos con 48h de anticipación · Retiro en tienda o despacho a coordinar".
>
> ### 5.2 Detalles del producto (tabs o acordeón)
> Tres pestañas/acordeones (móvil siempre acordeón):
> - **Ingredientes**: lista simple, texto 15px, ej. "Harina, cacao, huevos, mantequilla, azúcar, crema de leche, esencia de vainilla, chocolate 70%."
> - **Alérgenos**: chips pequeños con ícono (ej. "Contiene gluten", "Contiene lácteos", "Puede contener frutos secos") — importante para accesibilidad alimentaria, no solo estética.
> - **Conservación y entrega**: "Se conserva refrigerado hasta 4 días. Sacar 20 minutos antes de servir. Disponible para retiro en tienda o despacho a coordinar por zona."
>
> ### 5.3 Personalización
> Bloque destacado (fondo crema, borde 1px crema, radio 16px): "¿Querés personalizar este pastel?" + texto corto + botón secundario a `/contacto?motivo=personalizado&producto=[nombre]`.
>
> ### 5.4 Productos relacionados
> H2 **"También te puede gustar"** + grid de 4 tarjetas (mismo componente que Menú) con productos de la misma categoría o categorías afines. Mismo comportamiento de hover que el resto del sitio.
>
> ### 5.5 Reseñas del producto (opcional, estático)
> 2–3 testimonios cortos específicos del producto (mismo formato visual que la sección de Testimonios de Inicio, en versión compacta de 1 columna), con nombre y fecha aproximada (ej. "Marzo 2026"). Como el sitio no tiene backend, estos son contenido estático curado, no un sistema de reseñas en vivo.
>
> ---
>
> ## 6. PÁGINA: NOSOTROS (`/nosotros`)
>
> **Hero de página**: H1 48px **"Detrás de cada pastel, hay una historia."** + párrafo 17px introductorio (máx 640px) + foto ancha (16:9, radio 16px) del obrador o del equipo trabajando.
>
> **Nuestra historia**: bloque de texto en 2 columnas (texto 60% / foto 40%, alternando lado en cada bloque si hay más de uno), narrando el origen de Dulce Atelier (ej. "Dulce Atelier nació en 2019 en una cocina de barrio, con la idea simple de hacer pasteles como los que ya no se encuentran fácil: con mantequilla de verdad, sin mezclas industriales y con tiempo suficiente para que cada receta salga bien."). Texto de ejemplo editable, tono cercano y humano, no corporativo.
>
> **Nuestros valores**: grid de 3–4 tarjetas simples (ícono lineal + título H4 + 1 línea), ej. **Ingredientes reales** · **Hecho a mano** · **Producción a pequeña escala** · **Cero atajos**.
>
> **El equipo** (opcional si hay fotos disponibles): grid de 3–4 tarjetas con foto circular o 1:1 con radio 16px, nombre, rol (ej. "Fundadora y pastelera principal"), 1 línea personal. Fotos con el mismo brief de luz natural cálida.
>
> **El obrador**: mini-galería de 4–6 fotos (grid 2x2 o 2x3) del espacio de trabajo — mesas de madera, utensilios, ingredientes ordenados, proceso de horneado — para transmitir transparencia y calidad artesanal.
>
> **CTA de cierre**: banda con fondo morado oscuro, texto centrado "¿Querés probar lo que hacemos?" + botón **"Ver menú"** (a `/menu`) + botón secundario **"Escribinos"** (a `/contacto`).
>
> ---
>
> ## 7. PÁGINA: CONTACTO (`/contacto`)
>
> **Hero de página**: H1 48px **"Hablemos de tu próxima celebración"** + párrafo 17px "Contanos qué estás buscando y te respondemos a la brevedad." Breadcrumb: `Inicio / Contacto`.
>
> **Layout principal**: 2 columnas (55/45 en desktop). Móvil: formulario primero, info de contacto debajo.
>
> ### 7.1 Formulario (izquierda)
> Como el sitio no tiene backend, el formulario envía por uno de estos dos caminos (a elección de implementación, documentar cuál se usa):
> - (a) `mailto:` con los campos armados en el cuerpo del correo, o
> - (b) un servicio externo de formularios estático tipo Formspree/Getform (sin backend propio).
>
> Campos:
> - **Nombre** (texto, requerido).
> - **Correo electrónico** (email, requerido, validación de formato).
> - **Teléfono / WhatsApp** (tel, opcional).
> - **Motivo** (select): Pedido personalizado · Consulta sobre el menú · Cotización para evento · Otro. Si el usuario llega desde `/contacto?motivo=personalizado`, este campo viene preseleccionado.
> - **Producto de interés** (texto libre u opcional, se precompleta si llega `?producto=` en la URL).
> - **Fecha del evento** (date, opcional).
> - **Mensaje** (textarea, requerido, mín. 20 caracteres).
> - Checkbox de consentimiento simple: "Acepto ser contactado/a por Dulce Atelier para responder esta consulta."
> - Botón **"Enviar mensaje"** (relleno morado oscuro, ancho completo en móvil), con estado de carga (spinner simple) y estado de confirmación ("¡Gracias! Te responderemos dentro de 24 horas hábiles." — fondo verde suave, ícono de check).
> - Manejo de error inline por campo (borde rojo suave, texto de error 13px debajo del input, `aria-live="polite"`).
>
> ### 7.2 Información de contacto (derecha)
> Tarjeta blanca, radio 16px, borde 1px crema:
> - **WhatsApp**: +56 9 1234 5678, con botón directo "Escribir por WhatsApp" (ícono + mensaje prellenado).
> - **Email**: hola@dulceatelier.cl (mailto directo).
> - **Instagram**: @dulceatelier (enlace externo).
> - **Dirección**: Av. Alameda 1234, Santiago — con mapa embebido (iframe de OpenStreetMap o Google Maps estático, sin API keys si se usa el embed público) debajo, radio 16px.
> - **Horarios de atención**: tabla simple de 2 columnas (día / horario), ej. "Lunes a viernes: 9:00–19:00 · Sábados: 9:00–14:00 · Domingos: cerrado".
> - **Tiempo de respuesta esperado**: micro-texto "Normalmente respondemos dentro de 24 horas hábiles."
>
> ### 7.3 Mini-FAQ de contacto
> 3 preguntas cortas específicas de logística (con enlace a la FAQ completa): "¿Con cuánta anticipación debo pedir?" · "¿Hacen despacho?" · "¿Puedo pagar por transferencia?" — formato acordeón compacto, mismo componente visual que la página de FAQ (sección 8).
>
> ---
>
> ## 8. PÁGINA: PREGUNTAS FRECUENTES (`/preguntas-frecuentes`)
>
> **Hero de página**: H1 48px **"Preguntas frecuentes"** + párrafo introductorio corto. Breadcrumb: `Inicio / Preguntas frecuentes`.
>
> **Layout**: lista de acordeones agrupados por categoría, ancho máximo 760px centrado.
>
> **Categorías y preguntas de ejemplo** (contenido editable, mínimo 3 preguntas por categoría):
>
> **Pedidos**
> - ¿Con cuánta anticipación debo hacer mi pedido? — "Recomendamos al menos 48 horas de anticipación para pedidos estándar y 7 días para pasteles personalizados o eventos grandes."
> - ¿Puedo modificar mi pedido después de confirmarlo? — texto de respuesta.
> - ¿Hacen pedidos para eventos grandes o corporativos? — texto de respuesta.
>
> **Entregas**
> - ¿Hacen despacho a domicilio? — texto de respuesta con zonas y costos referenciales.
> - ¿Puedo retirar en tienda? — texto de respuesta con dirección y horario.
> - ¿Cómo se transportan los pasteles grandes? — texto de respuesta.
>
> **Pagos**
> - ¿Qué medios de pago aceptan? — "Transferencia bancaria y efectivo. Próximamente pago con tarjeta en tienda."
> - ¿Piden un anticipo para reservar? — texto de respuesta.
>
> **Personalización**
> - ¿Puedo elegir el sabor y el relleno? — texto de respuesta.
> - ¿Hacen diseños a partir de una foto de referencia? — texto de respuesta.
> - ¿Tienen opciones sin gluten o veganas? — texto de respuesta honesto (si no se ofrece, decirlo claramente en vez de omitirlo).
>
> **Componente acordeón**: header con pregunta (17px 600) + ícono `+` que rota a `×` al abrir (200ms), contenido con fade+slide suave, solo un ítem abierto a la vez por categoría (opcional), `aria-expanded` y `aria-controls` correctos para accesibilidad.
>
> **Cierre de página**: "¿No encontraste lo que buscabas?" + botón a `/contacto`.
>
> ---
>
> ## 9. PÁGINA 404
>
> Mismo header/footer del sitio. Contenido centrado: ilustración lineal simple (ej. un pastel "a medio hacer" o una miga de pan, en línea con la paleta), H2 **"Esta página se nos quemó en el horno"**, párrafo corto, botón primario **"Volver al inicio"** + enlace secundario **"Ver el menú"**.
>
> ---
>
> ## 10. Banco de imágenes necesario (resumen para producción fotográfica o de placeholders)
>
> Para que el sitio quede completo, listar como checklist de producción (mismo brief de luz/fondo/encuadre en todos los casos):
>
> - **Home**: hero (1) · categorías (5) · productos destacados (4, pueden reutilizar fotos de fichas) · editorial "hecho a mano" (1) · pastel personalizado (3) · galería (6–9) · CTA final (1 fondo) = **~21–24 fotos**.
> - **Fichas de producto**: 4 fotos por producto (entero, corte, macro, contexto) × 12 productos = **48 fotos**. Se puede optimizar reutilizando la foto "de contexto" entre productos muy similares (ej. cupcakes), pero cada producto necesita mínimo su foto "entero" y "corte/detalle" propias.
> - **Nosotros**: hero (1) · historia (2–3) · equipo (3–4) · obrador (4–6) = **~10–14 fotos**.
> - **Contacto**: ninguna foto obligatoria (el mapa reemplaza la necesidad de foto de fachada), pero se puede sumar 1 foto de fachada/local si existe.
>
> **Total estimado**: ~85–95 fotografías únicas para el sitio completo con fichas de producto individuales. Documentar esto para quien vaya a producir o encargar el material fotográfico.
>
> ---
>
> ## 11. FOOTER (global, todas las páginas)
>
> **Layout**: fondo morado oscuro, contenido en 1200px, 4 columnas (desktop) / 2 (tablet) / 1 (móvil), padding 80px vertical.
>
> - **Columna 1 (marca)**: wordmark **Dulce Atelier** (crema, 600) + "Pastelería artesanal para momentos especiales." (crema, 15px) + 3 iconos de redes (Instagram, Facebook, WhatsApp — lineales, 20px, hover rosado).
> - **Explorar**: Inicio · Menú · Nosotros · Contacto.
> - **Ayuda**: Preguntas frecuentes · Cómo pedir · Despacho y entregas (ancla a la sección correspondiente de FAQ) · Contacto.
> - **Contacto**: WhatsApp (+56 9 1234 5678) · Instagram (@dulceatelier) · Email (hola@dulceatelier.cl) · Dirección (Av. Alameda 1234, Santiago).
> - Links crema 15px con hover → blanco + subrayado.
>
> **Barra final**: borde superior 1px crema al 15%, texto 13px centrado: **"© 2026 Dulce Atelier. Todos los derechos reservados."**
>
> ---
>
> ### REGLAS IMPORTANTES
>
> El sitio debe sentirse como una **marca real**, no como una plantilla genérica de restaurante o repostería.
>
> Prioriza:
> 1. Fotografías grandes y de alta calidad, consistentes en las 7 páginas (mismo brief de luz, fondo y encuadre en todo el sitio).
> 2. Excelente jerarquía tipográfica (solo tamaño y peso, Inter en toda la interfaz, incluyendo formularios).
> 3. Mucho espacio negativo (96–120px entre secciones en páginas de landing; 1040px de ancho máximo en páginas de texto).
> 4. Interacciones y animaciones discretas (reveal suave, hovers sutiles, `prefers-reduced-motion`).
> 5. Diseño responsive real (3 breakpoints verificados en cada página, no solo en Inicio).
> 6. Navegación clara y consistente (navbar fijo con blur al scrollear, breadcrumbs, menú hamburguesa accesible, footer idéntico en todas las páginas).
> 7. Conversión hacia **"Hacer un pedido"** en cada página relevante (navbar, hero de Inicio, ficha de producto, personalizado, cierre final, contacto).
> 8. Identidad visual coherente en todo el sitio (la paleta rosa/morado/blanco derivada al sistema de diseño de `02-design.md`, radios, sombras y fotografía consistentes entre Inicio, Menú, fichas de producto, Nosotros, Contacto y FAQ).
> 9. Cada producto del catálogo tiene su propia página completa y navegable (`/productos/[slug]`), no solo una tarjeta en un grid.
> 10. El formulario de Contacto y los CTAs de WhatsApp son los únicos "sistemas" de conversión — nunca implementar carrito, checkout, cuentas de usuario ni backend propio.
>
> No agregar funcionalidades de administración. No crear login. No crear dashboard. No crear sistema de gestión de pedidos ni de inventario. Los botones de pedido son siempre CTAs de contacto (WhatsApp, `mailto:` o formulario estático) — no implementes carrito ni pasarela de pago.
>
> Diseñar el **sitio público completo**: Inicio, Menú, ficha individual por cada uno de los 12 productos, Nosotros, Contacto, Preguntas frecuentes y 404 — todo bajo el mismo sistema de diseño, header y footer.
