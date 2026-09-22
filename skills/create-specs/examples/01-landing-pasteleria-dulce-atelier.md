# Prompt de ejemplo: landing pública de pastelería (Dulce Atelier)

Uso: pegá este prompt después de `/create-specs`.

> /create-specs Generá las specs del siguiente proyecto.
>
> **Proyecto**: landing **solo frontend, 100% estático** (HTML/CSS/JS o Astro, sin backend, sin base de datos, sin panel administrativo) para una pastelería artesanal llamada **"Dulce Atelier"**.
>
> La página es únicamente la **parte pública del sitio web**. No diseñes dashboard, panel administrativo, login, registro, checkout interno ni páginas privadas — el proyecto **no tiene backend ni autenticación**.
>
> ---
>
> ### Sistema de diseño (aplica a TODA la página)
>
> **Paleta** (valores exactos):
> - Fondo base: `#FFF9F3` (crema) · blanco puro para tarjetas: `#FFFFFF`
> - Texto principal: `#2E1B12` (chocolate oscuro) · texto secundario: `#7A5C4E` (chocolate suave)
> - Acento rosado (solo en detalles y CTAs secundarios): `#E8A0A0` · hover del acento: `#D98A8A`
> - Bordes y separadores: `#F0E4D8`
>
> **Tipografía**: **Inter** en toda la interfaz (display, texto, botones — sin excepciones, sin fuentes manuscritas ni serif).
> - Escala: display 64px/1.1 (solo hero), H2 40px/1.2, H3 24px/1.3, body 17px/1.6, caption 13px/1.4.
> - H2 con `letter-spacing: -0.01em`; body normal; captions con `letter-spacing: 0.06em` + uppercase.
> - Jerarquía siempre por tamaño y peso (500/600), nunca por color solo.
>
> **Espaciado**: secciones separadas por 96–120px; gutter de contenedor 24px (móvil) / 32px (tablet) / 48px (desktop); ancho máximo de contenido 1200px.
>
> **Formas y sombras**: radios 12–16px (tarjetas) y 999px (botones/inputs); sombras solo `0 8px 30px rgba(46,27,18,0.08)` — muy suaves, nada de drop shadows duras ni neumorfismo.
>
> **Fotografía (regla global)**: todas las fotos propias de pastelería, con brief visual idéntico — luz natural difusa lateral, fondo neutro cálido (crema o madera clara), encuadre editorial (no centrado perfecto), profundidad de campo baja, saturadas pero no artificiales. Cada imagen con `alt` descriptivo ("Pastel de chocolate de tres capas con ganache brillante").
>
> **Animaciones globales**: solo reveal al hacer scroll (fade-up 400ms, `ease-out`, `translateY(16px)→0`), con `prefers-reduced-motion: reduce` que las desactiva. Sin parallax, sin marquesinas, sin autoplay.
>
> **Responsive**: desktop ≥1024px · tablet 768–1023px · móvil <768px. Ninguna sección puede quedar con texto cortado o con scroll horizontal.
>
> **Accesibilidad**: contraste AA en todo texto, focus visible en todos los enlaces/botones, navegación completa por teclado, menú móvil con `aria-expanded`, iconos decorativos con `aria-hidden`.
>
> ---
>
> ## 1. HEADER / NAVBAR
>
> **Layout**: barra fija arriba (74px de alto), contenido en contenedor de 1200px: logo a la izquierda, enlaces centrados, CTA a la derecha.
> - Logo: wordmark **"Dulce Atelier"** en Inter 600, 20px, color `#2E1B12` (sin icono).
> - Enlaces: **Inicio · Pasteles · Menú · Nosotros · Contacto** (17px, color `#7A5C4E`).
> - CTA derecha: botón **"Hacer pedido"** (relleno chocolate `#2E1B12`, texto crema, radio 999px, padding 12x28px).
>
> **Comportamiento**:
> - Al scrollear 40px+: navbar pasa a fondo `rgba(255,249,243,0.85)` + `backdrop-filter: blur(12px)` + borde inferior `1px #F0E4D8`. Antes de eso, fondo totalmente transparente.
> - Enlaces hover: color `#2E1B12` + subrayado animado (2px, ancho 0→100%, 200ms).
> - CTA hover: reversa (fondo crema, texto chocolate) con sombra suave suave.
>
> **Móvil (<768px)**: menú hamburguesa (3 líneas, animación a ✕ al abrir). Panel desplegable a pantalla completa con fondo crema, enlaces 24px con espacio generoso, CTA ancho completo. Cerrar con ✕ o tocando fuera. El scroll del body se bloquea mientras está abierto.
>
> ---
>
> ## 2. HERO
>
> **Layout**: 2 columnas (60/40), min-height 92vh, contenedor 1200px centrado verticalmente. Desktop: texto izquierda, foto derecha. Tablet: 50/50. Móvil: columna única (texto, luego foto).
>
> **Contenido (izquierda)**:
> - Eyebrow: **PASTELERÍA ARTESANAL** — caption 13px uppercase, `letter-spacing 0.08em`, color `#E8A0A0`.
> - H1 display 64px: **"Momentos especiales merecen algo dulce."** — 2 líneas, la palabra "dulce" en itálica (estilo Inter Italic) y color chocolate.
> - Párrafo (17px, máx 520px): "Pasteles y postres hechos artesanalmente con ingredientes seleccionados, recetas cuidadas y mucho cariño."
> - Botones: **Ver pasteles** (primario, relleno chocolate) · **Hacer un pedido** (secundario, contorno 2px `#2E1B12`).
> - Micro-línea: "Pedidos con 48h de anticipación" con punto rosado decorativo.
>
> **Foto (derecha)**: pastel de chocolate de 3 capas recién decorado sobre pedestal de cerámica, luz lateral, fondo crema difuso, ganache brillante con movimiento capturado. Proporción 4:5, radio 20px, **sin marco ni sombra dura** (ocupa todo el alto de la columna). Hover: escala 1.02 suave (600ms).
>
> **Debajo del hero** (dentro de la misma sección, borde superior `1px #F0E4D8`): 3 indicadores en fila, cada uno con check rosado y texto 17px — **100% artesanal · Ingredientes seleccionados · Pedidos personalizados**. Móvil: apilados verticalmente con espaciado 16px.
>
> ---
>
> ## 3. CATEGORÍAS / EXPLORAR
>
> **Layout**: grid editorial asimétrico de 5 tarjetas en 2 filas (desktop): una tarjeta ancha (2 columnas, foto vertical 4:5), una estrecha (1 columna, foto horizontal 16:10), segunda fila invertida. Tablet: 3+2. Móvil: 1 columna, tarjetas 4:5.
>
> **Encabezado**: H2 **"Algo para cada ocasión"** + párrafo 17px "Descubre nuestras creaciones y encuentra el postre perfecto para tu momento." (máx 560px).
>
> **Tarjetas** (5): **Pasteles · Cupcakes · Tartas · Galletas · Postres individuales**.
> - Cada tarjeta: foto (brief propio: pastel completo en pedestal / cupcake en primer plano con cobertura en espiral / tarta de frutas en rejilla de horno / stack de galletas artesanales / vaso de postre en capas), título H3 24px, enlace **"Explorar →"** (17px, chocolate, flecha que se desplaza 4px a la derecha al hover).
> - Hover de tarjeta: elevación sutil (foto escala 1.03, 500ms) + sombra suave. Sin flip, sin zoom exagerado.
> - Fondos alternados entre tarjetas: blanco y crema, para reforzar el ritmo editorial.
>
> ---
>
> ## 4. PRODUCTOS DESTACADOS
>
> **Layout**: grid de 4 columnas (desktop, gap 24px) / 2 tablet / 1 móvil. Encabezado H2: **"Los favoritos de la casa"** + enlace a la derecha **"Ver menú completo →"**.
>
> **Cada tarjeta de producto** (blanco, radio 16px, sombra suave; 3:4 de alto total):
> - Foto 3:4 (brief: pastel entero/porción estilizada, luz difusa, fondo crema).
> - Nombre H3 24px · descripción 15px `#7A5C4E` (máx 2 líneas, elipsis) · precio 17px 600 en chocolate (formato "$12.900").
> - Botón **"Ver producto"** (texto chocolate, contorno fino a todo el ancho inferior; hover: relleno chocolate + texto crema).
>
> **Productos (datos exactos)**:
> 1. **Pastel de Chocolate** — "Chocolate intenso, crema de vainilla y ganache." — $18.500
> 2. **Red Velvet** — "Bizcocho suave, crema de queso y frutos rojos." — $16.200
> 3. **Tarta de Fresas** — "Base crujiente, crema pastelera y fresas frescas." — $14.800
> 4. **Cheesecake** — "Cheesecake cremoso con coulis de frutos rojos." — $13.900
>
> **Móvil**: 1 columna, tarjetas apiladas, botón siempre visible. Sin carrusel.
>
> ---
>
> ## 5. SECCIÓN EDITORIAL
>
> **Layout**: 2 columnas 55/45, fondo alterno crema (`#FFF9F3` → sección sobre fondo blanco con bordes laterales amplios). Desktop: foto izquierda, texto derecha. Móvil: foto arriba (ancho completo, 4:5), texto debajo.
>
> **Foto**: persona decorando un pastel con manga pastelera — manos en acción, encuadre cerrado (sin rostro completo, atmósfera de taller), luz de ventana, fondo con ingredientes desenfocados. `alt` descriptivo.
>
> **Contenido**:
> - Eyebrow caption uppercase **HECHO A MANO** (color `#E8A0A0`).
> - H2 40px: **"Cada detalle importa."**
> - Párrafo (máx 480px): "Desde la preparación de nuestras masas hasta la decoración final, cada creación pasa por nuestras manos. Queremos que cada pastel no solo se vea especial, sino que también se recuerde."
> - Botón **"Conoce nuestra historia"** (primario chocolate).
> - Debajo: firma en Inter 600 15px: "— Dulce Atelier" (tono humano, no manuscrita).
>
> ---
>
> ## 6. PASTEL PERSONALIZADO
>
> **Layout**: sección con fondo `#2E1B12` (chocolate oscuro) — es la ÚNICA sección de fondo oscuro, para crear contraste. Texto centrado, ancho 720px.
>
> **Contenido**:
> - H2 blanco: **"¿Tienes algo especial en mente?"**
> - Párrafo `#E8D9CF`: "Diseñamos pasteles personalizados para cumpleaños, bodas, aniversarios y cualquier celebración."
> - Botón principal: **"Solicitar un pastel personalizado"** (relleno crema `#FFF9F3`, texto chocolate; hover: relleno rosado `#E8A0A0`).
> - Lista de 4 checks en 2 columnas (desktop), checks rosados, texto crema: **✓ Diseño personalizado · ✓ Sabores a elección · ✓ Tamaños diferentes · ✓ Decoración artesanal**.
>
> **Galería mini** (opcional, si hay espacio): 3 fotos horizontales de pasteles personalizados (boda, cumpleaños, empresarial) con radio 16px y `alt` propio. Móvil: ocultar 1 foto.
>
> ---
>
> ## 7. PROCESO
>
> **Layout**: 3 columnas iguales (desktop) / 1 columna apilada (móvil), mucho espacio negativo (padding vertical 120px, gap 48px).
>
> **Encabezado**: H2 **"Así de fácil"** + párrafo corto "Tres pasos, cero complicaciones."
>
> **Pasos** (número gigante 96px Inter 600 en `#F0E4D8` de fondo suave + contenido):
> - **01 — Elige**: "Explora nuestros sabores y diseños." — icono de magdalena (lineal, 1.5px, chocolate).
> - **02 — Personaliza**: "Cuéntanos cómo quieres tu pastel." — icono de lápiz/boletín.
> - **03 — Recibe**: "Preparamos tu pedido y coordinamos la entrega." — icono de camioneta sencilla.
> - Lineal: los números llevan el peso visual; los iconos son pequeños (32px) y decorativos.
>
> **Móvil**: pasos apilados con línea vertical conectora izquierda.
>
> ---
>
> ## 8. TESTIMONIOS
>
> **Layout**: 3 tarjetas blancas en fila (desktop) / 1 columna (móvil), gap 24px, radio 16px, borde `1px #F0E4D8`, sin sombra.
>
> **Encabezado**: H2 **"Lo que dicen nuestros clientes"**.
>
> **Tarjetas** (sin estrellas ni fotos de avatar — solo texto, elegante):
> - "Además de precioso, estaba delicioso. Todos preguntaron dónde lo habíamos comprado." — **María**
> - "El pastel quedó exactamente como lo imaginábamos." — **Andrea**
> - "Excelente atención y el sabor fue increíble." — **Carlos**
> - Formato: comilla decorativa rosada grande (tipográfica, no imagen), texto 18px/1.5, nombre en 15px 600 chocolate.
> - Línea superior suave por tarjeta: un recuadrito de 3cm con talla de texto 11px ("Pedido de cumpleaños", "Pastel personalizado", "Entrega a domicilio") — detalle editorial que humaniza.
>
> ---
>
> ## 9. GALERÍA
>
> **Layout**: masonry grid con CSS `columns` (desktop: 3 columnas, gap 16px; tablet: 2; móvil: 1). 6–9 fotos en alturas variadas (2:3, 1:1, 3:4 alternadas).
>
> **Fotos (briefs)**: pastel completo encendido con velas · cupcakes con cobertura en espiral (primer plano) · decoración de flores comestibles (macro) · preparación de masa en bowl de cerámica · ingredientes en mesa de madera · detalle de ganache cayendo. Todas con luz natural, paleta cálida, `alt` propio.
>
> **Cierre**: enlace centrado **"Síguenos en Instagram →"** (17px, chocolate, flecha desplazada en hover) con pequeño icono de Instagram (lineal).
>
> **Interacción**: fade-up al scroll por grupo de fotos (no individual — evita el parpadeo). Hover: ligero zoom 1.03 con sombra suave.
>
> ---
>
> ## 10. CTA FINAL
>
> **Layout**: sección de ancho completo con fondo fotográfico (pastel en mesa de madera, oscurecido con overlay `rgba(46,27,18,0.55)` para legibilidad), texto centrado, padding 140px vertical.
>
> **Contenido**:
> - H2 blanco (60px): **"Haz que tu próxima celebración sea un poco más dulce."**
> - Párrafo `#F0E4D8` (máx 560px): "Cuéntanos qué estás celebrando y nosotros nos encargamos del resto."
> - Botones centrados: **"Hacer un pedido"** (relleno crema, texto chocolate — máximo contraste sobre la foto) + **"Hablar por WhatsApp"** (contorno 2px crema, texto crema, icono de WhatsApp; hover: relleno rosado).
>
> **Accesibilidad**: el overlay garantiza contraste AA sobre la foto; el `alt` de fondo va vacío (`aria-hidden`) — la foto es decorativa.
>
> ---
>
> ## 11. FOOTER
>
> **Layout**: fondo `#2E1B12` (chocolate, continuando el CTA oscuro), contenido en 1200px, 4 columnas (desktop) / 2 (tablet) / 1 (móvil), padding 80px vertical.
>
> - **Columna 1 (marca)**: wordmark **Dulce Atelier** (crema, 600) + "Pastelería artesanal para momentos especiales." (`#E8D9CF`, 15px) + 3 iconos de redes (Instagram, Facebook, WhatsApp — lineales, 20px, hover rosado).
> - **Explorar**: Inicio · Pasteles · Menú · Nosotros.
> - **Ayuda**: Preguntas frecuentes · Pedidos · Entregas · Contacto.
> - **Contacto**: WhatsApp (+56 9 1234 5678) · Instagram (@dulceatelier) · Email (hola@dulceatelier.cl) · Dirección (Av. Alameda 1234, Santiago).
> - Links crema `#E8D9CF` 15px con hover → blanco + subrayado.
>
> **Barra final**: borde superior `1px rgba(255,249,243,0.15)`, texto 13px centrado: **"© 2026 Dulce Atelier. Todos los derechos reservados."**
>
> ---
>
> ### REGLAS IMPORTANTES
>
> La landing debe sentirse como una **marca real**, no como una plantilla genérica de restaurante.
>
> Prioriza:
> 1. Fotografías grandes y de alta calidad (con brief visual como se define arriba).
> 2. Excelente jerarquía tipográfica (solo tamaño y peso, Inter en toda la interfaz).
> 3. Mucho espacio negativo (96–120px entre secciones).
> 4. Interacciones y animaciones discretas (reveal suave, hovers sutiles, `prefers-reduced-motion`).
> 5. Diseño responsive real (3 breakpoints verificados en cada sección).
> 6. Navegación clara (navbar fijo con blur al scrollear, menú hamburguesa accesible).
> 7. Conversión hacia **"Hacer un pedido"** (CTA en navbar, hero, custom y cierre final).
> 8. Identidad visual coherente (paleta exacta, radios, sombras y fotografía consistentes).
>
> No agregar funcionalidades de administración. No crear login. No crear dashboard. No crear sistema de gestión de pedidos. Los botones de pedido son CTAs de contacto (enlace a WhatsApp o formulario `mailto:`) — no implementes carrito.
>
> Solo diseñar la **landing page pública completa**, desde el navbar hasta el footer.