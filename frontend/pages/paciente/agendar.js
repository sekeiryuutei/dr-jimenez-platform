import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import PanelNav from '../../components/PanelNav';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://dr-jimenez-platform.onrender.com';

// Fecha local de hoy (no UTC) -- mismo bug de zona horaria que en /doctor/charge.
function todayLocalISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function PatientBooking() {
  const router = useRouter();
  const [services, setServices] = useState([]);
  const [serviceId, setServiceId] = useState('');
  const [date, setDate] = useState('');
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkingSlots, setCheckingSlots] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('patient_token') : null; }

  useEffect(() => {
    if (!getToken()) { router.replace('/paciente/login'); return; }
    fetch(`${BACKEND_URL}/api/services`)
      .then((res) => res.json())
      .then(setServices)
      .catch(() => setError('No se pudo cargar el catálogo de servicios'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function checkAvailability() {
    if (!date) return;
    setCheckingSlots(true);
    setSelectedSlot(null);
    setSlots([]);
    try {
      const res = await fetch(`${BACKEND_URL}/api/availability?date=${date}`);
      const data = await res.json();
      setSlots(data.slots || []);
    } catch (err) {
      setError('No se pudo consultar la disponibilidad');
    } finally {
      setCheckingSlots(false);
    }
  }

  async function confirmBooking() {
    if (!serviceId || !date || !selectedSlot) return;
    setBusy(true);
    setMessage('');
    try {
      const res = await fetch(`${BACKEND_URL}/api/patient/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ service_id: Number(serviceId), appointment_date: date, start_time: selectedSlot }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo agendar');
      setMessage('¡Cita agendada! Puedes verla en "Mis citas".');
      setSelectedSlot(null);
      setSlots([]);
      setDate('');
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusy(false);
    }
  }

  function logout() {
    localStorage.removeItem('patient_token');
    localStorage.removeItem('patient_name');
    router.push('/paciente/login');
  }

  return (
    <main className="panel-body">
      <PanelNav role="patient" onLogout={logout} />

      <div className="panel-content" style={{ maxWidth: 520 }}>
        <div className="panel-eyebrow">Mi cuenta</div>
        <h1 className="panel-title">Agendar una cita</h1>
        <p className="panel-subtitle">Elige el servicio, la fecha y un horario disponible. No necesitas volver a ingresar tus datos.</p>

        {loading && <p className="panel-empty">Cargando…</p>}
        {error && <p className="panel-msg error">{error}</p>}

        {!loading && (
          <>
            <label className="panel-label" style={{ marginTop: 0 }}>Servicio</label>
            <select className="panel-select" value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
              <option value="">Selecciona…</option>
              {services.map((s) => <option key={s.id} value={s.id}>{s.name_es}</option>)}
            </select>

            <label className="panel-label">Fecha</label>
            <div style={{ display: 'flex', gap: 10 }}>
              <input className="panel-input" type="date" value={date} min={todayLocalISO()} onChange={(e) => setDate(e.target.value)} />
              <button type="button" className="panel-btn" onClick={checkAvailability} disabled={!date || checkingSlots}>
                {checkingSlots ? 'Buscando…' : 'Ver horarios'}
              </button>
            </div>

            {slots.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 16 }}>
                {slots.map((s) => (
                  <button
                    key={s.time}
                    type="button"
                    disabled={!s.available}
                    onClick={() => setSelectedSlot(s.time)}
                    className="panel-btn"
                    style={{
                      opacity: s.available ? 1 : 0.3,
                      textDecoration: s.available ? 'none' : 'line-through',
                      ...(selectedSlot === s.time ? { background: '#4d7ea8', borderColor: '#4d7ea8', color: '#fff' } : {}),
                    }}
                  >
                    {s.time}
                  </button>
                ))}
              </div>
            )}

            <button
              type="button"
              className="panel-btn panel-btn-primary panel-btn-block"
              style={{ marginTop: 26 }}
              disabled={!serviceId || !selectedSlot || busy}
              onClick={confirmBooking}
            >
              {busy ? 'Agendando…' : 'Confirmar cita'}
            </button>

            {message && <p className={`panel-msg ${message.startsWith('¡') ? 'success' : 'error'}`}>{message}</p>}
          </>
        )}
      </div>
    </main>
  );
}
