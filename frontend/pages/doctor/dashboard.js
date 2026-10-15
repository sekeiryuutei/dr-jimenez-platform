import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import PanelNav from '../../components/PanelNav';

const BACKEND_URL = (typeof window !== 'undefined' && window.location.hostname && !['localhost', '127.0.0.1'].includes(window.location.hostname)) ? `http://${window.location.hostname}:4000` : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000');
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
  const [services, setServices] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currency, setCurrency] = useState('COP');

  // Pestaña activa dentro del Dashboard consolidado: 'citas', 'nueva_cita', 'bloqueos'
  const [tab, setTab] = useState('citas');
  const [rescheduling, setRescheduling] = useState(null);

  // Formulario de nueva cita manual
  const [newAppt, setNewAppt] = useState({ cedula: '', client_name: '', client_email: '', client_phone: '', service_id: '', appointment_date: '', start_time: '' });
  // Formulario de bloqueo de horario
  const [newBlock, setNewBlock] = useState({ block_date: '', start_time: '', end_time: '', reason: '' });
  const [busy, setBusy] = useState(false);
  const [formMsg, setFormMsg] = useState({ text: '', type: '' });

  function getToken() {
    return typeof window !== 'undefined' ? localStorage.getItem('doctor_token') : null;
  }
  function authHeaders() {
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` };
  }

  async function loadAll() {
    const token = getToken();
    if (!token) { router.replace('/doctor/login'); return; }
    setLoading(true);
    setError('');
    try {
      const [apptRes, svcRes, blkRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/appointments`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${BACKEND_URL}/api/services`),
        fetch(`${BACKEND_URL}/api/admin/blocked-slots`, { headers: authHeaders() }),
      ]);
      if (apptRes.status === 401) { localStorage.removeItem('doctor_token'); router.replace('/doctor/login'); return; }
      const dataAppt = await apptRes.json();
      if (!apptRes.ok) throw new Error(dataAppt.error || 'Error al cargar las citas');
      setAppointments(dataAppt);
      if (svcRes.ok) setServices(await svcRes.json());
      if (blkRes.ok) setBlocks(await blkRes.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function createAppointment(e) {
    e.preventDefault();
    setBusy(true);
    setFormMsg({ text: '', type: '' });
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/appointments`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(newAppt),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al crear la cita');
      setFormMsg({
        text: data.account_created ? 'Cita creada exitosamente. Se generó una cuenta nueva para el paciente.' : 'Cita creada exitosamente.',
        type: 'success',
      });
      setNewAppt({ cedula: '', client_name: '', client_email: '', client_phone: '', service_id: '', appointment_date: '', start_time: '' });
      loadAll();
    } catch (err) {
      setFormMsg({ text: err.message, type: 'error' });
    } finally {
      setBusy(false);
    }
  }

  async function saveReschedule(id, date, time) {
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/appointments/${id}/reschedule`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ appointment_date: date, start_time: time }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'No se pudo reagendar');
      setRescheduling(null);
      loadAll();
    } catch (err) {
      alert(err.message);
    }
  }

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
      const res = await fetch(`/api/appointments/${id}`, { method: 'PATCH', headers: authHeaders(), body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo actualizar');
      loadAll();
    } catch (err) {
      alert(err.message);
    }
  }

  async function markPaidCash(id) {
    if (!confirm('¿Confirmas que este paciente ya pagó en efectivo / presencial?')) return;
    try {
      const res = await fetch(`/api/appointments/${id}/mark-paid`, { method: 'PATCH', headers: authHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo registrar el pago');
      loadAll();
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
      const res = await fetch(`/api/appointments/${id}/duration`, {
        method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ duration_minutes: minutes }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'No se pudo actualizar la duración');
      loadAll();
    } catch (err) {
      alert(err.message);
    }
  }

  async function resetPatientPassword(patientId, email) {
    if (!confirm(`¿Generar una contraseña nueva y reenviarla a ${email}?`)) return;
    try {
      const res = await fetch(`/api/admin/patients/${patientId}/reset-password`, { method: 'POST', headers: authHeaders() });
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
      const res = await fetch(`/api/admin/patients/${patientId}`, {
        method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ email: newEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo actualizar el correo');
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

  return (
    <main className="panel-body">
      <PanelNav role="doctor" active="/doctor/dashboard" onLogout={logout} />

      <div className="panel-content">
        <div className="panel-eyebrow">Panel del doctor</div>
        <h1 className="panel-title">Citas y Agenda</h1>
        <p className="panel-subtitle">Gestiona todas las citas agendadas, crea tratamientos de seguimiento y bloquea horarios en un solo lugar.</p>

        {/* Barra superior con navegación de sub-secciones y moneda */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className="panel-btn"
              style={tab === 'citas' ? { borderColor: '#4d7ea8', color: '#fff', background: '#123a5c' } : {}}
              onClick={() => setTab('citas')}
            >
              Lista de citas ({appointments.length})
            </button>
            <button
              type="button"
              className="panel-btn"
              style={tab === 'nueva_cita' ? { borderColor: '#4d7ea8', color: '#fff', background: '#123a5c' } : {}}
              onClick={() => { setTab('nueva_cita'); setFormMsg({ text: '', type: '' }); }}
            >
              + Nueva cita manual
            </button>
            <button
              type="button"
              className="panel-btn"
              style={tab === 'bloqueos' ? { borderColor: '#4d7ea8', color: '#fff', background: '#123a5c' } : {}}
              onClick={() => setTab('bloqueos')}
            >
              Bloquear horarios ({blocks.length})
            </button>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="panel-btn" style={currency === 'COP' ? { borderColor: '#4d7ea8', color: '#fff' } : {}} onClick={() => setCurrency('COP')}>COP</button>
            <button type="button" className="panel-btn" style={currency === 'USD' ? { borderColor: '#4d7ea8', color: '#fff' } : {}} onClick={() => setCurrency('USD')}>USD</button>
          </div>
        </div>

        {loading && <p className="panel-empty">Cargando…</p>}
        {error && <p className="panel-msg error">{error}</p>}

        {/* PESTAÑA 1: LISTADO DE CITAS */}
        {!loading && tab === 'citas' && (
          <>
            {appointments.length === 0 ? (
              <p className="panel-empty">Todavía no hay citas registradas.</p>
            ) : (
              <div className="panel-list">
                {appointments.map((a) => {
                  const alreadyPaid = a.payment_status === 'paid';
                  return (
                    <div className="panel-row" key={a.id}>
                      {rescheduling === a.id ? (
                        <RescheduleRow appt={a} onSave={saveReschedule} onCancel={() => setRescheduling(null)} />
                      ) : (
                        <>
                          <div>
                            <div className="panel-row-main">{a.client_name} — {a.service_name}</div>
                            <div className="panel-row-meta">
                              {a.appointment_date?.slice(0, 10)} · {a.start_time?.slice(0, 5)} · {a.duration_minutes || 20} min · {a.client_email} {a.client_phone ? `· ${a.client_phone}` : ''}
                              {a.amount_paid > 0 && ` · ${formatMoney(a.amount_paid, currency)} ${alreadyPaid ? '(pagado)' : '(pendiente)'}`}
                            </div>
                          </div>
                          <div className="panel-row-actions" style={{ alignItems: 'center' }}>
                            <span className={`panel-badge badge-${a.status}`}>{STATUS_LABEL[a.status] || a.status}</span>
                            <button className="panel-btn" onClick={() => setRescheduling(a.id)}>Reagendar</button>
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
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* PESTAÑA 2: NUEVA CITA MANUAL */}
        {!loading && tab === 'nueva_cita' && (
          <section className="panel-section">
            <h2 className="panel-section-title">Crear cita de seguimiento manual</h2>
            <p className="panel-section-hint">Para tratamientos continuados o cuando el paciente agenda directamente en consultorio o por teléfono.</p>
            <form onSubmit={createAppointment}>
              <div className="panel-form-grid">
                <input className="panel-input" placeholder="Cédula" value={newAppt.cedula} onChange={(e) => setNewAppt({ ...newAppt, cedula: e.target.value })} required />
                <input className="panel-input" placeholder="Nombre completo del paciente" value={newAppt.client_name} onChange={(e) => setNewAppt({ ...newAppt, client_name: e.target.value })} required />
                <input className="panel-input" type="email" placeholder="Correo electrónico" value={newAppt.client_email} onChange={(e) => setNewAppt({ ...newAppt, client_email: e.target.value })} required />
                <input className="panel-input" placeholder="Teléfono / WhatsApp" value={newAppt.client_phone} onChange={(e) => setNewAppt({ ...newAppt, client_phone: e.target.value })} />
                <select className="panel-select" value={newAppt.service_id} onChange={(e) => setNewAppt({ ...newAppt, service_id: e.target.value })} required>
                  <option value="">Selecciona el servicio…</option>
                  {services.map((s) => <option key={s.id} value={s.id}>{s.name_es}</option>)}
                </select>
                <input className="panel-input" type="date" value={newAppt.appointment_date} onChange={(e) => setNewAppt({ ...newAppt, appointment_date: e.target.value })} required />
                <input className="panel-input" type="time" value={newAppt.start_time} onChange={(e) => setNewAppt({ ...newAppt, start_time: e.target.value })} required />
              </div>
              <div style={{ marginTop: 16 }}>
                <button type="submit" className="panel-btn panel-btn-primary" disabled={busy}>
                  {busy ? 'Creando cita…' : 'Crear cita'}
                </button>
              </div>
            </form>
            {formMsg.text && (
              <p className={`panel-msg ${formMsg.type === 'error' ? 'error' : 'success'}`} style={{ marginTop: 16 }}>
                {formMsg.text}
              </p>
            )}
          </section>
        )}

        {/* PESTAÑA 3: BLOQUEO DE HORARIOS */}
        {!loading && tab === 'bloqueos' && (
          <section className="panel-section">
            <h2 className="panel-section-title">Bloquear franjas horarias o días</h2>
            <p className="panel-section-hint">Úsalo para vacaciones, recesos de almuerzo o días festivos. Todo horario bloqueado se ocultará en el sitio público.</p>
            <form onSubmit={addBlock}>
              <div className="panel-form-grid">
                <input className="panel-input" type="date" value={newBlock.block_date} onChange={(e) => setNewBlock({ ...newBlock, block_date: e.target.value })} required />
                <input className="panel-input" type="time" value={newBlock.start_time} onChange={(e) => setNewBlock({ ...newBlock, start_time: e.target.value })} required />
                <input className="panel-input" type="time" value={newBlock.end_time} onChange={(e) => setNewBlock({ ...newBlock, end_time: e.target.value })} required />
                <input className="panel-input" placeholder="Motivo del bloqueo (opcional)" value={newBlock.reason} onChange={(e) => setNewBlock({ ...newBlock, reason: e.target.value })} />
              </div>
              <div style={{ marginTop: 16 }}>
                <button type="submit" className="panel-btn panel-btn-primary" disabled={busy}>
                  {busy ? 'Guardando…' : 'Bloquear horario'}
                </button>
              </div>
            </form>

            <div style={{ marginTop: 24 }}>
              <h3 style={{ fontSize: '1rem', color: '#c9c8c3', marginBottom: 12 }}>Bloqueos activos ({blocks.length})</h3>
              {blocks.length === 0 ? (
                <p className="panel-empty">No hay horarios bloqueados.</p>
              ) : (
                <div className="panel-list">
                  {blocks.map((b) => (
                    <div className="panel-row" key={b.id}>
                      <div>
                        <div className="panel-row-main">{b.block_date?.slice(0, 10)} · {b.start_time?.slice(0, 5)} – {b.end_time?.slice(0, 5)}</div>
                        <div className="panel-row-meta">{b.reason || 'Sin motivo especificado'}</div>
                      </div>
                      <button className="panel-btn panel-btn-danger" onClick={() => removeBlock(b.id)}>Quitar bloqueo</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

      </div>
    </main>
  );
}

function RescheduleRow({ appt, onSave, onCancel }) {
  const [date, setDate] = useState(appt.appointment_date?.slice(0, 10) || '');
  const [time, setTime] = useState(appt.start_time?.slice(0, 5) || '');
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', width: '100%', padding: '8px 0' }}>
      <input className="panel-input" style={{ width: 160 }} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      <input className="panel-input" style={{ width: 120 }} type="time" value={time} onChange={(e) => setTime(e.target.value)} />
      <button className="panel-btn panel-btn-primary" onClick={() => onSave(appt.id, date, time)}>Guardar reagendamiento</button>
      <button className="panel-btn" onClick={onCancel}>Cancelar</button>
    </div>
  );
}
