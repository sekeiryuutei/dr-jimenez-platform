import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import PanelNav from '../../components/PanelNav';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://dr-jimenez-platform.onrender.com';

const STATUS_LABEL = { pending: 'Pendiente', confirmed: 'Confirmada', completed: 'Completada', cancelled: 'Cancelada' };

export default function PatientDashboard() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('patient_token') : null; }

  async function loadAppointments() {
    const token = getToken();
    if (!token) { router.replace('/paciente/login'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${BACKEND_URL}/api/patient/appointments`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 401 || res.status === 403) { localStorage.removeItem('patient_token'); router.replace('/paciente/login'); return; }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cargar tus citas');
      setAppointments(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setName(localStorage.getItem('patient_name') || '');
    loadAppointments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function cancelAppointment(id) {
    if (!confirm('¿Cancelar esta cita?')) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/patient/appointments/${id}/cancel`, { method: 'PATCH', headers: { Authorization: `Bearer ${getToken()}` } });
      if (!res.ok) throw new Error((await res.json()).error || 'No se pudo cancelar');
      loadAppointments();
    } catch (err) {
      alert(err.message);
    }
  }

  function logout() {
    localStorage.removeItem('patient_token');
    localStorage.removeItem('patient_name');
    router.push('/paciente/login');
  }

  return (
    <main className="panel-body">
      <PanelNav role="patient" subtitle={name ? `Hola, ${name}` : 'Mi cuenta'} onLogout={logout} />

      <div className="panel-content" style={{ maxWidth: 760 }}>
        <div className="panel-eyebrow">Mi cuenta</div>
        <h1 className="panel-title">Mis citas</h1>
        <p className="panel-subtitle">Aquí ves el estado de tus citas, el valor cuando aplique, y puedes cancelar las que aún no se hayan realizado.</p>

        {loading && <p className="panel-empty">Cargando…</p>}
        {error && <p className="panel-msg error">{error}</p>}
        {!loading && !error && appointments.length === 0 && <p className="panel-empty">Todavía no tienes citas registradas.</p>}

        {!loading && appointments.length > 0 && (
          <div className="panel-list">
            {appointments.map((a) => (
              <div className="panel-row" key={a.id}>
                <div>
                  <div className="panel-row-main">{a.service_name}</div>
                  <div className="panel-row-meta">{a.appointment_date?.slice(0, 10)} · {a.start_time?.slice(0, 5)}</div>
                  {a.amount_paid > 0 && <div className="panel-row-meta">Valor: ${Number(a.amount_paid).toLocaleString('es-CO')}</div>}
                </div>
                <div className="panel-row-actions" style={{ alignItems: 'center' }}>
                  <span className={`panel-badge badge-${a.status}`}>{STATUS_LABEL[a.status] || a.status}</span>
                  {(a.status === 'pending' || a.status === 'confirmed') && (
                    <button className="panel-btn panel-btn-danger" onClick={() => cancelAppointment(a.id)}>Cancelar</button>
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
