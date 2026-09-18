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
<<<<<<< HEAD
=======

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
>>>>>>> e21f803 (cambios, 90%)

## Endpoints del backend

| Método | Ruta | Protegida | Qué hace |
|---|---|---|---|
| POST | `/api/auth/login` | No | Login del doctor, devuelve un token |
| GET | `/api/services` | No | Catálogo de servicios (sin precios, con imagen) |
| GET | `/api/availability?date=YYYY-MM-DD` | No | Horarios libres/ocupados ese día (bloques de 20 min) |
| POST | `/api/appointments` | No | Crea una valoración inicial (flujo público) |
| GET | `/api/appointments` | Sí (doctor) | Lista todas las citas (dashboard) |
| PATCH | `/api/appointments/:id` | Sí (doctor) | Cambia el estado de una cita |
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
<<<<<<< HEAD
=======
| GET | `/api/transformations` | No | Casos antes/después públicos |
| POST | `/api/admin/transformations` | Sí (doctor) | Sube un caso antes/después |
| DELETE | `/api/admin/transformations/:id` | Sí (doctor) | Quita un caso |
| GET | `/api/blog` | No | Artículos publicados |
| GET | `/api/blog/:slug` | No | Un artículo completo |
| GET | `/api/admin/blog` | Sí (doctor) | Todos los artículos, incluidos borradores |
| POST | `/api/admin/blog` | Sí (doctor) | Crea un artículo |
| PUT | `/api/admin/blog/:id` | Sí (doctor) | Edita un artículo |
| DELETE | `/api/admin/blog/:id` | Sí (doctor) | Borra un artículo |
>>>>>>> e21f803 (cambios, 90%)

---

## Qué falta (roadmap)

<<<<<<< HEAD
Las 4 fases funcionales ya están construidas y probables en local:
- ✅ Sitio público completo (catálogo, galería, misión/visión, redes, bilingüe)
- ✅ Módulo de imágenes editable desde el panel del doctor
- ✅ Cuentas de pacientes (registro automático por cédula, historial, cancelación)
- ✅ Agenda interna avanzada (citas manuales, reagendar, bloquear horarios) + cobro por QR

**Lo único que falta es conectar servicios externos reales** cuando quieras pasar de "modo local/simulado" a producción de verdad:

1. **Base de datos y backend en internet**: reconectar Supabase (ya lo hicimos una vez) y volver a desplegar el backend actualizado en Render — ahora mismo todo esto solo vive en tu Docker local.
2. **Envío de correo real**: cuenta de Gmail + contraseña de aplicación (`GMAIL_USER`/`GMAIL_APP_PASSWORD`) — mientras tanto, las contraseñas de pacientes nuevos solo se ven en los logs del backend.
3. **Pagos reales**: cuenta comercial en Wompi + `WOMPI_PUBLIC_KEY`/`WOMPI_INTEGRITY_SECRET` — mientras tanto, el cobro por QR usa una pantalla de pago simulada para que puedas probar el flujo completo sin mover dinero real.
4. **Publicar el sitio público de nuevo en GitHub Pages** con todos estos cambios — ahora mismo la última versión publicada ahí sigue siendo la de antes de la Fase 3/4.
=======
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
>>>>>>> e21f803 (cambios, 90%)

Ninguna de estas requiere escribir código nuevo — son básicamente los mismos pasos que ya hicimos juntos para Supabase y Render, una vez decidas que es momento de mostrarle esto al doctor en producción real.
