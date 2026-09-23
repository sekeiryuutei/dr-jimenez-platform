import { useState } from 'react';
import { useRouter } from 'next/router';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://dr-jimenez-platform.onrender.com';

export default function ResetPassword() {
  const router = useRouter();
  const { token } = router.query;
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return; }
    if (password !== confirmPassword) { setError('Las contraseñas no coinciden.'); return; }

    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/patient-auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo restablecer la contraseña');
      setDone(true);
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
        <h1 className="panel-login-title">Nueva contraseña</h1>

        {!done && (
          <form onSubmit={handleSubmit}>
            <label className="panel-label">Nueva contraseña</label>
            <input type="password" className="panel-input" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <label className="panel-label">Confirmar contraseña</label>
            <input type="password" className="panel-input" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />

            {error && <div className="panel-msg error">{error}</div>}

            <button type="submit" className="panel-btn panel-btn-primary panel-btn-block" style={{ marginTop: 26 }} disabled={loading || !token}>
              {loading ? 'Guardando…' : 'Guardar nueva contraseña'}
            </button>
          </form>
        )}

        {done && (
          <>
            <p className="panel-msg success" style={{ textAlign: 'center' }}>Tu contraseña se actualizó correctamente.</p>
            <a href="/paciente/login" className="panel-btn panel-btn-primary panel-btn-block" style={{ marginTop: 20, textAlign: 'center', textDecoration: 'none' }}>Iniciar sesión</a>
          </>
        )}
      </div>
    </main>
  );
}
