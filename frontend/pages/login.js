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
      router.push('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="main">
      <form onSubmit={handleSubmit} className="box">
        <div className="eyebrow">Panel del doctor</div>
        <h1>Iniciar sesión</h1>

        <label className="label">Email</label>
        <input
          type="email"
          className="input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <label className="label">Contraseña</label>
        <input
          type="password"
          className="input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error && <div className="error">{error}</div>}

        <button type="submit" className="submit" disabled={loading}>
          {loading ? 'Entrando…' : 'Entrar'}
        </button>
      </form>

      <style jsx>{`
        .main {
          min-height: 100vh;
          background: #0a0a0a;
          color: #f6f5f2;
          font-family: 'Jost', -apple-system, sans-serif;
          font-weight: 300;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }
        .box {
          width: 100%;
          max-width: 360px;
          background: #121212;
          border: 1px solid #2b2b29;
          padding: 40px 34px;
        }
        .eyebrow {
          font-size: 11px;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          color: #7f9fa2;
          margin-bottom: 14px;
        }
        h1 {
          font-family: 'Cormorant Garamond', serif;
          font-weight: 400;
          font-size: 30px;
          margin-bottom: 30px;
        }
        .label {
          display: block;
          font-size: 10px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #7f9fa2;
          margin-bottom: 8px;
        }
        .input {
          width: 100%;
          background: #151515;
          border: 1px solid #2b2b29;
          color: #f6f5f2;
          padding: 11px 12px;
          font-family: 'Jost', sans-serif;
          font-size: 14px;
          font-weight: 300;
          margin-bottom: 20px;
        }
        .input:focus {
          outline: none;
          border-color: #4d7ea8;
        }
        .error {
          font-size: 12px;
          color: #c97f7f;
          margin-bottom: 16px;
        }
        .submit {
          width: 100%;
          background: #4d7ea8;
          border: none;
          color: #fff;
          padding: 13px 0;
          font-size: 12px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          cursor: pointer;
        }
        .submit:disabled {
          opacity: 0.6;
          cursor: default;
        }
      `}</style>
    </main>
  );
}
