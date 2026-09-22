# Referencia de estilo: ejemplo de `documentacion-cliente.md` (CURSINET)

Este archivo es un **ejemplo de salida** — muestra cómo debe sentirse y estructurarse `specs/documentacion-cliente.md` (el documento de negocio para el cliente, en lenguaje no técnico). Corresponde al template de 12 secciones del SKILL.md de create-specs. Es un proyecto real distinto al que se esté especificando: se usa como molde de estilo, redacción y formato, nunca como contenido copiable.

---

📚 **CURSINET**

Plataforma de Educación en Línea

Documentación General del Sistema

Presentación de Examen

---

## 1. Introducción

CURSINET es una plataforma en línea que permite a instructores crear y vender cursos digitales, y a estudiantes inscribirse, aprender y obtener certificados. Es un sistema completo, similar a plataformas como Udemy o Platzi, pensado para conectar a quienes enseñan con quienes quieren aprender.

El sistema soporta distintos tipos de contenido dentro de un curso: videos, textos, cuestionarios (quizzes), ejercicios de código y archivos descargables. Además, cuenta con paneles especiales para administradores e instructores, donde pueden ver estadísticas y gestionar la plataforma.

**¿Qué resuelve CURSINET?**

- Permite a un instructor organizar su conocimiento en cursos, con módulos y lecciones.
- Permite a un estudiante comprar un curso de forma segura y acceder al contenido de inmediato.
- Lleva el control del avance del estudiante dentro de cada curso.
- Entrega un certificado automático cuando el estudiante termina el curso.
- Brinda a los administradores información clara sobre el desempeño de la plataforma (ventas, usuarios, cursos más vendidos, etc.).

## 2. Visión General del Sistema

El funcionamiento de CURSINET se puede resumir en seis grandes etapas, desde que un instructor crea un curso hasta que un estudiante lo termina y lo califica:

1. **Creación**: el instructor arma el curso, lo organiza en módulos y lecciones, y lo publica.
2. **Descubrimiento**: los estudiantes exploran el catálogo y filtran cursos por categoría o nivel.
3. **Compra**: el estudiante se inscribe pagando con PayPal, o de forma gratuita si el curso es free.
4. **Aprendizaje**: el estudiante ve los videos, lee los textos, resuelve quizzes, toma notas y comenta.
5. **Seguimiento**: el sistema registra el avance y entrega el certificado al finalizar.
6. **Evaluación**: el estudiante puede calificar y dejar una reseña del curso.

**Roles dentro del sistema**

CURSINET define cuatro tipos de usuario, cada uno con permisos distintos:

| Rol | ¿Qué puede hacer? |
|-----|-------------------|
| Estudiante | Se inscribe a cursos, consume el contenido y obtiene certificados. |
| Instructor | Crea, edita y publica sus propios cursos, módulos y lecciones. |
| Administrador | Tiene acceso total: gestiona usuarios, cursos y estadísticas de toda la plataforma. |
| Moderador | Tiene permisos limitados para revisar cursos y gestionar usuarios básicamente. |

## 3. Cómo está organizado el sistema (Arquitectura)

CURSINET está dividido en dos grandes partes: el Backend (la parte que procesa la información y las reglas del negocio) y el Frontend (la parte visual con la que interactúa el usuario). Ambas partes están organizadas en capas para que el sistema sea ordenado, fácil de mantener y de escalar.

**Backend: organización por capas**

El backend está dividido en cuatro capas, cada una con una responsabilidad clara:

- **Capa de Presentación**: recibe las peticiones (por ejemplo, cuando alguien inicia sesión o compra un curso) y valida que la información venga correcta.
- **Capa de Aplicación**: contiene la lógica de los procesos, como "crear un curso" o "confirmar un pago".
- **Capa de Infraestructura**: se conecta con la base de datos y con servicios externos como PayPal o el envío de correos.
- **Capa de Dominio**: contiene las reglas de negocio puras del sistema, sin depender de ninguna tecnología externa.

Esta forma de organizar el backend se llama Clean Architecture (Arquitectura Limpia). La idea principal es que el centro del sistema (las reglas de negocio) no dependa de detalles técnicos como la base de datos o el proveedor de pagos, para que sea más fácil cambiarlos en el futuro sin afectar el resto del sistema.

**Frontend: organización por módulos**

El frontend está construido con Next.js y organizado por módulos funcionales, es decir, cada parte de la aplicación (inicio, cursos, reproductor de lecciones, pagos, panel de administración) tiene su propio espacio de código, lo que facilita encontrar y modificar cada funcionalidad.

- **Páginas**: las distintas secciones visibles como el sitio público, el login, el panel del estudiante, del instructor y del administrador.
- **Módulos funcionales**: bloques de funcionalidad como inicio, catálogo de cursos, reproductor de lecciones y pagos.
- **Código compartido**: componentes visuales, funciones y utilidades que se usan en todo el sistema.

## 4. Tecnologías Utilizadas

A continuación se resumen las principales herramientas usadas para construir la plataforma, explicadas de forma sencilla.

**Backend**

| Tecnología | ¿Para qué se usa? |
|------------|-------------------|
| .NET / C# | Lenguaje y framework principal para construir toda la lógica del servidor. |
| PostgreSQL | Base de datos donde se guarda toda la información del sistema. |
| Entity Framework Core | Herramienta que conecta el código con la base de datos. |
| JWT | Tecnología usada para manejar el inicio de sesión de forma segura. |
| BCrypt | Se usa para proteger las contraseñas de los usuarios. |
| Cloudflare R2 (Minio SDK) | Almacenamiento de imágenes de los cursos. |
| SendGrid | Envío de correos electrónicos (verificación, recuperación de contraseña, etc.). |
| QuestPDF | Generación de los certificados en formato PDF. |

**Frontend**

| Tecnología | ¿Para qué se usa? |
|------------|-------------------|
| Next.js / React | Framework principal para construir toda la interfaz visual. |
| TypeScript | Lenguaje que ayuda a evitar errores en el código. |
| Zustand | Manejo del estado de la aplicación (por ejemplo, saber qué usuario está conectado). |
| Zod | Validación de formularios. |
| Tailwind CSS / CSS Modules | Estilos y diseño visual de la plataforma. |
| Plyr | Reproductor de videos de YouTube dentro de las lecciones. |
| PayPal SDK | Botón e integración de pagos con PayPal. |
| @dnd-kit | Permite arrastrar y soltar para reordenar módulos y lecciones. |

**Infraestructura**

El sistema se despliega usando Docker, lo que permite empaquetar toda la aplicación (backend, base de datos, etc.) para que funcione igual en cualquier servidor. Además, se apoya en servicios externos como PayPal para pagos, SendGrid para correos y Cloudflare R2 para almacenamiento de imágenes.

## 5. Base de Datos

CURSINET utiliza PostgreSQL como motor de base de datos, con un total de 32 tablas que representan toda la información del sistema: usuarios, cursos, pagos, progreso, certificados, etc. A continuación se agrupan las tablas por tema para entenderlas más fácilmente.

**Usuarios y autenticación** — Guardan la información de las cuentas, sesiones activas, verificación de correo y configuración de seguridad de cada usuario: `Users`, `Accounts`, `Sessions`, `Verifications`, `UserTwoFactor`, `UserNotificationPreferences`.

**Auditoría y seguridad** — Registran actividad importante del sistema, como los intentos de inicio de sesión o los cambios realizados en la plataforma, para tener trazabilidad y seguridad: `LoginLogs`, `PasswordResetLogs`, `EmailVerificationLogs`, `AuditLogs`.

**Catálogo de cursos** — Contienen la información de los cursos y su organización interna: `Categories`, `Tags`, `CourseTags`, `Courses`, `Modules`, `Lessons`.

**Evaluaciones (Quizzes)** — Guardan las preguntas, opciones y los intentos que realizan los estudiantes al resolver un cuestionario: `Quizzes`, `QuizQuestions`, `QuizOptions`, `QuizAttempts`, `QuizAttemptAnswers`.

**Aprendizaje y progreso** — Registran el avance del estudiante, sus notas personales, comentarios, cursos favoritos y certificados obtenidos: `Enrollments`, `LessonProgress`, `LessonNotes`, `Comments`, `Bookmarks`, `Certificates`.

**Pagos y suscripciones** — Almacenan la información de los pagos realizados, las suscripciones activas y las reseñas dejadas por los estudiantes: `Payments`, `PayPalWebhookEvents`, `Subscriptions`, `Reviews`.

**Notificaciones** — Guardan las notificaciones que se muestran a cada usuario dentro de la plataforma: `Notifications`.

**Algunas reglas importantes de la base de datos**

- Cada registro tiene un identificador único generado automáticamente (UUID).
- Se guarda la fecha de creación de cada registro.
- En vez de borrar información de forma definitiva, se marca como "eliminada" (borrado lógico), para poder recuperarla si es necesario.
- Existen reglas que evitan duplicados, por ejemplo, que un mismo estudiante se inscriba dos veces al mismo curso.

## 6. Módulos Principales del Sistema

El sistema está dividido en distintos módulos, cada uno encargado de una funcionalidad específica. A continuación, un resumen de los más importantes:

- **Autenticación** — Permite registrarse, iniciar sesión, verificar el correo, recuperar la contraseña y mantener la sesión activa de forma segura.
- **Gestión de usuarios** — Permite crear, ver, editar y desactivar usuarios, controlando qué puede hacer cada uno según su rol.
- **Cursos** — Es el módulo central: permite crear, editar, publicar y buscar cursos, con toda su información (precio, nivel, descripción, etc.).
- **Módulos y lecciones** — Permiten organizar el contenido del curso en secciones (módulos) y dentro de ellas, en lecciones individuales que pueden ser de video, texto, quiz, código o recursos descargables.
- **Inscripciones** — Registra qué estudiante está inscrito en qué curso, ya sea porque pagó o porque el curso es gratuito.
- **Pagos** — Se encarga de crear y confirmar los pagos con PayPal. Cuando PayPal no está disponible (por ejemplo, en pruebas), el sistema puede simular el pago.
- **Suscripciones** — Permite manejar planes recurrentes (mensual, anual o vitalicio) para acceder a los cursos.
- **Reseñas** — Permite a los estudiantes calificar (de 1 a 5 estrellas) y comentar los cursos que ya completaron.
- **Comentarios** — Permite a los estudiantes comentar dentro de una lección y responder a los comentarios de otros.
- **Favoritos** — Permite guardar cursos de interés para verlos más adelante.
- **Certificados** — Genera automáticamente un certificado en PDF cuando el estudiante termina un curso, con su nombre, el curso y el instructor.
- **Notas de lección** — Permite a los estudiantes tomar apuntes personales mientras ven una lección.
- **Panel de administración** — Muestra estadísticas generales de toda la plataforma: ingresos, estudiantes, cursos y tasa de finalización.
- **Panel de instructor** — Muestra al instructor sus propias estadísticas: ingresos generados, estudiantes inscritos y calificación promedio de sus cursos.
- **Subida de archivos** — Permite subir imágenes para los cursos (portada, vista previa), validando el tipo y tamaño del archivo.
- **Webhooks de PayPal** — Recibe avisos automáticos de PayPal cuando un pago se completa, se reembolsa o es rechazado, y actualiza el estado correspondiente en el sistema.

## 7. Pantallas Principales (Frontend)

**Zona pública**

- **Página principal**: presenta la plataforma, estadísticas generales y cursos destacados.
- **Catálogo de cursos**: permite buscar y filtrar cursos por categoría y nivel.
- **Detalle del curso**: muestra la información completa, el currículum, el instructor y las reseñas.
- **Checkout**: proceso de pago con PayPal para inscribirse a un curso.

**Zona de autenticación**

- Inicio de sesión y registro de cuenta.
- Recuperación y restablecimiento de contraseña.
- Verificación de correo electrónico.

**Panel del estudiante**

- **Dashboard**: resumen del progreso, cursos en curso y certificados recientes.
- **Mis cursos**: listado de cursos inscritos con su progreso.
- **Reproductor de lecciones**: pantalla principal de aprendizaje, con video, comentarios, recursos y notas.
- Certificados, favoritos, notificaciones y configuración de perfil.

**Panel de administración**

- Dashboard con KPIs generales de la plataforma.
- Gestión de usuarios y de cursos (crear, editar, publicar, eliminar).
- Analíticas avanzadas: ingresos recurrentes, crecimiento y distribución de usuarios.

**Panel del instructor**

- Dashboard con sus propias estadísticas.
- Gestión de sus cursos.
- Editor de currículum: permite crear y organizar módulos y lecciones arrastrando y soltando.

## 8. Autenticación y Seguridad

CURSINET utiliza un sistema de tokens (JWT) para mantener la sesión del usuario de forma segura. Cuando un usuario inicia sesión, el sistema le entrega dos tipos de token:

- **Token de acceso**: dura poco tiempo (15 minutos) y se usa para autenticar cada petición.
- **Token de actualización (refresh)**: dura más tiempo (7 días) y permite renovar el token de acceso sin que el usuario tenga que volver a iniciar sesión.

Ambos tokens se guardan en cookies seguras, que no pueden ser leídas por scripts externos, reduciendo el riesgo de robo de sesión.

**Roles y permisos**

Además de los cuatro roles (Estudiante, Instructor, Moderador, Administrador), el sistema cuenta con 23 permisos específicos, como "crear curso" o "ver usuarios". Cada rol tiene asignado un conjunto de estos permisos, lo que permite un control muy detallado de lo que cada usuario puede hacer.

**Otras medidas de seguridad**

- Límite de intentos de inicio de sesión para evitar ataques de fuerza bruta.
- Las contraseñas nunca se guardan en texto plano, sino cifradas con BCrypt.
- Verificación de correo electrónico mediante un código de 6 dígitos.
- Bloqueo temporal de la cuenta tras varios intentos fallidos.
- Registro de auditoría de eventos importantes como inicios de sesión y cambios de contraseña.

## 9. Servicios Externos

- **PayPal** — Se utiliza para procesar los pagos de los cursos y las suscripciones, incluyendo la creación de órdenes, confirmación de pagos, reembolsos y la recepción de notificaciones automáticas (webhooks) cuando ocurre un evento importante, como un pago completado.
- **Cloudflare R2** — Es el servicio donde se guardan las imágenes de los cursos (portadas y vistas previas), similar a un servicio de almacenamiento en la nube.
- **SendGrid** — Servicio utilizado para enviar correos electrónicos automáticos, como la verificación de cuenta o la recuperación de contraseña. En ambiente de pruebas, estos correos simplemente se muestran en consola en lugar de enviarse.
- **QuestPDF** — Herramienta usada para generar los certificados de finalización de curso en formato PDF, con un diseño profesional.

## 10. Flujos Principales del Sistema

**Flujo de compra de un curso**

1. El estudiante encuentra un curso en el catálogo.
2. Hace clic en "Comprar" y es dirigido al checkout.
3. Se muestra un resumen del curso y el botón de PayPal.
4. El sistema crea una orden de pago en PayPal.
5. El estudiante aprueba el pago desde su cuenta de PayPal.
6. El sistema confirma y captura el pago.
7. PayPal notifica al sistema que el pago fue completado.
8. El sistema inscribe automáticamente al estudiante en el curso.
9. El estudiante accede al contenido completo del curso.

**Flujo de creación de un curso (Instructor)**

1. El instructor crea un nuevo curso con su información básica (título, precio, categoría, nivel).
2. Agrega módulos para organizar los temas del curso.
3. Dentro de cada módulo, agrega lecciones (video, texto, quiz, código o recurso).
4. Reordena los módulos y lecciones según sea necesario.
5. Publica el curso, el cual aparece disponible en el catálogo público.

**Flujo de aprendizaje del estudiante**

1. El estudiante inicia sesión y ve sus cursos en progreso.
2. Abre una lección; el sistema comienza a registrar su progreso.
3. Al completar todas las lecciones del curso, este se marca como finalizado.
4. El sistema emite automáticamente un certificado en PDF.
5. El estudiante puede calificar y reseñar el curso.

**Flujo de autenticación**

1. El usuario ingresa su correo y contraseña.
2. El sistema verifica las credenciales contra la base de datos.
3. Si son correctas, se generan los tokens de acceso y actualización.
4. Los tokens se guardan en cookies seguras.
5. En cada petición posterior, el sistema valida automáticamente la sesión y la renueva si es necesario.

## 11. Casos de Uso por Tipo de Usuario

**Visitante (sin cuenta)**

- Ver la página principal con estadísticas y cursos destacados.
- Explorar el catálogo de cursos con filtros.
- Ver el detalle de un curso.
- Registrarse o iniciar sesión.

**Estudiante**

- Comprar un curso mediante PayPal.
- Ver sus cursos inscritos y su progreso.
- Reproducir lecciones de distintos tipos (video, texto, quiz, código).
- Marcar lecciones como completadas.
- Tomar notas y comentar en las lecciones.
- Calificar y reseñar los cursos completados.
- Guardar cursos como favoritos.
- Obtener y descargar su certificado en PDF.
- Configurar su perfil y preferencias de notificación.

**Instructor**

- Ver un panel con las estadísticas de sus cursos.
- Crear y editar sus cursos.
- Gestionar módulos y lecciones (crear, editar, reordenar).
- Publicar o despublicar sus cursos.
- Ver las ventas y el desempeño de sus cursos.

**Administrador**

- Ver un dashboard con los indicadores globales del sistema.
- Gestionar todos los usuarios de la plataforma.
- Gestionar todos los cursos de la plataforma.
- Ver analíticas avanzadas, como ingresos recurrentes.
- Moderar contenido del sistema.

## 12. Resumen General del Sistema

| Aspecto | Detalle |
|---------|---------|
| Cantidad de funcionalidades (endpoints) | Aproximadamente 70 |
| Tablas en la base de datos | 32 |
| Roles de usuario | 4 (Estudiante, Instructor, Administrador, Moderador) |
| Permisos definidos | 23 permisos específicos |
| Tipos de lección | 5 (Video, Texto, Quiz, Código, Recurso) |
| Método de pago | PayPal (con modo de prueba/simulación) |
| Almacenamiento de imágenes | Cloudflare R2 |
| Envío de correos | SendGrid |
| Certificados | Generados automáticamente en PDF |
| Seguridad de sesión | JWT + Tokens de actualización + Cookies seguras |
| Tecnología del frontend | Next.js + React + TypeScript |
| Despliegue | Docker y Docker Compose |

**En conclusión**, CURSINET es una plataforma completa y ordenada, que cubre todo el proceso de un curso en línea: desde que el instructor lo crea, hasta que el estudiante lo compra, lo estudia y obtiene su certificado. Su organización por capas y módulos permite que el sistema sea fácil de mantener, seguro y preparado para seguir creciendo.