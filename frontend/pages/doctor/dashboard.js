import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import PanelNav from '../../components/PanelNav';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://dr-jimenez-platform.onrender.com';
const USD_RATE = 4000;

const STATUS_LABEL = { pending: 'Pendiente', confirmed: 'Confirmada', completed: 'Completada', cancelled: 'Cancelada' };

function formatMoney(value, currency) {
  const amount = currency === 'USD' ? Number(value) / USD_RATE : Number(value);
  return new Intl.NumberFormat(currency === 'USD' ? 'en-US' : 'es-CO', {
    style: 'currency', currency, maximumFractionDigits: currency === 'USD' ? 2 : 0,
  }).format(amount);
}

export default function Dashboard() {
  const router = useRouter();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currency, setCurrency] = useState('COP');

  function getToken() {
    return typeof window !== 'undefined' ? localStorage.getItem('doctor_token') : null;
  }
  function authHeaders() {
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` };
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

  async function updateStatus(id, status, alreadyPaid) {
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

    if (status === 'completed' && !alreadyPaid) {
      const input = prompt('¿Cuánto se le cobró al paciente? (COP) — este dato es obligatorio para completar la cita.', '');
      if (input === null) return;
      const amount = Number(input.replace(/[^0-9]/g, ''));
      if (!Number.isFinite(amount) || amount <= 0) {
        alert('Debes ingresar un valor mayor a cero para poder completar la cita.');
        return;
      }
      body.amount_paid = amount;
    }

    try {
      const res = await fetch(`${BACKEND_URL}/api/appointments/${id}`, { method: 'PATCH', headers: authHeaders(), body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo actualizar');
      loadAppointments();
    } catch (err) {
      alert(err.message);
    }
  }

  async function markPaidCash(id) {
    if (!confirm('¿Confirmas que este paciente ya pagó en efectivo / presencial?')) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/appointments/${id}/mark-paid`, { method: 'PATCH', headers: authHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo registrar el pago');
      loadAppointments();
    } catch (err) {
      alert(err.message);
    }
  }

  async function editDuration(id, current) {
    const input = prompt('Nueva duración de la cita (minutos):', String(current || 20));
    if (input === null) return;
    const minutes = parseInt(input, 10);
    if (!Number.isInteger(minutes) || minutes < 5 || minutes > 480) {
      alert('Ingresa un número de minutos válido (entre 5 y 480).');
      return;
    }
    try {
      const res = await fetch(`${BACKEND_URL}/api/appointments/${id}/duration`, {
        method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ duration_minutes: minutes }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'No se pudo actualizar la duración');
      loadAppointments();
    } catch (err) {
      alert(err.message);
    }
  }

  async function resetPatientPassword(patientId, email) {
    if (!confirm(`¿Generar una contraseña nueva y reenviarla a ${email}?`)) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/patients/${patientId}/reset-password`, { method: 'POST', headers: authHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo restablecer');
      alert(`Contraseña nueva enviada a ${data.email}.`);
    } catch (err) {
      alert(err.message);
    }
  }

  async function changePatientEmail(patientId, currentEmail) {
    const newEmail = prompt('Nuevo correo de acceso para este paciente:', currentEmail);
    if (!newEmail || newEmail === currentEmail) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/patients/${patientId}`, {
        method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ email: newEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo actualizar el correo');
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

        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          <button type="button" className="panel-btn" style={currency === 'COP' ? { borderColor: '#4d7ea8', color: '#fff' } : {}} onClick={() => setCurrency('COP')}>COP</button>
          <button type="button" className="panel-btn" style={currency === 'USD' ? { borderColor: '#4d7ea8', color: '#fff' } : {}} onClick={() => setCurrency('USD')}>USD</button>
        </div>

        {loading && <p className="panel-empty">Cargando citas…</p>}
        {error && <p className="panel-msg error">{error}</p>}
        {!loading && !error && appointments.length === 0 && <p className="panel-empty">Todavía no hay citas agendadas.</p>}

        {!loading && appointments.length > 0 && (
          <div className="panel-list">
            {appointments.map((a) => {
              const alreadyPaid = a.payment_status === 'paid';
              return (
                <div className="panel-row" key={a.id}>
                  <div>
                    <div className="panel-row-main">{a.client_name} — {a.service_name}</div>
                    <div className="panel-row-meta">
                      {a.appointment_date?.slice(0, 10)} · {a.start_time?.slice(0, 5)} · {a.duration_minutes || 20} min · {a.client_email}
                      {a.amount_paid > 0 && ` · ${formatMoney(a.amount_paid, currency)} ${alreadyPaid ? '(pagado)' : '(pendiente)'}`}
                    </div>
                  </div>
                  <div className="panel-row-actions" style={{ alignItems: 'center' }}>
                    <span className={`panel-badge badge-${a.status}`}>{STATUS_LABEL[a.status] || a.status}</span>
                    {a.status !== 'cancelled' && (
                      <button className="panel-btn" onClick={() => editDuration(a.id, a.duration_minutes)}>Editar duración</button>
                    )}
                    {a.status !== 'confirmed' && a.status !== 'cancelled' && (
                      <button className="panel-btn" onClick={() => updateStatus(a.id, 'confirmed')}>Confirmar</button>
                    )}
                    {a.status !== 'completed' && (
                      <button className="panel-btn" onClick={() => updateStatus(a.id, 'completed', alreadyPaid)}>Completar</button>
                    )}
                    {a.status === 'completed' && !alreadyPaid && a.amount_paid > 0 && (
                      <button className="panel-btn panel-btn-primary" onClick={() => markPaidCash(a.id)}>Marcar pagado (efectivo)</button>
                    )}
                    {a.status !== 'cancelled' && (
                      <button className="panel-btn panel-btn-danger" onClick={() => updateStatus(a.id, 'cancelled')}>Cancelar</button>
                    )}
                    <button className="panel-btn" onClick={() => resetPatientPassword(a.patient_id, a.client_email)}>Restablecer clave</button>
                    <button className="panel-btn" onClick={() => changePatientEmail(a.patient_id, a.client_email)}>Cambiar correo</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
