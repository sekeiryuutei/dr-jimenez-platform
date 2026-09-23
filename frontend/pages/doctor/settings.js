import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import PanelNav from '../../components/PanelNav';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://dr-jimenez-platform.onrender.com';

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export default function AvailabilitySettings() {
  const router = useRouter();
  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('doctor_token') : null; }
  function authHeaders() { return { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` }; }

  async function load() {
    if (!getToken()) { router.replace('/doctor/login'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/availability-settings`, { headers: authHeaders() });
      if (res.status === 401) { router.replace('/doctor/login'); return; }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cargar el horario');
      setDays(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  function updateDay(weekday, changes) {
    setDays((prev) => prev.map((d) => (d.weekday === weekday ? { ...d, ...changes } : d)));
  }

  async function save() {
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/availability-settings`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ days }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo guardar');
      setMessage('Horario guardado. Ya se refleja en el calendario del sitio público.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function logout() {
    localStorage.removeItem('doctor_token');
    router.push('/doctor/login');
  }

  return (
    <main className="panel-body">
      <PanelNav role="doctor" active="/doctor/settings" onLogout={logout} />

      <div className="panel-content" style={{ maxWidth: 640 }}>
        <div className="panel-eyebrow">Panel del doctor</div>
        <h1 className="panel-title">Horario de atención</h1>
        <p className="panel-subtitle">
          Activa los días en que atiendes y define la jornada de cada uno. El calendario público y la agenda interna
          respetan esto automáticamente — si desactivas un día, nadie podrá agendar ese día.
        </p>

        {loading && <p className="panel-empty">Cargando…</p>}
        {error && <p className="panel-msg error">{error}</p>}

        {!loading && (
          <>
            <div className="panel-list">
              {days.map((d) => (
                <div className="panel-row" key={d.weekday} style={{ alignItems: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 140 }}>
                    <input
                      type="checkbox"
                      checked={d.active}
                      onChange={(e) => updateDay(d.weekday, { active: e.target.checked })}
                    />
                    <span className="panel-row-main">{DAY_NAMES[d.weekday]}</span>
                  </label>

                  {d.active ? (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input
                        type="time"
                        className="panel-input"
                        style={{ width: 120 }}
                        value={d.start_time}
                        onChange={(e) => updateDay(d.weekday, { start_time: e.target.value })}
                      />
                      <span className="panel-row-meta">a</span>
                      <input
                        type="time"
                        className="panel-input"
                        style={{ width: 120 }}
                        value={d.end_time}
                        onChange={(e) => updateDay(d.weekday, { end_time: e.target.value })}
                      />
                    </div>
                  ) : (
                    <span className="panel-row-meta">Cerrado</span>
                  )}
                </div>
              ))}
            </div>

            <button className="panel-btn panel-btn-primary" style={{ marginTop: 24 }} onClick={save} disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar horario'}
            </button>

            {message && <p className="panel-msg success">{message}</p>}
          </>
        )}
      </div>
    </main>
  );
}
