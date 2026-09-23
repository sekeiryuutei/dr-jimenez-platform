# Dr. Jorge Jiménez — Plataforma Web

Sitio de marketing (público) + sistema de agendamiento + panel del doctor + pagos.

## Índice
1. [Estructura del proyecto](#estructura-del-proyecto)
2. [Cómo correr todo en local (Docker)](#cómo-correr-todo-en-local-docker)
3. [Dónde van las imágenes](#dónde-van-las-imágenes)
4. [Configurar la base de datos (Supabase) desde cero](#configurar-la-base-de-datos-supabase-desde-cero)
5. [Configurar el backend en producción (Render) desde cero](#configurar-el-backend-en-producción-render-desde-cero)
6. [Configurar el login del doctor](#configurar-el-login-del-doctor)
7. [Publicar el sitio público (GitHub Pages) desde cero](#publicar-el-sitio-público-github-pages-desde-cero)
8. [Cómo se actualiza todo después](#cómo-se-actualiza-todo-después)
9. [Endpoints del backend](#endpoints-del-backend)
10. [Qué falta (roadmap)](#qué-falta-roadmap)

---

## Estructura del proyecto

```
dr-jimenez-platform/
├── docker-compose.yml        -> levanta frontend + backend + base de datos local
├── frontend/
│   ├── public/
│   │   ├── index.html        -> EL SITIO PÚBLICO REAL (lo que ven los pacientes)
│   │   └── images/
│   │       ├── doctor/       -> foto(s) del doctor
│   │       ├── services/     -> una imagen por servicio del catálogo
│   │       └── gallery/      -> fotos de casos/resultados
│   └── pages/
│       └── doctor/
│           ├── login.js      -> /doctor/login (acceso privado, no aparece en ningún menú)
│           └── dashboard.js  -> /doctor/dashboard (lista de citas)
├── backend/
│   ├── src/routes/           -> servicios, disponibilidad, citas, pagos, login
│   ├── init-db/schema.sql    -> esquema completo (para una base de datos nueva)
│   └── init-db/migration-002-services-images.sql  -> para actualizar una base ya existente
└── .github/workflows/        -> publica frontend/public/index.html en GitHub Pages
```

**Importante**: el sitio público (`frontend/public/index.html`) es HTML/CSS/JS plano, no un componente de React — así puede vivir tanto en GitHub Pages como en cualquier hosting estático sin depender de Next.js para renderizarlo. El panel del doctor (`/doctor/login`, `/doctor/dashboard`) sí es Next.js, porque necesita lógica de sesión.

---

## Cómo correr todo en local (Docker)

Requisito: Docker Desktop instalado y abierto.

```bash
git clone <tu-repo>
cd dr-jimenez-platform
cp backend/.env.example backend/.env   # completa las variables, ver secciones siguientes
docker-compose up --build
```

- **Sitio público**: http://localhost:3000/index.html *(nota: en local hay que escribir `/index.html`; en producción, en la raíz del dominio, se ve automático)*
- **Panel del doctor**: http://localhost:3000/doctor/login
- **Backend / API**: http://localhost:4000/health
- **Base de datos**: localhost:5432

Si agregas una dependencia nueva a `package.json` (backend o frontend), usa `docker-compose down -v` antes de volver a levantar — si no, Docker reutiliza el `node_modules` viejo y no va a encontrar el paquete nuevo.

---

## Dónde van las imágenes

Copia tus archivos directamente en estas rutas (los nombres deben coincidir exactamente):

| Qué es | Ruta exacta |
|---|---|
| Foto principal del doctor (hero) | `frontend/public/images/doctor/jorge.jpeg` |
| Foto secundaria del doctor (sección "Acerca de") | `frontend/public/images/doctor/jorge-secundaria.jpeg` |
| Imagen del servicio "Operatoria dental" | `frontend/public/images/services/operatoria-dental.jpg` |
| Imagen del servicio "Aclaramiento dental" | `frontend/public/images/services/aclaramiento-dental.jpg` |
| Imagen del servicio "Fase higiénica" | `frontend/public/images/services/fase-higienica.jpg` |
| Imagen del servicio "Implantología" | `frontend/public/images/services/implantologia.jpg` |
| Imagen del servicio "Diseño de sonrisa" | `frontend/public/images/services/diseno-sonrisa.jpg` |
| Imagen del servicio "Armonización facial" | `frontend/public/images/services/armonizacion-facial.jpg` |
| Imagen del servicio "Rehabilitación oral" | `frontend/public/images/services/rehabilitacion-oral.jpg` |
| Imagen del servicio "Cirugía oral" | `frontend/public/images/services/cirugia-oral.jpg` |
| Fotos de la galería de casos | `frontend/public/images/gallery/1.jpg`, `2.jpg`, `3.jpg`... hasta `8.jpg` |

Si un archivo no existe, esa imagen simplemente no se muestra (no rompe el diseño) — así puedes ir completando poco a poco.

**Sobre "imágenes hermosas de internet"**: no puedo descargar ni incrustar fotos de stock de internet directamente en el proyecto por derechos de autor — cualquier imagen de un banco de fotos pertenece a alguien y usarla en un sitio comercial sin licencia es un riesgo legal real para el doctor. Lo que sí recomiendo: **Unsplash** y **Pexels** tienen fotografía de altísima calidad, gratuita para uso comercial, sin atribución obligatoria. Busca ahí (ej. "dental clinic luxury", "cosmetic dentistry") y descarga directo a las rutas de la tabla de arriba.

**Optimización para carga rápida**: antes de subir cada foto, comprímela — herramientas gratuitas como squoosh.app o tinypng.com reducen el peso sin perder calidad visible. Apunta a menos de 200-300 KB por imagen para que el sitio cargue rápido (esto también ayuda al SEO, que fue parte de tu pedido).

---

## Configurar la base de datos (Supabase) desde cero

*(Si ya tienes el proyecto de Supabase de antes, salta al paso 4 — solo necesitas correr la migración.)*

1. Crea cuenta en supabase.com y un nuevo proyecto.
2. En **SQL Editor**, pega y corre el contenido completo de `backend/init-db/schema.sql`.
3. En **Project Settings → Database → Connection string**, pestaña **Session pooler** (no "Direct connection" — Render necesita IPv4), copia la URI y guárdala como tu `DATABASE_URL`.
4. **Si el proyecto ya existía** con los 6 servicios viejos: en el SQL Editor, corre el contenido de `backend/migrations/migration-002-services-images.sql`. Esto actualiza el catálogo a los 8 servicios reales y borra las citas de prueba (léelo antes de correrlo, tiene una nota si quieres conservar citas reales).

**Nota**: este archivo vive en `backend/migrations/`, no en `backend/init-db/`, a propósito — todo lo que está en `init-db/` lo ejecuta Docker automáticamente al crear una base de datos local nueva, y esta migración solo debe correrse manualmente y una sola vez contra Supabase.

---

## Configurar el backend en producción (Render) desde cero

1. Crea cuenta en render.com (con GitHub es más simple).
2. **New + → Web Service**, conecta tu repositorio.
3. **Root Directory**: `backend`. Render detecta el `Dockerfile` solo.
4. **Instance Type**: Free.
5. En **Environment Variables**, agrega:

   | Variable | Valor |
   |---|---|
   | `DATABASE_URL` | tu cadena de Supabase (Session pooler) |
   | `PORT` | `4000` |
   | `DOCTOR_EMAIL` | el correo con el que el doctor va a iniciar sesión |
   | `DOCTOR_PASSWORD_HASH` | ver sección siguiente |
   | `JWT_SECRET` | ver sección siguiente |

6. **Create Web Service**. Verifica en `https://tu-servicio.onrender.com/health`.

---

## Configurar el login del doctor

Es un único usuario (el doctor) definido por variables de entorno, no una tabla de usuarios.

**1. Genera el hash de la contraseña** (desde la carpeta `backend/`, con las dependencias ya instaladas — con Docker corriendo, o con `npm install` local):
```bash
cd backend
node scripts/generate-hash.js "LaContraseñaReal"
```
Copia el resultado completo (empieza con `$2a$...`).

**2. Genera el `JWT_SECRET`** (una cadena aleatoria larga):
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**3. Pon las tres variables** (`DOCTOR_EMAIL`, `DOCTOR_PASSWORD_HASH`, `JWT_SECRET`) tanto en tu `backend/.env` local como en las Environment Variables de Render.

**4. Entra** en `/doctor/login` con ese email y esa contraseña (la de texto plano, no el hash).

---

## Publicar el sitio público (GitHub Pages) desde cero

1. Crea el repositorio en GitHub y sube el proyecto (`git init`, `git add .`, `git commit`, `git push`).
2. Revisa `frontend/next.config.js` — la variable `repoName` debe ser idéntica al nombre de tu repo.
3. En GitHub, **Settings → Pages → Source → GitHub Actions**.
4. Cada push a `main` con cambios en `frontend/` dispara el workflow (`.github/workflows/deploy-pages.yml`), que construye y publica automáticamente.
5. Tu sitio queda en `https://tu-usuario.github.io/nombre-del-repo/`.

---

## Cómo se actualiza todo después

Un solo flujo para todo (sitio, backend, base de datos si corriste una migración):
```bash
git add .
git commit -m "describe el cambio"
git push
```
- GitHub Pages reconstruye el frontend automáticamente.
- Render reconstruye el backend automáticamente (auto-deploy activado por default).
- Los cambios de base de datos (como la migración) los corres tú manualmente en el SQL Editor de Supabase — eso nunca es automático, por seguridad.

---

## Módulo de imágenes (Fase 2)

Ya no hace falta copiar archivos a mano en carpetas — el doctor sube y cambia las fotos desde su propio panel:

1. Entra a `/doctor/login`, luego a `/doctor/media` (o el link "Imágenes" en el menú del panel).
2. **Servicios**: cada tarjeta tiene un botón "Cambiar imagen" — sube el archivo y se actualiza al instante en el sitio público.
3. **Galería**: botón "+ Agregar foto a la galería" para sumar casos, y "Quitar" en cada foto para eliminarla.

Los archivos se guardan en `backend/uploads/` (se crea automáticamente, con subcarpetas `services/` y `gallery/`). Esa carpeta está en `.gitignore` a propósito — las fotos reales del doctor no deben viajar por git. En local, como Docker monta `./backend` completo, los archivos persisten en tu disco aunque reinicies los contenedores.

**Nota para cuando pasemos a producción real**: este almacenamiento en disco funciona perfecto en local, pero en un hosting como Render el disco no es permanente entre despliegues. Para producción cambiaremos el almacenamiento a Supabase Storage (mismo flujo para el doctor, solo cambia dónde vive el archivo por dentro).

Las rutas `/images/...` que ya tenías (para `jorge.jpeg` y los placeholders) siguen funcionando igual — son el respaldo visual mientras no subas nada desde el panel.

---

## Cuentas de pacientes (Fase 3)

Cuando alguien agenda su valoración inicial desde el sitio público, ahora pide **cédula, nombre, email y teléfono**. Si es la primera vez que esa cédula o ese correo agenda:

1. Se crea automáticamente una cuenta de paciente.
2. Se genera una contraseña temporal.
3. Se le "envía" un correo con esas credenciales.

**Mientras no conectes Gmail** (`GMAIL_USER`/`GMAIL_APP_PASSWORD` vacíos en `backend/.env`), ese correo no se envía de verdad — se imprime completo en los logs del backend, así:
```powershell
docker-compose logs -f backend
```
Vas a ver un bloque `===== EMAIL (modo local, no se envió de verdad) =====` con el usuario y la contraseña generada. Cópialos de ahí para entrar como ese paciente en `/paciente/login`.

**Cuando quieras que el correo se envíe de verdad, usando Gmail:**
1. Usa una cuenta de Gmail del consultorio (o crea una nueva específica para esto, ej. `citas.drjorgejimenez@gmail.com`).
2. **Activa la verificación en dos pasos** en esa cuenta: [myaccount.google.com/security](https://myaccount.google.com/security) → "Verificación en 2 pasos" → actívala (Gmail exige esto para poder generar contraseñas de aplicación).
3. Ve a [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords), crea una nueva "Contraseña de aplicación" (ponle un nombre como "Backend Dr Jimenez"), y copia el código de 16 letras que te da.
4. En `backend/.env`:
   ```
   GMAIL_USER=citas.drjorgejimenez@gmail.com
   GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
   ```
   (la contraseña de aplicación va tal cual la copiaste, con o sin espacios, ambas formas funcionan).
5. Reinicia el backend — a partir de ahí los correos salen de verdad, sin tocar ni una línea de código.

**Importante**: nunca uses la contraseña normal de la cuenta de Gmail en `GMAIL_APP_PASSWORD` — Google la bloquea directamente por seguridad. Tiene que ser específicamente una "contraseña de aplicación" generada como en el paso 3.

El paciente, una vez logueado en `/paciente/login`, puede ver su historial de citas y cancelar las que estén pendientes/confirmadas desde `/paciente/dashboard`.

---

## Token permanente de WhatsApp (System User)

El token que Meta te da por defecto en "API Setup" **caduca en 24 horas** — es solo para pruebas rápidas. Para que los mensajes automáticos (confirmación de cita, link de cobro, confirmación de pago) sigan funcionando sin que se caduquen solos:

1. Ve a [business.facebook.com](https://business.facebook.com) → **Configuración del negocio** → **Usuarios del sistema**.
2. **Agregar** → crea un usuario del sistema, rol **Admin**.
3. Ábrelo → **Asignar activos** → tu app de Meta con **Control total**, y tu cuenta de WhatsApp Business con **Control total**.
4. **Generar token** → misma app → marca `whatsapp_business_messaging` y `whatsapp_business_management` → expiración **Nunca**.
5. Copia ese token (solo se muestra una vez) y ponlo en `WHATSAPP_TOKEN` en `backend/.env`.

Si ves `{"error":{"code":190,"type":"OAuthException"}}` en los logs del backend, es justo este token vencido — el código nunca rompe el flujo de la app cuando esto pasa (agendar, cobrar, etc. siguen funcionando igual), solo no llega el mensaje.

## Agenda interna y cobros (Fase 4)

**Agenda interna** (`/doctor/schedule`):
- Crear citas manuales (para tratamientos de seguimiento, no solo la valoración inicial) — funciona igual que el agendamiento público: si la cédula/correo son nuevos, crea la cuenta del paciente.
- Reagendar cualquier cita a otra fecha/hora.
- Confirmar, completar o cancelar cualquier cita.
- Bloquear horarios (vacaciones, almuerzo, lo que sea) — esos bloqueos se respetan automáticamente en la disponibilidad que ve el público en el sitio.

**Cobro por QR** (`/doctor/charge`):
- Eliges la cita, pones el valor, y se genera un QR + link de pago.
- **Mientras no actives Wompi** (`WOMPI_PUBLIC_KEY` vacío en `.env`), el QR lleva a una pantalla de pago **simulada** (`/pagar?ref=...`) donde puedes probar todo el flujo con un botón "Simular pago aprobado" — así puedes validar que todo funciona antes de mover dinero real.
- **Cuando actives Wompi**: agrega `WOMPI_PUBLIC_KEY` y `WOMPI_INTEGRITY_SECRET` en `.env` (los obtienes al crear tu cuenta comercial en wompi.co). A partir de ahí, el mismo botón genera automáticamente un QR que lleva al checkout real de Wompi (tarjeta y PSE), sin cambiar nada más.

---

## Duración de citas y cobro (actualizado)

- Al **confirmar** una cita (desde `/doctor/dashboard` o `/doctor/schedule`), el sistema pregunta cuántos minutos va a durar — eso bloquea automáticamente ese rango en el calendario público, no solo el horario de inicio.
- Al **completar** una cita, pregunta cuánto se le cobró (opcional) — queda registrado en el historial del paciente y en el dashboard.
- El selector de citas en `/doctor/charge` solo muestra las citas **completadas el día de hoy y aún sin cobrar** — así no se llena con historial viejo.

## Real Smile Transformations

Slider interactivo antes/después (arrastra para comparar). Se administra desde `/doctor/media`, sección "Real Smile Transformations" — subes la foto de antes y la de después, con un título opcional.

## Blog

Se administra desde `/doctor/blog`: título, extracto y contenido en español e inglés, imagen destacada, y la opción de guardar como borrador antes de publicar. Aparece en el sitio público en la sección "Nuestro blog", con una vista de lectura al hacer clic en cualquier artículo.

## Mapa y reseñas

- El mapa usa la dirección real del consultorio (Unicentro, Torre Oasis, Consultorio 509A, Cali) — si la ubicación cambia, edítala en `frontend/public/index.html`, buscando `Centro+Comercial+Unicentro`.
- Las reseñas de Google que se ven en el sitio son **de ejemplo** por ahora — edítalas directo en el array `REVIEWS` dentro de `frontend/public/index.html`. Conectar reseñas reales requiere una API key de Google Places (Google Cloud), es un paso aparte si lo quieres dar más adelante.

---

## Correcciones y funciones nuevas (esta ronda)

- **403 de Wompi (CloudFront), resuelto**: había dos causas, ambas de cómo armábamos la URL del checkout:
  1. `WOMPI_INTEGRITY_SECRET` tenía el valor equivocado — el "Secreto de eventos" (`test_events_...`) en vez del "Secreto de integridad" (`test_integrity_...`). Son dos secretos distintos en el dashboard de Wompi, para cosas distintas.
  2. El parámetro `signature:integrity` se armaba con `URLSearchParams`, que codifica automáticamente los dos puntos del nombre como `%3A` — Wompi espera el nombre literal sin codificar. Ahora se arma a mano, sin ese problema.
  - De regalo: ahora si verificamos que los webhooks de Wompi sean legítimos, usando el `WOMPI_EVENTS_SECRET` (agrégalo a tu `.env` con el secreto de "Eventos", no el de integridad).
- **Flujo de cobro unificado, sin redundancia**: el doctor ya no vuelve a escribir el valor en `/doctor/charge` — usa el que asignó al completar la cita. Ahí mismo tiene las dos acciones directas: **Generar QR de cobro** o **Marcar pagado (efectivo)**.
- **Horario de atención configurable**: nueva sección `/doctor/settings` — activa/desactiva cualquier día (incluyendo domingos) y define la hora de inicio/fin de cada uno. El calendario público y la agenda interna lo respetan al instante. Para festivos puntuales, sigue usando "Bloquear horarios" en `/doctor/schedule` (bloqueas el día completo, ej. de 00:00 a 23:59).

- **Causa raíz real del bug de cobros, corregida**: completar una cita con un valor marcaba `payment_status = 'paid'` automáticamente — por eso desaparecía de inmediato de `/doctor/charge` y el paciente nunca veía nada pendiente. Ahora completar una cita la deja en **"pendiente de pago"**, y solo se marca pagada cuando:
  1. Wompi confirma el pago real (webhook), o
  2. El doctor la marca manual como **"Pagado en efectivo"** (nuevo botón en `/doctor/dashboard`, solo visible en citas completadas con valor y aún sin pagar).
- **El paciente ya puede pagar desde su panel**: botón **"Pagar con Wompi"** en `/paciente/dashboard`, visible en cuanto el doctor le asigna un valor a la cita.
- **Token de WhatsApp**: si ves `OAuthException code 190` en los logs, es que `WHATSAPP_TOKEN` es el token temporal de 24h (el que Meta muestra por defecto en "API Setup"). Genera uno permanente por **Usuario del Sistema** — instrucciones completas más abajo.

- **El filtro de "citas para cobrar" se simplificó de raíz**: ya no exige que la cita sea de "hoy" (ese filtro era frágil y causó el mensaje "No hay citas..." varias veces). Ahora `/doctor/charge` muestra **todas** las citas completadas que aún no tienen un pago registrado, con las más recientes primero.
- **WhatsApp Business integrado** (antes no existía nada de esto):
  - Al agendar una cita (pública o interna), el paciente recibe confirmación por WhatsApp además del correo.
  - Al generar un cobro desde `/doctor/charge`, el paciente recibe el link de pago por WhatsApp automáticamente.
  - Al aprobarse un pago (real por Wompi, o simulado en local), el paciente recibe confirmación de pago por WhatsApp.
  - **Limitación real de WhatsApp que debes saber**: fuera de una ventana de 24 horas desde el último mensaje que el paciente le escribió al número de WhatsApp del consultorio, Meta no permite enviar texto libre — solo plantillas pre-aprobadas. En pruebas, esto puede fallar si el paciente nunca le ha escrito primero al número. El código nunca rompe el flujo principal si esto falla (revisa los logs del backend si un WhatsApp no llegó).

- **Bug de enrutamiento corregido**: "Agendar" desde el panel del paciente daba error `Unexpected token '<'` — la ruta estaba registrada en el archivo equivocado y nunca coincidía con la URL real. Ya funciona.
- **Bug de zona horaria, ahora sí en los 3 lugares donde existía**: el filtro de "hoy" en `/doctor/charge`, y el mínimo de fecha seleccionable tanto en el sitio público como en `/paciente/agendar`, usaban hora UTC — pasadas las 7pm en Colombia bloqueaban seleccionar el día actual. Los tres ya usan la fecha local real.
- **El paciente ahora puede pagar desde su propio panel**: en `/paciente/dashboard`, si tiene un cobro pendiente, aparece el botón "Pagar ahora" — genera el mismo QR/link que usa el doctor (mismo monto y referencia), así el estado de pago se ve igual en las dos plataformas.
- **Total pagado** debajo del listado de citas del paciente.

- **Bug de zona horaria corregido**: el filtro de "citas de hoy" en `/doctor/charge` usaba hora UTC — pasadas las 7pm en Colombia, pensaba que ya era el día siguiente y el formulario de cobro se quedaba vacío sin explicación. Ya usa la fecha local real.
- **Duración editable en cualquier momento**: antes solo se podía fijar al confirmar. Ahora hay un botón "Editar duración" siempre visible en `/doctor/dashboard` y `/doctor/schedule`.
- **Cobro obligatorio al completar**: el backend ahora rechaza marcar una cita como completada si no tiene un valor cobrado (a menos que ya se haya pagado por QR).
- **El paciente ve el cobro en cuanto se genera** (no solo cuando ya se pagó) — aparece como "Pendiente de pago" en `/paciente/dashboard` hasta que se confirma.
- **Toggle de moneda COP/USD**: en el dashboard del doctor, en `/doctor/charge` y en `/paciente/dashboard`. Usa una tasa fija aproximada (4.000 COP/USD) solo para mostrar el valor — no es una tasa en vivo.
- **Validación de duplicados**: si alguien intenta agendar con una cédula ya registrada pero un correo distinto (o viceversa), el sistema avisa en vez de mezclar los datos en silencio.
- **Recuperación de contraseña del paciente**: `/paciente/recuperar` (solicitar el enlace) y `/paciente/restablecer` (definir la nueva, con el token que llega por correo). Los enlaces vencen en 1 hora.
- **Soporte del doctor hacia el paciente**: desde `/doctor/dashboard`, botones "Restablecer clave" (genera una nueva y se la reenvía por correo) y "Cambiar correo" (por si el paciente se equivocó o ya no tiene acceso a ese correo).
- **Agendar desde la sesión del paciente**: `/paciente/agendar` — ya no hace falta ir al sitio público ni volver a escribir cédula/nombre/correo.
- **Enlace directo al portal en los correos**: todos los correos que recibe el paciente ahora incluyen el link a `/paciente` (usa `FRONTEND_URL` de tu `.env`, para que en producción apunte al dominio real, no a `localhost`).
- **Pantalla de pago con selector de método** (`/pagar`): agregado el desplegable de Tarjeta/PSE/Nequi que faltaba. Si Wompi real ya está activo, esta pantalla deja de simular y solo informa el estado.

---

## Endpoints del backend

| Método | Ruta | Protegida | Qué hace |
|---|---|---|---|
| POST | `/api/auth/login` | No | Login del doctor, devuelve un token |
| GET | `/api/services` | No | Catálogo de servicios (sin precios, con imagen) |
| GET | `/api/availability?date=YYYY-MM-DD` | No | Horarios libres/ocupados ese día (bloques de 20 min) |
| POST | `/api/appointments` | No | Crea una valoración inicial (flujo público) |
| GET | `/api/appointments` | Sí (doctor) | Lista todas las citas (dashboard) |
| PATCH | `/api/appointments/:id` | Sí (doctor) | Cambia el estado de una cita (cobro obligatorio al completar) |
| PATCH | `/api/appointments/:id/duration` | Sí (doctor) | Edita solo la duración, en cualquier momento |
| PATCH | `/api/appointments/:id/mark-paid` | Sí (doctor) | Registra un pago manual en efectivo (sin pasar por Wompi) |
| GET | `/api/admin/availability-settings` | Sí (doctor) | Consulta el horario laboral configurado (7 días) |
| PUT | `/api/admin/availability-settings` | Sí (doctor) | Guarda el horario laboral (días activos y jornada de cada uno) |
| POST | `/api/patient/appointments` | Sí (paciente) | El paciente agenda directo desde su panel |
| POST | `/api/patient-auth/forgot-password` | No | Solicita el enlace de restablecimiento |
| POST | `/api/patient-auth/reset-password` | No | Define la nueva contraseña con el token del correo |
| POST | `/api/admin/patients/:id/reset-password` | Sí (doctor) | El doctor le genera y reenvía una clave nueva al paciente |
| GET | `/api/patient/appointments/:id/payment` | Sí (paciente) | El paciente genera/ve su propio link de pago para esa cita |
| PATCH | `/api/admin/patients/:id` | Sí (doctor) | El doctor corrige el correo de acceso del paciente |
| GET | `/api/appointments/stats/revenue` | Sí (doctor) | Ingresos agrupados por mes |
| GET | `/api/gallery` | No | Lista las fotos de la galería pública |
| POST | `/api/admin/services/:id/image` | Sí (doctor) | Sube/reemplaza la foto de un servicio |
| POST | `/api/admin/gallery` | Sí (doctor) | Sube una foto nueva a la galería |
| DELETE | `/api/admin/gallery/:id` | Sí (doctor) | Quita una foto de la galería |
| POST | `/api/patient-auth/login` | No | Login del paciente |
| GET | `/api/patient/me` | Sí (paciente) | Datos del paciente logueado |
| GET | `/api/patient/appointments` | Sí (paciente) | Historial de citas del paciente |
| PATCH | `/api/patient/appointments/:id/cancel` | Sí (paciente) | El paciente cancela su propia cita |
| POST | `/api/admin/appointments` | Sí (doctor) | Crea una cita manual (agenda interna) |
| PATCH | `/api/admin/appointments/:id/reschedule` | Sí (doctor) | Reagenda una cita |
| GET | `/api/admin/blocked-slots` | Sí (doctor) | Lista horarios bloqueados |
| POST | `/api/admin/blocked-slots` | Sí (doctor) | Bloquea un horario |
| DELETE | `/api/admin/blocked-slots/:id` | Sí (doctor) | Quita un bloqueo |
| POST | `/api/admin/payments/charge` | Sí (doctor) | Genera el QR de cobro para una cita |
| GET | `/api/mock-payment/:reference` | No | Datos del pago simulado (solo si Wompi no está activo) |
| POST | `/api/mock-payment/:reference/approve` | No | Aprueba el pago simulado (solo pruebas locales) |
| POST | `/api/payments/webhook` | No | Wompi notifica aquí cuando el pago real se aprueba |
| GET | `/api/transformations` | No | Casos antes/después públicos |
| POST | `/api/admin/transformations` | Sí (doctor) | Sube un caso antes/después |
| DELETE | `/api/admin/transformations/:id` | Sí (doctor) | Quita un caso |
| GET | `/api/blog` | No | Artículos publicados |
| GET | `/api/blog/:slug` | No | Un artículo completo |
| GET | `/api/admin/blog` | Sí (doctor) | Todos los artículos, incluidos borradores |
| POST | `/api/admin/blog` | Sí (doctor) | Crea un artículo |
| PUT | `/api/admin/blog/:id` | Sí (doctor) | Edita un artículo |
| DELETE | `/api/admin/blog/:id` | Sí (doctor) | Borra un artículo |

---

## Qué falta (roadmap)

Las 4 fases funcionales, más las mejoras de diseño y contenido, ya están construidas y probables en local:
- ✅ Sitio público completo (catálogo, galería, misión/visión, redes, bilingüe, tipografía Poppins + Playfair Display)
- ✅ Módulo de imágenes editable desde el panel del doctor
- ✅ Cuentas de pacientes (registro automático por cédula, historial, cancelación)
- ✅ Agenda interna avanzada (citas manuales, reagendar, bloquear horarios, duración real) + cobro por QR
- ✅ Real Smile Transformations (slider antes/después)
- ✅ Blog (escribible desde el panel, bilingüe)
- ✅ Mapa de Google con la dirección real
- ✅ Reseñas de Google (de ejemplo por ahora)

**Lo único que falta es conectar servicios externos reales** cuando quieras pasar de "modo local/simulado" a producción de verdad:

1. **Base de datos y backend en internet**: reconectar Supabase (ya lo hicimos una vez, ahora con las tablas nuevas: `transformations`, `blog_posts`, `duration_minutes`) y volver a desplegar el backend actualizado en Render.
2. **Envío de correo real**: cuenta de Gmail + contraseña de aplicación (`GMAIL_USER`/`GMAIL_APP_PASSWORD`) — ya configurada, revisa la sección de arriba.
3. **Pagos reales**: cuenta comercial en Wompi + `WOMPI_PUBLIC_KEY`/`WOMPI_INTEGRITY_SECRET` (o el sandbox de pruebas, ver sección de configuración) — mientras tanto, el cobro por QR usa una pantalla de pago simulada.
4. **Reseñas reales de Google**: requiere una API key de Google Places (Google Cloud) — mientras tanto son de ejemplo, editables directo en el código.
5. **Publicar el sitio público de nuevo en GitHub Pages** con todos estos cambios — ahora mismo la última versión publicada ahí es anterior a todo este bloque de trabajo.

Ninguna de estas requiere escribir código nuevo — son básicamente los mismos pasos que ya hicimos juntos para Supabase y Render, una vez decidas que es momento de mostrarle esto al doctor en producción real.
