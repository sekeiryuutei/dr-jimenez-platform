# 🦷 Dr. Jorge Jiménez — Plataforma Web (Estética Dental y Facial)

Plataforma integral para consultorio odontológico de alta gama ubicado en el Centro Comercial Unicentro, Torre Oasis, Consultorio 509A (Cali, Colombia).

Incluye:
1. **Sitio Público (`frontend/public/index.html`)**: Landing de lujo bilingüe (ES/EN), catálogo de 8 servicios, comparador de transformaciones Antes/Después, galería clínica, blog con vista modal, mapa interactivo y agendamiento público de valoración (20 min) con validación de Habeas Data (Ley 1581 de 2012).
2. **Panel del Doctor (`/doctor/*` en Next.js 14)**: Gestión consolidada de citas, agenda manual de tratamientos, bloqueo de horarios/festivos, historial completo con filtros y paginación, métricas analíticas interactivas (`Recharts`), cobros con Wompi/Efectivo (con QR en pantalla), CMS de fotos y CMS de blog.
3. **Portal del Paciente (`/paciente/*` en Next.js 14)**: Cuenta autogenerada con contraseña temporal por email al agendar, historial de citas, cancelación autónoma, botón de pago Wompi y agendamiento directo.

---

## 🏗️ Estructura del Proyecto

```text
dr-jimenez-platform/
├── docker-compose.yml          -> Orquesta BD (Postgres 16), backend (4000) y frontend (3000)
├── README.md                   -> Documentación unificada del proyecto
├── backend/
│   ├── Dockerfile & .dockerignore
│   ├── .env.example            -> Plantilla de variables de entorno
│   ├── init-db/schema.sql      -> Esquema completo (10 tablas) y datos semilla
│   ├── migrations/             -> Migraciones incrementales de base de datos
│   ├── uploads/                -> Almacenamiento local persistente de imágenes
│   └── src/
│       ├── index.js            -> Entry point, seguridad (Helmet, Rate-limit, CORS dinámico)
│       ├── utils/              -> time.js (Zona America/Bogota), wompi.js, email.js, whatsapp.js
│       └── routes/             -> Rutas API (appointments, availability, payments, blog, media, etc.)
└── frontend/
    ├── Dockerfile & .dockerignore
    ├── package.json            -> Next.js 14, React 18, Recharts
    ├── components/PanelNav.js  -> Barra de navegación compartida
    ├── public/
    │   ├── index.html          -> Sitio público monolítico con Vanilla JS y CSS
    │   └── images/             -> Imágenes institucionales (doctor, servicios)
    ├── styles/panel.css        -> Sistema de diseño oscuro (#0a0a0a) con acento navy (#4d7ea8)
    └── pages/
        ├── doctor/             -> dashboard, history, analytics, charge, media, settings, blog, login
        ├── paciente/           -> dashboard, agendar, login, recuperar, restablecer
        └── pagar.js            -> Pantalla de retorno / simulación de pasarela Wompi
```

---

## 🏃 Cómo Ejecutar en Local (Docker)

**Requisito**: Tener Docker Desktop instalado y en ejecución.

```bash
# 1. Configurar variables locales del backend
cp backend/.env.example backend/.env

# 2. Levantar todos los contenedores con rebuild limpio
docker-compose down -v
docker-compose up --build
```

- **Sitio Público**: [http://localhost:3000/index.html](http://localhost:3000/index.html) (o [http://localhost:3000/](http://localhost:3000/))
- **Panel del Doctor**: [http://localhost:3000/doctor/login](http://localhost:3000/doctor/login)
- **Portal del Paciente**: [http://localhost:3000/paciente/login](http://localhost:3000/paciente/login)
- **Backend API Health**: [http://localhost:4000/health](http://localhost:4000/health)
- **Base de Datos Postgres**: Puerto `5432` (`postgres://drjimenez:drjimenez_dev@localhost:5432/drjimenez`)

---

## 🔐 Configuración de Variables de Entorno (`backend/.env`)

```env
DATABASE_URL=postgres://drjimenez:drjimenez_dev@db:5432/drjimenez
PORT=4000
FRONTEND_URL=http://localhost:3000

# Wompi (Pruebas / Sandbox)
WOMPI_PUBLIC_KEY=pub_test_bQ4F6gqE8IuDGkTMzU2U5XYnbqM6qQlw
WOMPI_PRIVATE_KEY=prv_test_zPSOVazsV7xQZX9gLG6xXAyB6mtnKr1f
WOMPI_INTEGRITY_SECRET=test_integrity_...
WOMPI_EVENTS_SECRET=test_events_RInXucrhfO0FakDE4zhtjteNpb80w1um

# WhatsApp Cloud API (Meta Developers)
WHATSAPP_TOKEN=EAAPqB76O...
WHATSAPP_PHONE_ID=1381562511699163

# Acceso del Doctor
DOCTOR_EMAIL=citas.drjorgejimenez@gmail.com
DOCTOR_PASSWORD_HASH=$2a$10$XXNdCbybWtD4qfxhewZDR.Yd0tZrzVR3V7w8FSYlMc0jelLikIuAq
JWT_SECRET=58729210d0213e67f930a5dbf54994093bbe014a4d344cb9561eedec4165bef2

# Notificaciones por Correo (Gmail SMTP con contraseña de aplicación)
GMAIL_USER=citas.drjorgejimenez@gmail.com
GMAIL_APP_PASSWORD=tbiz ucoj kyxz oows
EMAIL_FROM_NAME=Dr. Jorge Jiménez
```

---

## 🚀 Despliegue en Producción (Hetzner + Coolify)

### 1. Servidor VPS
Recomendado: **Hetzner Cloud CPX22** (3 vCPU AMD, 4 GB RAM, 80 GB NVMe, ~€7/mes en ubicación Ashburn o Falkenstein) con Ubuntu 24.04 LTS.

### 2. Instalar Coolify
En la consola del servidor:
```bash
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
```
Accede a `http://<IP_SERVIDOR>:8000` y crea tu cuenta de administrador.

### 3. Dominio y DNS
Apunta un registro DNS tipo **A** (`@` y `www`) hacia la IP de tu servidor Hetzner. Coolify genera certificados SSL gratuitos (Let's Encrypt / HTTPS) automáticamente.

### 4. Configurar en Coolify
1. Crea un nuevo recurso **Docker Compose** conectando este repositorio.
2. Configura los volúmenes persistentes en el host:
   - `/data/drjimenez/uploads:/app/uploads` (para que las fotos nunca se pierdan al actualizar).
   - `/data/drjimenez/db:/var/lib/postgresql/data` (para persistencia de la base de datos).
3. Añade las variables de entorno en producción:
   - Cambia `FRONTEND_URL` por `https://tudominio.com`.
   - Activa las llaves `pub_prod_...` y `prod_integrity_...` de Wompi.
   - Configura el token permanente de Meta WhatsApp.
4. En el panel de Wompi, registra la URL de eventos:
   `https://tudominio.com/api/payments/webhook`.
5. En `frontend/public/index.html` (línea 550), ajusta `BACKEND_URL` al dominio de producción.

---

## 📡 Mapa de Endpoints Principales (`/api`)

| Método | Endpoint | Acceso | Descripción |
|---|---|---|---|
| `GET` | `/health` | Público | Verificación de estado del servidor |
| `GET` | `/api/services` | Público | Lista los 8 servicios activos (ES/EN) |
| `GET` | `/api/availability?date=YYYY-MM-DD` | Público | Slots de 20 min (filtra horas pasadas en Colombia) |
| `POST` | `/api/appointments` | Público | Agendamiento de valoración inicial (crea cuenta paciente) |
| `POST` | `/api/auth/login` | Público | Login del doctor (retorna JWT doctor de 12h, con rate-limit) |
| `GET` | `/api/appointments` | Doctor | Lista todas las citas activas y completadas |
| `GET` | `/api/appointments/admin/history` | Doctor | Historial paginado con filtros de fecha, estado y buscador |
| `GET` | `/api/appointments/admin/analytics` | Doctor | Métricas consolidadas (servicios, ingresos, asistencia, días) |
| `POST` | `/api/admin/appointments` | Doctor | Agendamiento manual de tratamientos de seguimiento |
| `POST` | `/api/admin/blocked-slots` | Doctor | Bloqueo de franjas horarias o días festivos |
| `POST` | `/api/admin/payments/charge` | Doctor | Generación de cobro con checkout Wompi y código QR |
| `PATCH` | `/api/appointments/:id/mark-paid` | Doctor | Registro de pago presencial en efectivo |
| `POST` | `/api/payments/webhook` | Wompi | Webhook oficial que confirma pagos en línea con firma SHA256 |
| `POST` | `/api/patient-auth/login` | Público | Login del paciente con cédula o email |
| `GET` | `/api/patient/appointments` | Paciente | Historial de citas del paciente autenticado |
| `POST` | `/api/patient/appointments` | Paciente | Agendamiento directo autenticado |
| `PATCH` | `/api/patient/appointments/:id/cancel`| Paciente | Cancelación de cita por parte del paciente |
