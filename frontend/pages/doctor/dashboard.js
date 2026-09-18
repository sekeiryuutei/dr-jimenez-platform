import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import PanelNav from '../../components/PanelNav';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://dr-jimenez-platform.onrender.com';

const STATUS_LABEL = { pending: 'Pendiente', confirmed: 'Confirmada', completed: 'Completada', cancelled: 'Cancelada' };

export default function Dashboard() {
  const router = useRouter();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  function getToken() {
    return typeof window !== 'undefined' ? localStorage.getItem('doctor_token') : null;
  }

  async function loadAppointments() {
    const token = getToken();
    if (!token) { router.replace('/doctor/login'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${BACKEND_URL}/api/appointments`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 401) { localStorage.removeItem('doctor_token'); router.replace('/doctor/login'); return; }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cargar las citas');
      setAppointments(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAppointments(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function updateStatus(id, status) {
<<<<<<< HEAD
=======
    const body = { status };

    if (status === 'confirmed') {
      const input = prompt('¿Cuánto tiempo va a ocupar esta cita? (minutos)', '20');
      if (input === null) return;
      const minutes = parseInt(input, 10);
      if (!Number.isInteger(minutes) || minutes < 5 || minutes > 480) {
        alert('Ingresa un número de minutos válido (entre 5 y 480).');
        return;
      }
      body.duration_minutes = minutes;
    }

    if (status === 'completed') {
      const input = prompt('¿Cuánto se le cobró al paciente? (COP, deja vacío si aún no se cobra)', '');
      if (input === null) return;
      if (input.trim() !== '') {
        const amount = Number(input.replace(/[^0-9]/g, ''));
        if (!Number.isFinite(amount) || amount < 0) {
          alert('Ingresa un valor numérico válido.');
          return;
        }
        body.amount_paid = amount;
      }
    }

>>>>>>> e21f803 (cambios, 90%)
    try {
      const res = await fetch(`${BACKEND_URL}/api/appointments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
<<<<<<< HEAD
        body: JSON.stringify({ status }),
=======
        body: JSON.stringify(body),
>>>>>>> e21f803 (cambios, 90%)
      });
      if (!res.ok) throw new Error('No se pudo actualizar');
      loadAppointments();
    } catch (err) {
      alert(err.message);
    }
  }

  function logout() {
    localStorage.removeItem('doctor_token');
    router.push('/doctor/login');
  }

  return (
    <main className="panel-body">
      <PanelNav role="doctor" active="/doctor/dashboard" onLogout={logout} />

      <div className="panel-content">
        <div className="panel-eyebrow">Panel del doctor</div>
        <h1 className="panel-title">Citas agendadas</h1>
        <p className="panel-subtitle">Todas las valoraciones y tratamientos, agendados desde el sitio público o creados manualmente desde tu agenda interna.</p>

        {loading && <p className="panel-empty">Cargando citas…</p>}
        {error && <p className="panel-msg error">{error}</p>}
        {!loading && !error && appointments.length === 0 && <p className="panel-empty">Todavía no hay citas agendadas.</p>}

        {!loading && appointments.length > 0 && (
          <div className="panel-list">
            {appointments.map((a) => (
              <div className="panel-row" key={a.id}>
                <div>
                  <div className="panel-row-main">{a.client_name} — {a.service_name}</div>
<<<<<<< HEAD
                  <div className="panel-row-meta">{a.appointment_date?.slice(0, 10)} · {a.start_time?.slice(0, 5)} · {a.client_email}</div>
=======
                  <div className="panel-row-meta">
                    {a.appointment_date?.slice(0, 10)} · {a.start_time?.slice(0, 5)} · {a.duration_minutes || 20} min · {a.client_email}
                    {a.amount_paid > 0 && ` · $${Number(a.amount_paid).toLocaleString('es-CO')}`}
                  </div>
>>>>>>> e21f803 (cambios, 90%)
                </div>
                <div className="panel-row-actions" style={{ alignItems: 'center' }}>
                  <span className={`panel-badge badge-${a.status}`}>{STATUS_LABEL[a.status] || a.status}</span>
                  {a.status !== 'confirmed' && a.status !== 'cancelled' && (
                    <button className="panel-btn" onClick={() => updateStatus(a.id, 'confirmed')}>Confirmar</button>
                  )}
                  {a.status !== 'completed' && (
                    <button className="panel-btn" onClick={() => updateStatus(a.id, 'completed')}>Completar</button>
                  )}
                  {a.status !== 'cancelled' && (
                    <button className="panel-btn panel-btn-danger" onClick={() => updateStatus(a.id, 'cancelled')}>Cancelar</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
