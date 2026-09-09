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
4. **Si el proyecto ya existía** con los 6 servicios viejos: en el SQL Editor, corre el contenido de `backend/init-db/migration-002-services-images.sql`. Esto actualiza el catálogo a los 8 servicios reales y borra las citas de prueba (léelo antes de correrlo, tiene una nota si quieres conservar citas reales).

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

## Endpoints del backend

| Método | Ruta | Protegida | Qué hace |
|---|---|---|---|
| POST | `/api/auth/login` | No | Login del doctor, devuelve un token |
| GET | `/api/services` | No | Catálogo de servicios (sin precios, con imagen) |
| GET | `/api/availability?date=YYYY-MM-DD` | No | Horarios libres/ocupados ese día (bloques de 20 min) |
| POST | `/api/appointments` | No | Crea una valoración inicial (flujo público) |
| GET | `/api/appointments` | Sí | Lista todas las citas (dashboard) |
| PATCH | `/api/appointments/:id` | Sí | Cambia el estado de una cita |
| GET | `/api/appointments/stats/revenue` | Sí | Ingresos agrupados por mes |
| POST | `/api/payments/intent` | No | Genera el intento de pago (Wompi) |
| POST | `/api/payments/webhook` | No | Wompi notifica aquí cuando el pago se aprueba |

---

## Qué falta (roadmap)

Este proyecto sigue en construcción por fases. Lo que ya funciona: sitio público completo, catálogo con imágenes, agendamiento real de valoración inicial (20 min), login y dashboard básico del doctor. **Pendiente** (fases siguientes, cada una es un bloque de trabajo real):

- **Módulo de imágenes editable**: que el doctor suba/cambie/borre fotos desde el panel, sin tocar código ni carpetas. Requiere almacenamiento de archivos (Supabase Storage).
- **Cuentas de pacientes**: registro con cédula, creación automática de usuario, envío de contraseña por correo (requiere un servicio de email, ej. Resend), historial de citas/procedimientos/costos, reprogramar.
- **Agenda interna avanzada**: que el doctor/asistente reagende, cancele, suspenda horarios, y gestione citas de seguimiento (más allá de la valoración inicial) sin pasar por el flujo público.
- **Cobro por QR**: pantalla de cobro por paciente atendido, con PSE y tarjeta vía Wompi, generación de QR dinámico.

Cada una de estas requiere que crees cuentas/credenciales reales en servicios externos antes de que se pueda construir sobre ellas (igual que hicimos con Supabase y Render) — se abordan una por una para no mezclar demasiados cambios a la vez.
