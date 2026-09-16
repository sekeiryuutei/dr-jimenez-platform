import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://dr-jimenez-platform.onrender.com';

export default function MockPayment() {
  const router = useRouter();
  const { ref } = router.query;
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [approved, setApproved] = useState(false);

  useEffect(() => {
    if (!ref) return;
    fetch(`${BACKEND_URL}/api/mock-payment/${ref}`)
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || 'No se encontró este cobro');
        setData(body);
      })
      .catch((err) => setError(err.message));
  }, [ref]);

  async function approve() {
    setBusy(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/mock-payment/${ref}/approve`, { method: 'POST' });
      if (!res.ok) throw new Error((await res.json()).error || 'No se pudo aprobar');
      setApproved(true);
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="panel-login-wrap">
      <div className="panel-login-bg" />
      <div className="panel-login-box" style={{ textAlign: 'center' }}>
        <div className="panel-login-logo">
          <svg viewBox="0 0 60 90" width="30" fill="none">
            <path d="M38 6C24 12 20 28 30 40C40 52 38 66 20 78" stroke="#4d7ea8" strokeWidth="6" strokeLinecap="round" />
            <path d="M28 10C22 20 24 30 30 36" stroke="#7f9fa2" strokeWidth="5" strokeLinecap="round" />
          </svg>
        </div>
        <div className="panel-eyebrow" style={{ color: '#d9b56b' }}>Pago simulado — modo local</div>
        <h1 className="panel-login-title">Dr. Jorge Jiménez</h1>

        {error && <p className="panel-msg error">{error}</p>}
        {!error && !data && <p className="panel-empty">Cargando…</p>}

        {data && !approved && (
          <>
            <div style={{ textAlign: 'left', marginTop: 20 }}>
              <div className="panel-row" style={{ background: 'transparent', padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
                <span className="panel-row-meta">Paciente</span><span>{data.patient_name}</span>
              </div>
              <div className="panel-row" style={{ background: 'transparent', padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
                <span className="panel-row-meta">Servicio</span><span>{data.service_name}</span>
              </div>
              <div className="panel-row" style={{ background: 'transparent', padding: '10px 0' }}>
                <span style={{ color: '#7f9fa2', fontSize: 16 }}>Total</span>
                <span style={{ color: '#7f9fa2', fontSize: 16 }}>${Number(data.amount).toLocaleString('es-CO')} COP</span>
              </div>
            </div>
            <p className="panel-notice" style={{ textAlign: 'left', margin: '22px 0' }}>
              Esta es una pantalla de prueba porque todavía no hay una cuenta real de Wompi conectada.
              En producción, aquí el paciente pagaría de verdad con tarjeta o PSE.
            </p>
            <button className="panel-btn panel-btn-primary panel-btn-block" onClick={approve} disabled={busy}>
              {busy ? 'Procesando…' : 'Simular pago aprobado'}
            </button>
          </>
        )}

        {approved && (
          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 40, color: '#7fb88f', marginBottom: 16 }}>✓</div>
            <p style={{ fontSize: 14, color: '#c9c8c3', lineHeight: 1.6 }}>Pago simulado aprobado. La cita ya quedó marcada como pagada.</p>
          </div>
        )}
      </div>
    </main>
  );
}
