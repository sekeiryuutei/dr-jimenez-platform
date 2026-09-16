import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import PanelNav from '../../components/PanelNav';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://dr-jimenez-platform.onrender.com';

export default function Charge() {
  const router = useRouter();
  const [appointments, setAppointments] = useState([]);
  const [appointmentId, setAppointmentId] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [charge, setCharge] = useState(null);

  function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('doctor_token') : null; }

  async function loadAppointments() {
    if (!getToken()) { router.replace('/doctor/login'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/appointments`, { headers: { Authorization: `Bearer ${getToken()}` } });
      if (res.status === 401) { router.replace('/doctor/login'); return; }
      const data = await res.json();
      setAppointments(data.filter((a) => a.payment_status !== 'paid' && a.status !== 'cancelled'));
    } catch (err) {
      setError('No se pudo conectar con el servidor');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAppointments(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function generateCharge(e) {
    e.preventDefault();
    if (!appointmentId || !amount) return;
    setBusy(true);
    setCharge(null);
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/payments/charge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ appointment_id: Number(appointmentId), amount: Number(amount) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al generar el cobro');
      setCharge(data);
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
        <p className="panel-subtitle">Elige la cita, ingresa el valor, y muéstrale el QR al paciente para que pague desde su celular.</p>

        {loading && <p className="panel-empty">Cargando…</p>}
        {error && <p className="panel-msg error">{error}</p>}

        {!loading && (
          <form onSubmit={generateCharge}>
            <label className="panel-label">Cita</label>
            <select className="panel-select" value={appointmentId} onChange={(e) => setAppointmentId(e.target.value)} required>
              <option value="">Selecciona una cita…</option>
              {appointments.map((a) => (
                <option key={a.id} value={a.id}>{a.client_name} — {a.service_name} — {a.appointment_date?.slice(0, 10)}</option>
              ))}
            </select>

            <label className="panel-label">Valor a cobrar (COP)</label>
            <input className="panel-input" type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Ej: 350000" required />

            <button type="submit" className="panel-btn panel-btn-primary panel-btn-block" style={{ marginTop: 26 }} disabled={busy}>
              {busy ? 'Generando…' : 'Generar QR de cobro'}
            </button>
          </form>
        )}

        {charge && (
          <div className="panel-charge-result">
            {charge.simulated && (
              <p className="panel-notice" style={{ textAlign: 'left', marginBottom: 20 }}>
                Modo simulado: no tienes Wompi conectado todavía, así que este QR lleva a una pantalla de prueba
                donde puedes simular la aprobación del pago. Cuando actives Wompi, este mismo flujo cobra de verdad.
              </p>
            )}
            <img src={charge.qr_data_url} alt="QR de cobro" className="panel-qr" />
            <div><a href={charge.checkout_url} target="_blank" rel="noreferrer" style={{ color: '#4d7ea8', fontSize: 13 }}>Abrir link de pago</a></div>
            <div className="panel-row-meta" style={{ marginTop: 10 }}>Referencia: {charge.reference}</div>
          </div>
        )}
      </div>
    </main>
  );
}
