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

export default function PatientDashboard() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currency, setCurrency] = useState('COP');
  const [payingId, setPayingId] = useState(null);
  const [paymentInfo, setPaymentInfo] = useState(null);

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

  async function payNow(id) {
    setPayingId(id);
    setPaymentInfo(null);
    try {
      const res = await fetch(`${BACKEND_URL}/api/patient/appointments/${id}/payment`, { headers: { Authorization: `Bearer ${getToken()}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo generar el pago');
      setPaymentInfo(data);
    } catch (err) {
      alert(err.message);
      setPayingId(null);
    }
  }

  function logout() {
    localStorage.removeItem('patient_token');
    localStorage.removeItem('patient_name');
    router.push('/paciente/login');
  }

  const totalPaid = appointments
    .filter((a) => a.payment_status === 'paid')
    .reduce((sum, a) => sum + Number(a.amount_paid || 0), 0);

  return (
    <main className="panel-body">
      <PanelNav role="patient" subtitle={name ? `Hola, ${name}` : 'Mi cuenta'} onLogout={logout} />

      <div className="panel-content" style={{ maxWidth: 760 }}>
        <div className="panel-eyebrow">Mi cuenta</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 className="panel-title">Mis citas</h1>
            <p className="panel-subtitle">Aquí ves el estado de tus citas, lo que debes pagar, y puedes cancelar las que aún no se hayan realizado.</p>
          </div>
          <a href="/paciente/agendar" className="panel-btn panel-btn-primary" style={{ marginBottom: 30, textDecoration: 'none' }}>+ Agendar nueva cita</a>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          <button type="button" className="panel-btn" style={currency === 'COP' ? { borderColor: '#4d7ea8', color: '#fff' } : {}} onClick={() => setCurrency('COP')}>COP</button>
          <button type="button" className="panel-btn" style={currency === 'USD' ? { borderColor: '#4d7ea8', color: '#fff' } : {}} onClick={() => setCurrency('USD')}>USD</button>
        </div>

        {loading && <p className="panel-empty">Cargando…</p>}
        {error && <p className="panel-msg error">{error}</p>}
        {!loading && !error && appointments.length === 0 && <p className="panel-empty">Todavía no tienes citas registradas.</p>}

        {!loading && appointments.length > 0 && (
          <>
            <div className="panel-list">
              {appointments.map((a) => {
                const isPaid = a.payment_status === 'paid';
                const hasCharge = a.amount_paid > 0;
                return (
                  <div key={a.id}>
                    <div className="panel-row">
                      <div>
                        <div className="panel-row-main">{a.service_name}</div>
                        <div className="panel-row-meta">{a.appointment_date?.slice(0, 10)} · {a.start_time?.slice(0, 5)}</div>
                        {hasCharge && (
                          <div className="panel-row-meta" style={{ color: isPaid ? '#7fb88f' : '#d9b56b' }}>
                            {isPaid ? 'Pagado: ' : 'Pendiente de pago: '}{formatMoney(a.amount_paid, currency)}
                          </div>
                        )}
                      </div>
                      <div className="panel-row-actions" style={{ alignItems: 'center' }}>
                        <span className={`panel-badge badge-${a.status}`}>{STATUS_LABEL[a.status] || a.status}</span>
                        {hasCharge && !isPaid && (
                          <button className="panel-btn panel-btn-primary" onClick={() => payNow(a.id)}>
                            {payingId === a.id ? 'Generando…' : 'Pagar con Wompi'}
                          </button>
                        )}
                        {(a.status === 'pending' || a.status === 'confirmed') && (
                          <button className="panel-btn panel-btn-danger" onClick={() => cancelAppointment(a.id)}>Cancelar</button>
                        )}
                      </div>
                    </div>

                    {payingId === a.id && paymentInfo && (
                      <div className="panel-charge-result" style={{ margin: '0 0 1px' }}>
                        {paymentInfo.simulated && (
                          <p className="panel-notice" style={{ textAlign: 'left', marginBottom: 16 }}>
                            Wompi todavía no está activo del lado del consultorio — este es un link de prueba.
                          </p>
                        )}
                        <img src={paymentInfo.qr_data_url} alt="QR de pago" className="panel-qr" />
                        <div><a href={paymentInfo.checkout_url} target="_blank" rel="noreferrer" style={{ color: '#4d7ea8', fontSize: 13 }}>Abrir link de pago</a></div>
                        <button className="panel-btn" style={{ marginTop: 14 }} onClick={() => { setPayingId(null); setPaymentInfo(null); loadAppointments(); }}>Cerrar</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="panel-row" style={{ background: 'transparent', border: 'none', marginTop: 20, padding: '18px 4px' }}>
              <span style={{ fontSize: 14, color: '#8a8a86' }}>Total pagado hasta hoy</span>
              <span style={{ fontSize: 20, color: '#7fb88f' }}>{formatMoney(totalPaid, currency)}</span>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
