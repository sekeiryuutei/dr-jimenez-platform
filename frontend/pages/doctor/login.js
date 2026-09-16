import { useState } from 'react';
import { useRouter } from 'next/router';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://dr-jimenez-platform.onrender.com';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo iniciar sesión');

      localStorage.setItem('doctor_token', data.token);
      router.push('/doctor/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="panel-login-wrap">
      <div className="panel-login-bg" />
      <form onSubmit={handleSubmit} className="panel-login-box">
        <div className="panel-login-logo">
          <svg viewBox="0 0 60 90" width="34" fill="none">
            <path d="M38 6C24 12 20 28 30 40C40 52 38 66 20 78" stroke="#4d7ea8" strokeWidth="6" strokeLinecap="round" />
            <path d="M28 10C22 20 24 30 30 36" stroke="#7f9fa2" strokeWidth="5" strokeLinecap="round" />
          </svg>
        </div>
        <div className="panel-eyebrow" style={{ textAlign: 'center' }}>Panel del doctor</div>
        <h1 className="panel-login-title">Iniciar sesión</h1>
        <p className="panel-login-hint">Acceso exclusivo para el consultorio.</p>

        <label className="panel-label">Email</label>
        <input type="email" className="panel-input" value={email} onChange={(e) => setEmail(e.target.value)} required />

        <label className="panel-label">Contraseña</label>
        <input type="password" className="panel-input" value={password} onChange={(e) => setPassword(e.target.value)} required />

        {error && <div className="panel-msg error">{error}</div>}

        <button type="submit" className="panel-btn panel-btn-primary panel-btn-block" style={{ marginTop: 26 }} disabled={loading}>
          {loading ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </main>
  );
}
