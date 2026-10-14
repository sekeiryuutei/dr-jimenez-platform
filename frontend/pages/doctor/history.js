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

export default function DoctorHistory() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currency, setCurrency] = useState('COP');

  // Filtros
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('doctor_token') : null; }
  function authHeaders() { return { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' }; }

  async function loadHistory(pageNumber = 1) {
    const token = getToken();
    if (!token) { router.replace('/doctor/login'); return; }
    setLoading(true);
    setError('');

    try {
      const q = new URLSearchParams({
        page: String(pageNumber),
        limit: '15',
        status,
        search,
        start_date: startDate,
        end_date: endDate,
      });

      const res = await fetch(`${BACKEND_URL}/api/appointments/admin/history?${q.toString()}`, {
        headers: authHeaders(),
      });
      if (res.status === 401) { router.replace('/doctor/login'); return; }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cargar el historial');
      setItems(data.items);
      setTotal(data.total);
      setPage(data.page);
      setPages(data.pages);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadHistory(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, startDate, endDate]);

  function handleSearchSubmit(e) {
    e.preventDefault();
    loadHistory(1);
  }

  function logout() {
    localStorage.removeItem('doctor_token');
    router.push('/doctor/login');
  }

  return (
    <main className="panel-body">
      <PanelNav role="doctor" active="/doctor/history" onLogout={logout} />

      <div className="panel-content">
        <div className="panel-eyebrow">Panel del doctor</div>
        <h1 className="panel-title">Historial de citas y pacientes</h1>
        <p className="panel-subtitle">Consulta todo el registro de citas pasadas y activas con filtros por fecha, estado y buscador general.</p>

        {/* Barra de Filtros y Búsqueda */}
        <section className="panel-section" style={{ marginBottom: 24 }}>
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              className="panel-input"
              style={{ flex: 1, minWidth: 200 }}
              placeholder="Buscar por cédula, nombre, email o servicio…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="panel-select"
              style={{ width: 160 }}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="all">Todos los estados</option>
              <option value="pending">Pendiente</option>
              <option value="confirmed">Confirmada</option>
              <option value="completed">Completada</option>
              <option value="cancelled">Cancelada</option>
            </select>
            <input
              className="panel-input"
              style={{ width: 150 }}
              type="date"
              title="Fecha inicial"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <input
              className="panel-input"
              style={{ width: 150 }}
              type="date"
              title="Fecha final"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
            <button type="submit" className="panel-btn panel-btn-primary">Filtrar</button>
            {(search || status !== 'all' || startDate || endDate) && (
              <button
                type="button"
                className="panel-btn"
                onClick={() => { setSearch(''); setStatus('all'); setStartDate(''); setEndDate(''); }}
              >
                Limpiar
              </button>
            )}
          </form>
        </section>

        {/* Resumen de resultados y Moneda */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ color: '#8a8a86', fontSize: '0.9rem' }}>
            Total registros encontrados: <strong>{total}</strong> (Página {page} de {pages})
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="panel-btn" style={currency === 'COP' ? { borderColor: '#4d7ea8', color: '#fff' } : {}} onClick={() => setCurrency('COP')}>COP</button>
            <button type="button" className="panel-btn" style={currency === 'USD' ? { borderColor: '#4d7ea8', color: '#fff' } : {}} onClick={() => setCurrency('USD')}>USD</button>
          </div>
        </div>

        {loading && <p className="panel-empty">Cargando historial…</p>}
        {error && <p className="panel-msg error">{error}</p>}
        {!loading && items.length === 0 && <p className="panel-empty">No se encontraron citas con los filtros especificados.</p>}

        {!loading && items.length > 0 && (
          <>
            <div className="panel-list">
              {items.map((a) => {
                const paid = a.payment_status === 'paid';
                return (
                  <div className="panel-row" key={a.id}>
                    <div>
                      <div className="panel-row-main">{a.client_name} — {a.service_name}</div>
                      <div className="panel-row-meta">
                        <strong>Fecha:</strong> {a.appointment_date?.slice(0, 10)} · <strong>Hora:</strong> {a.start_time?.slice(0, 5)} · <strong>Duración:</strong> {a.duration_minutes || 20} min
                        <br />
                        <strong>Cédula:</strong> {a.cedula} · <strong>Email:</strong> {a.client_email} {a.client_phone ? `· Tel: ${a.client_phone}` : ''}
                        {a.amount_paid > 0 && (
                          <span> · <strong>Cobro:</strong> {formatMoney(a.amount_paid, currency)} {paid ? '(Pagado)' : '(Pendiente)'}</span>
                        )}
                      </div>
                    </div>
                    <div className="panel-row-actions" style={{ alignItems: 'center' }}>
                      <span className={`panel-badge badge-${a.status}`}>{STATUS_LABEL[a.status] || a.status}</span>
                      {paid ? (
                        <span className="panel-badge" style={{ background: '#1c3a27', color: '#7fb88f' }}>Pago recibido</span>
                      ) : (
                        <span className="panel-badge" style={{ background: '#3a2d1a', color: '#d9b56b' }}>No pagado</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Paginación */}
            {pages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 24 }}>
                <button
                  className="panel-btn"
                  disabled={page <= 1}
                  onClick={() => loadHistory(page - 1)}
                >
                  Anterior
                </button>
                <span style={{ alignSelf: 'center', color: '#c9c8c3' }}>{page} / {pages}</span>
                <button
                  className="panel-btn"
                  disabled={page >= pages}
                  onClick={() => loadHistory(page + 1)}
                >
                  Siguiente
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}

