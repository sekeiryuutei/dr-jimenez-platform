import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://dr-jimenez-platform.onrender.com';

const STATUS_LABEL = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  completed: 'Completada',
  cancelled: 'Cancelada',
};

export default function Dashboard() {
  const router = useRouter();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  function getToken() {
    return typeof window !== 'undefined' ? localStorage.getItem('doctor_token') : null;
  }

  async function loadAppointments() {
    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${BACKEND_URL}/api/appointments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        localStorage.removeItem('doctor_token');
        router.replace('/login');
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cargar las citas');
      setAppointments(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAppointments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function updateStatus(id, status) {
    const token = getToken();
    try {
      const res = await fetch(`${BACKEND_URL}/api/appointments/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('No se pudo actualizar');
      loadAppointments();
    } catch (err) {
      alert(err.message);
    }
  }

  function logout() {
    localStorage.removeItem('doctor_token');
    router.push('/login');
  }

  return (
    <main className="main">
      <nav className="nav">
        <div className="brand">Dr. Jorge Jiménez · Panel</div>
        <button className="logout" onClick={logout}>Cerrar sesión</button>
      </nav>

      <div className="content">
        <h1>Citas agendadas</h1>

        {loading && <p className="muted">Cargando citas…</p>}
        {error && <p className="error">{error}</p>}

        {!loading && !error && appointments.length === 0 && (
          <p className="muted">Todavía no hay citas agendadas.</p>
        )}

        {!loading && appointments.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Hora</th>
                  <th>Paciente</th>
                  <th>Servicio</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((a) => (
                  <tr key={a.id}>
                    <td>{a.appointment_date?.slice(0, 10)}</td>
                    <td>{a.start_time?.slice(0, 5)}</td>
                    <td>
                      <div>{a.client_name}</div>
                      <div className="muted small">{a.client_email}</div>
                    </td>
                    <td>{a.service_name}</td>
                    <td>
                      <span className={`badge badge-${a.status}`}>{STATUS_LABEL[a.status] || a.status}</span>
                    </td>
                    <td className="actions">
                      {a.status !== 'confirmed' && a.status !== 'cancelled' && (
                        <button onClick={() => updateStatus(a.id, 'confirmed')}>Confirmar</button>
                      )}
                      {a.status !== 'completed' && (
                        <button onClick={() => updateStatus(a.id, 'completed')}>Completar</button>
                      )}
                      {a.status !== 'cancelled' && (
                        <button className="danger" onClick={() => updateStatus(a.id, 'cancelled')}>Cancelar</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style jsx>{`
        .main {
          min-height: 100vh;
          background: #0a0a0a;
          color: #f6f5f2;
          font-family: 'Jost', -apple-system, sans-serif;
          font-weight: 300;
        }
        .nav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 22px 6vw;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }
        .brand {
          font-family: 'Cormorant Garamond', serif;
          font-size: 18px;
        }
        .logout {
          background: transparent;
          border: 1px solid #3f3f3d;
          color: #c9c8c3;
          padding: 8px 16px;
          font-size: 11px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          cursor: pointer;
        }
        .content {
          padding: 60px 6vw;
        }
        h1 {
          font-family: 'Cormorant Garamond', serif;
          font-weight: 400;
          font-size: clamp(28px, 3vw, 40px);
          margin-bottom: 34px;
        }
        .muted { color: #8a8a86; font-size: 13px; }
        .small { font-size: 11px; }
        .error { color: #c97f7f; font-size: 13px; }
        .table-wrap { overflow-x: auto; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th {
          text-align: left;
          font-size: 10px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #7f9fa2;
          padding: 10px 14px;
          border-bottom: 1px solid #2b2b29;
        }
        td {
          padding: 14px;
          border-bottom: 1px solid #1c1c1a;
          vertical-align: top;
        }
        .badge {
          font-size: 10px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          padding: 4px 10px;
          border-radius: 20px;
          border: 1px solid #3f3f3d;
        }
        .badge-pending { color: #d9b56b; border-color: #5a4a2c; }
        .badge-confirmed { color: #7fb88f; border-color: #2c4a35; }
        .badge-completed { color: #7f9fa2; border-color: #2c3a3c; }
        .badge-cancelled { color: #c97f7f; border-color: #4a2c2c; }
        .actions { display: flex; gap: 6px; flex-wrap: wrap; }
        .actions button {
          background: transparent;
          border: 1px solid #3f3f3d;
          color: #c9c8c3;
          padding: 6px 10px;
          font-size: 10px;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          cursor: pointer;
        }
        .actions button.danger { border-color: #4a2c2c; color: #c97f7f; }
      `}</style>
    </main>
  );
}
