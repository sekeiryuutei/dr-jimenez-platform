import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import PanelNav from '../../components/PanelNav';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://dr-jimenez-platform.onrender.com';
const USD_RATE = 4000; // Tasa aproximada y fija solo para mostrar el valor en dólares -- no es una tasa en vivo.

function formatMoney(value, currency) {
  const amount = currency === 'USD' ? Number(value) / USD_RATE : Number(value);
  return new Intl.NumberFormat(currency === 'USD' ? 'en-US' : 'es-CO', {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'USD' ? 2 : 0,
  }).format(amount);
}

export default function Charge() {
  const router = useRouter();
  const [appointments, setAppointments] = useState([]);
  const [appointmentId, setAppointmentId] = useState('');
  const [currency, setCurrency] = useState('COP');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [charge, setCharge] = useState(null);

  function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('doctor_token') : null; }
  function authHeaders() { return { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` }; }

  async function loadAppointments() {
    if (!getToken()) { router.replace('/doctor/login'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/appointments`, { headers: { Authorization: `Bearer ${getToken()}` } });
      if (res.status === 401) { router.replace('/doctor/login'); return; }
      const data = await res.json();
      const uncharged = data
        .filter((a) => a.status === 'completed' && a.payment_status !== 'paid')
        .sort((a, b) => (b.appointment_date + b.start_time).localeCompare(a.appointment_date + a.start_time));
      setAppointments(uncharged);
    } catch (err) {
      setError('No se pudo conectar con el servidor');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAppointments(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const selected = appointments.find((a) => String(a.id) === String(appointmentId));

  async function generateCharge() {
    if (!appointmentId) return;
    setBusy(true);
    setCharge(null);
    try {
      // Ya no se manda "amount": el backend usa el valor que el doctor asignó al completar la cita.
      const res = await fetch(`${BACKEND_URL}/api/admin/payments/charge`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ appointment_id: Number(appointmentId) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al generar el cobro');
      setCharge({ ...data, amount: selected.amount_paid });
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function markPaidCash() {
    if (!appointmentId) return;
    if (!confirm('¿Confirmas que este paciente ya pagó en efectivo / presencial?')) return;
    setBusy(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/appointments/${appointmentId}/mark-paid`, { method: 'PATCH', headers: authHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo registrar el pago');
      setAppointmentId('');
      setCharge(null);
      loadAppointments();
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  }

  function logout() {
    localStorage.removeItem('doctor_token');
    router.push('/doctor/login');
  }

  return (
    <main className="panel-body">
      <PanelNav role="doctor" active="/doctor/charge" onLogout={logout} />

      <div className="panel-content" style={{ maxWidth: 520 }}>
        <div className="panel-eyebrow">Panel del doctor</div>
        <h1 className="panel-title">Cobrar a un paciente</h1>
        <p className="panel-subtitle">
          Elige la cita — el valor ya es el que asignaste al completarla, no hace falta escribirlo de nuevo.
          Aquí aparecen todas las citas completadas que todavía no tienen un pago registrado.
        </p>

        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          <button type="button" className="panel-btn" style={currency === 'COP' ? { borderColor: '#4d7ea8', color: '#fff' } : {}} onClick={() => setCurrency('COP')}>COP</button>
          <button type="button" className="panel-btn" style={currency === 'USD' ? { borderColor: '#4d7ea8', color: '#fff' } : {}} onClick={() => setCurrency('USD')}>USD</button>
        </div>

        {loading && <p className="panel-empty">Cargando…</p>}
        {error && <p className="panel-msg error">{error}</p>}

        {!loading && appointments.length === 0 && (
          <p className="panel-empty">No hay citas completadas pendientes de cobro por ahora.</p>
        )}

        {!loading && appointments.length > 0 && (
          <>
            <label className="panel-label" style={{ marginTop: 0 }}>Cita</label>
            <select
              className="panel-select"
              value={appointmentId}
              onChange={(e) => { setAppointmentId(e.target.value); setCharge(null); }}
            >
              <option value="">Selecciona una cita…</option>
              {appointments.map((a) => (
                <option key={a.id} value={a.id}>{a.client_name} — {a.service_name} — {a.appointment_date?.slice(0, 10)}</option>
              ))}
            </select>

            {selected && (
              <div className="panel-row-meta" style={{ marginTop: 10, fontSize: 15, color: '#f6f5f2' }}>
                Valor a cobrar: {formatMoney(selected.amount_paid, currency)}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
              <button type="button" className="panel-btn panel-btn-primary" style={{ flex: 1 }} disabled={!appointmentId || busy} onClick={generateCharge}>
                {busy ? 'Generando…' : 'Generar QR de cobro'}
              </button>
              <button type="button" className="panel-btn" style={{ flex: 1 }} disabled={!appointmentId || busy} onClick={markPaidCash}>
                Marcar pagado (efectivo)
              </button>
            </div>
          </>
        )}

        {charge && (
          <div className="panel-charge-result">
            {charge.simulated && (
              <p className="panel-notice" style={{ textAlign: 'left', marginBottom: 20 }}>
                Modo simulado: no tienes Wompi conectado todavía, así que este QR lleva a una pantalla de prueba
                donde puedes simular la aprobación del pago. Cuando actives Wompi, este mismo flujo cobra de verdad.
              </p>
            )}
            <div style={{ fontSize: 20, color: '#f6f5f2', marginBottom: 14 }}>{formatMoney(charge.amount, currency)}</div>
            <img src={charge.qr_data_url} alt="QR de cobro" className="panel-qr" />
            <div><a href={charge.checkout_url} target="_blank" rel="noreferrer" style={{ color: '#4d7ea8', fontSize: 13 }}>Abrir link de pago</a></div>
            <div className="panel-row-meta" style={{ marginTop: 10 }}>Referencia: {charge.reference}</div>
          </div>
        )}
      </div>
    </main>
  );
}
