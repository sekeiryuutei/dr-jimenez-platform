import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import PanelNav from '../../components/PanelNav';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://dr-jimenez-platform.onrender.com';

export default function Schedule() {
  const router = useRouter();
  const [services, setServices] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rescheduling, setRescheduling] = useState(null);

  const [newAppt, setNewAppt] = useState({ cedula: '', client_name: '', client_email: '', client_phone: '', service_id: '', appointment_date: '', start_time: '' });
  const [newBlock, setNewBlock] = useState({ block_date: '', start_time: '', end_time: '', reason: '' });
  const [busy, setBusy] = useState(false);
  const [formMsg, setFormMsg] = useState('');

  function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('doctor_token') : null; }
  function authHeaders() { return { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' }; }

  async function loadAll() {
    if (!getToken()) { router.replace('/doctor/login'); return; }
    setLoading(true);
    setError('');
    try {
      const [svcRes, apptRes, blkRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/services`),
        fetch(`${BACKEND_URL}/api/appointments`, { headers: authHeaders() }),
        fetch(`${BACKEND_URL}/api/admin/blocked-slots`, { headers: authHeaders() }),
      ]);
      if (apptRes.status === 401) { router.replace('/doctor/login'); return; }
      setServices(await svcRes.json());
      setAppointments(await apptRes.json());
      setBlocks(await blkRes.json());
    } catch (err) {
      setError('No se pudo conectar con el servidor');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function createAppointment(e) {
    e.preventDefault();
    setBusy(true);
    setFormMsg('');
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/appointments`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(newAppt) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al crear la cita');
      setFormMsg(data.account_created ? 'Cita creada. Se generó una cuenta nueva para el paciente.' : 'Cita creada.');
      setNewAppt({ cedula: '', client_name: '', client_email: '', client_phone: '', service_id: '', appointment_date: '', start_time: '' });
      loadAll();
    } catch (err) {
      setFormMsg(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function saveReschedule(id, date, time) {
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/appointments/${id}/reschedule`, { method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ appointment_date: date, start_time: time }) });
      if (!res.ok) throw new Error((await res.json()).error || 'No se pudo reagendar');
      setRescheduling(null);
      loadAll();
    } catch (err) {
      alert(err.message);
    }
  }

  async function updateStatus(id, status) {
<<<<<<< HEAD
    try {
      const res = await fetch(`${BACKEND_URL}/api/appointments/${id}`, { method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ status }) });
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

    try {
      const res = await fetch(`${BACKEND_URL}/api/appointments/${id}`, { method: 'PATCH', headers: authHeaders(), body: JSON.stringify(body) });
>>>>>>> e21f803 (cambios, 90%)
      if (!res.ok) throw new Error('No se pudo actualizar');
      loadAll();
    } catch (err) {
      alert(err.message);
    }
  }

  async function addBlock(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/blocked-slots`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(newBlock) });
      if (!res.ok) throw new Error((await res.json()).error || 'Error al bloquear');
      setNewBlock({ block_date: '', start_time: '', end_time: '', reason: '' });
      loadAll();
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function removeBlock(id) {
    if (!confirm('¿Quitar este bloqueo?')) return;
    try {
      await fetch(`${BACKEND_URL}/api/admin/blocked-slots/${id}`, { method: 'DELETE', headers: authHeaders() });
      loadAll();
    } catch (err) {
      alert(err.message);
    }
  }

  function logout() {
    localStorage.removeItem('doctor_token');
    router.push('/doctor/login');
  }

  const upcoming = appointments.filter((a) => a.status !== 'cancelled' && a.status !== 'completed');

  return (
    <main className="panel-body">
      <PanelNav role="doctor" active="/doctor/schedule" onLogout={logout} />

      <div className="panel-content">
        <div className="panel-eyebrow">Panel del doctor</div>
        <h1 className="panel-title">Agenda interna</h1>
        <p className="panel-subtitle">Crea citas de seguimiento, reagenda, y bloquea horarios — todo se refleja al instante en la disponibilidad pública.</p>

        {loading && <p className="panel-empty">Cargando…</p>}
        {error && <p className="panel-msg error">{error}</p>}

        {!loading && (
          <>
            <section className="panel-section">
              <h2 className="panel-section-title">Crear cita manual</h2>
              <p className="panel-section-hint">Para tratamientos de seguimiento o cuando el paciente agenda por teléfono/WhatsApp.</p>
              <form onSubmit={createAppointment}>
                <div className="panel-form-grid">
                  <input className="panel-input" placeholder="Cédula" value={newAppt.cedula} onChange={(e) => setNewAppt({ ...newAppt, cedula: e.target.value })} required />
                  <input className="panel-input" placeholder="Nombre completo" value={newAppt.client_name} onChange={(e) => setNewAppt({ ...newAppt, client_name: e.target.value })} required />
                  <input className="panel-input" type="email" placeholder="Email" value={newAppt.client_email} onChange={(e) => setNewAppt({ ...newAppt, client_email: e.target.value })} required />
                  <input className="panel-input" placeholder="Teléfono" value={newAppt.client_phone} onChange={(e) => setNewAppt({ ...newAppt, client_phone: e.target.value })} />
                  <select className="panel-select" value={newAppt.service_id} onChange={(e) => setNewAppt({ ...newAppt, service_id: e.target.value })} required>
                    <option value="">Servicio…</option>
                    {services.map((s) => <option key={s.id} value={s.id}>{s.name_es}</option>)}
                  </select>
                  <input className="panel-input" type="date" value={newAppt.appointment_date} onChange={(e) => setNewAppt({ ...newAppt, appointment_date: e.target.value })} required />
                  <input className="panel-input" type="time" value={newAppt.start_time} onChange={(e) => setNewAppt({ ...newAppt, start_time: e.target.value })} required />
                </div>
                <button type="submit" className="panel-btn panel-btn-primary" disabled={busy}>{busy ? 'Creando…' : 'Crear cita'}</button>
              </form>
              {formMsg && <p className="panel-msg success">{formMsg}</p>}
            </section>

            <section className="panel-section">
              <h2 className="panel-section-title">Próximas citas</h2>
              {upcoming.length === 0 && <p className="panel-empty">No hay citas próximas.</p>}
              {upcoming.length > 0 && (
                <div className="panel-list">
                  {upcoming.map((a) => (
                    <div className="panel-row" key={a.id}>
                      {rescheduling === a.id ? (
                        <RescheduleRow appt={a} onSave={saveReschedule} onCancel={() => setRescheduling(null)} />
                      ) : (
                        <>
                          <div>
                            <div className="panel-row-main">{a.client_name} — {a.service_name}</div>
                            <div className="panel-row-meta">{a.appointment_date?.slice(0, 10)} · {a.start_time?.slice(0, 5)} · {a.status}</div>
                          </div>
                          <div className="panel-row-actions">
                            <button className="panel-btn" onClick={() => setRescheduling(a.id)}>Reagendar</button>
                            <button className="panel-btn" onClick={() => updateStatus(a.id, 'confirmed')}>Confirmar</button>
                            <button className="panel-btn" onClick={() => updateStatus(a.id, 'completed')}>Completar</button>
                            <button className="panel-btn panel-btn-danger" onClick={() => updateStatus(a.id, 'cancelled')}>Cancelar</button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="panel-section">
              <h2 className="panel-section-title">Bloquear horarios</h2>
              <p className="panel-section-hint">Vacaciones, almuerzo, o cualquier bloque en el que no quieras que agenden.</p>
              <form onSubmit={addBlock}>
                <div className="panel-form-grid">
                  <input className="panel-input" type="date" value={newBlock.block_date} onChange={(e) => setNewBlock({ ...newBlock, block_date: e.target.value })} required />
                  <input className="panel-input" type="time" value={newBlock.start_time} onChange={(e) => setNewBlock({ ...newBlock, start_time: e.target.value })} required />
                  <input className="panel-input" type="time" value={newBlock.end_time} onChange={(e) => setNewBlock({ ...newBlock, end_time: e.target.value })} required />
                  <input className="panel-input" placeholder="Motivo (opcional)" value={newBlock.reason} onChange={(e) => setNewBlock({ ...newBlock, reason: e.target.value })} />
                </div>
                <button type="submit" className="panel-btn panel-btn-primary" disabled={busy}>{busy ? 'Guardando…' : 'Bloquear'}</button>
              </form>
              <div style={{ marginTop: 20 }}>
                {blocks.length === 0 && <p className="panel-empty">No hay horarios bloqueados.</p>}
                {blocks.length > 0 && (
                  <div className="panel-list">
                    {blocks.map((b) => (
                      <div className="panel-row" key={b.id}>
                        <div>
                          <div className="panel-row-main">{b.block_date?.slice(0, 10)} · {b.start_time?.slice(0, 5)}–{b.end_time?.slice(0, 5)}</div>
                          <div className="panel-row-meta">{b.reason || 'Sin motivo especificado'}</div>
                        </div>
                        <button className="panel-btn panel-btn-danger" onClick={() => removeBlock(b.id)}>Quitar</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function RescheduleRow({ appt, onSave, onCancel }) {
  const [date, setDate] = useState(appt.appointment_date?.slice(0, 10) || '');
  const [time, setTime] = useState(appt.start_time?.slice(0, 5) || '');
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', width: '100%' }}>
      <input className="panel-input" style={{ width: 160 }} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      <input className="panel-input" style={{ width: 120 }} type="time" value={time} onChange={(e) => setTime(e.target.value)} />
      <button className="panel-btn panel-btn-primary" onClick={() => onSave(appt.id, date, time)}>Guardar</button>
      <button className="panel-btn" onClick={onCancel}>Cancelar</button>
    </div>
  );
}
