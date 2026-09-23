import { useState } from 'react';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://dr-jimenez-platform.onrender.com';

export default function ForgotPassword() {
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/patient-auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo procesar la solicitud');
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="panel-login-wrap">
      <div className="panel-login-bg" />
      <div className="panel-login-box">
        <div className="panel-login-logo">
          <svg viewBox="0 0 60 90" width="34" fill="none">
            <path d="M38 6C24 12 20 28 30 40C40 52 38 66 20 78" stroke="#4d7ea8" strokeWidth="6" strokeLinecap="round" />
            <path d="M28 10C22 20 24 30 30 36" stroke="#7f9fa2" strokeWidth="5" strokeLinecap="round" />
          </svg>
        </div>
        <div className="panel-eyebrow" style={{ textAlign: 'center' }}>Mi cuenta</div>
        <h1 className="panel-login-title">Recuperar contraseña</h1>

        {!result && (
          <form onSubmit={handleSubmit}>
            <p className="panel-login-hint">Ingresa el correo o la cédula con la que te registraste.</p>
            <label className="panel-label">Email o cédula</label>
            <input type="text" className="panel-input" value={identifier} onChange={(e) => setIdentifier(e.target.value)} required />

            {error && <div className="panel-msg error">{error}</div>}

            <button type="submit" className="panel-btn panel-btn-primary panel-btn-block" style={{ marginTop: 26 }} disabled={loading}>
              {loading ? 'Enviando…' : 'Enviar enlace de recuperación'}
            </button>
          </form>
        )}

        {result && (
          <p className="panel-msg success" style={{ textAlign: 'center' }}>
            {result.email
              ? `Enviamos el enlace de restablecimiento a ${result.email}. Revisa tu bandeja de entrada (y spam).`
              : 'Si el usuario existe, enviamos el enlace de restablecimiento a su correo registrado.'}
          </p>
        )}

        <div style={{ textAlign: 'center', marginTop: 18 }}>
          <a href="/paciente/login" style={{ fontSize: 12, color: '#7f9fa2' }}>Volver a iniciar sesión</a>
        </div>
      </div>
    </main>
  );
}
