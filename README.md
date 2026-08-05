# Dr. Jorge Jiménez — Plataforma Web

Proyecto: sitio de marketing + sistema de agendamiento + dashboard + pagos.

## Estructura

```
dr-jimenez-platform/
├── docker-compose.yml       -> levanta frontend + backend + base de datos
├── frontend/                -> Next.js (menú de prototipos, luego el sitio real)
│   └── public/prototypes/   -> HTMLs de diseño para revisar con el doctor
├── backend/                 -> API Node/Express + PostgreSQL
│   ├── src/routes/          -> servicios, disponibilidad, citas, pagos
│   └── init-db/schema.sql   -> se ejecuta automático al crear la base de datos
└── .github/workflows/       -> publica el frontend estático en GitHub Pages
```

## Correr todo en local (Docker)

Requisitos: Docker Desktop instalado.

```bash
cp backend/.env.example backend/.env   # y llena las credenciales cuando las tengas
docker-compose up --build
```

- Frontend: http://localhost:3000
- Backend / API: http://localhost:4000/health
- Base de datos: localhost:5432 (usuario `drjimenez`, password `drjimenez_dev`, ver docker-compose.yml)

La base de datos se crea automáticamente con el esquema y los servicios semilla
la primera vez que levantas el contenedor `db` (gracias a `init-db/schema.sql`).

## Endpoints del backend

| Método | Ruta | Qué hace |
|---|---|---|
| GET | `/api/services` | Catálogo de servicios (sin precios) |
| GET | `/api/availability?date=YYYY-MM-DD` | Horarios libres/ocupados ese día |
| POST | `/api/appointments` | Crea una cita |
| GET | `/api/appointments` | Lista todas las citas (dashboard) |
| PATCH | `/api/appointments/:id` | Cambia el estado de una cita |
| GET | `/api/appointments/stats/revenue` | Ingresos agrupados por mes |
| POST | `/api/payments/intent` | Genera el intento de pago (Wompi) |
| POST | `/api/payments/webhook` | Wompi notifica aquí cuando el pago se aprueba |

## Publicar el frontend en GitHub Pages

**Importante**: GitHub Pages solo sirve archivos estáticos. El menú de prototipos
(`frontend/pages/index.js` y los HTMLs en `frontend/public/prototypes/`) funciona
perfecto ahí. El backend (citas, pagos, dashboard con datos reales) **no puede
vivir en GitHub Pages** — necesita un hosting con servidor (Railway, Render, un VPS, etc.)
cuando pasemos a la fase de sistema funcional completo.

Pasos:
1. Sube este repo a GitHub.
2. En el repo, ve a **Settings → Pages → Source** y selecciona **GitHub Actions**.
3. Cada vez que hagas push a `main` con cambios en `frontend/`, el workflow
   `.github/workflows/deploy-pages.yml` construye y publica el sitio automáticamente.
4. Revisa `frontend/next.config.js` — la variable `repoName` debe coincidir
   exactamente con el nombre de tu repositorio en GitHub, o las rutas se rompen.

Tu sitio quedará en: `https://tu-usuario.github.io/dr-jimenez-platform/`

## Siguientes pasos sugeridos

1. Confirmar con el doctor la dirección de diseño (prototipo actual).
2. Conectar el catálogo del frontend real al endpoint `/api/services`.
3. Construir la UI de agendamiento (calendario + horarios) contra `/api/availability`.
4. Construir el dashboard del doctor (login, calendario, clientes, ingresos).
5. Activar cuenta comercial de Wompi y completar las credenciales en `.env`.
6. Mover el backend a un hosting real para que el doctor pueda usarlo en producción.
# dr-jimenez-platform
