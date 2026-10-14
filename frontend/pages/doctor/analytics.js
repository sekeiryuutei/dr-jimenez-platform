import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import PanelNav from '../../components/PanelNav';

// Carga dinamica de Recharts para evitar problemas de SSR en Next.js
const ResponsiveContainer = dynamic(() => import('recharts').then(mod => mod.ResponsiveContainer), { ssr: false });
const BarChart = dynamic(() => import('recharts').then(mod => mod.BarChart), { ssr: false });
const Bar = dynamic(() => import('recharts').then(mod => mod.Bar), { ssr: false });
const PieChart = dynamic(() => import('recharts').then(mod => mod.PieChart), { ssr: false });
const Pie = dynamic(() => import('recharts').then(mod => mod.Pie), { ssr: false });
const Cell = dynamic(() => import('recharts').then(mod => mod.Cell), { ssr: false });
const LineChart = dynamic(() => import('recharts').then(mod => mod.LineChart), { ssr: false });
const Line = dynamic(() => import('recharts').then(mod => mod.Line), { ssr: false });
const XAxis = dynamic(() => import('recharts').then(mod => mod.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then(mod => mod.YAxis), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(mod => mod.Tooltip), { ssr: false });
const Legend = dynamic(() => import('recharts').then(mod => mod.Legend), { ssr: false });

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://dr-jimenez-platform.onrender.com';
const USD_RATE = 4000;

const COLORS = ['#4d7ea8', '#7f9fa2', '#d9b56b', '#7fb88f', '#c97f7f', '#a389d4'];

function formatMoney(value, currency) {
  const amount = currency === 'USD' ? Number(value) / USD_RATE : Number(value);
  return new Intl.NumberFormat(currency === 'USD' ? 'en-US' : 'es-CO', {
    style: 'currency', currency, maximumFractionDigits: currency === 'USD' ? 2 : 0,
  }).format(amount);
}

export default function DoctorAnalytics() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currency, setCurrency] = useState('COP');

  function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('doctor_token') : null; }
  function authHeaders() { return { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' }; }

  async function loadAnalytics() {
    const token = getToken();
    if (!token) { router.replace('/doctor/login'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${BACKEND_URL}/api/appointments/admin/analytics`, { headers: authHeaders() });
      if (res.status === 401) { router.replace('/doctor/login'); return; }
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error al cargar métricas');
      setData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAnalytics(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  function logout() {
    localStorage.removeItem('doctor_token');
    router.push('/doctor/login');
  }

  // Preparar datos para las 4 graficas
  const revenueData = data ? [
    { name: 'Online (Wompi)', value: Number(data.revenue?.online || 0) },
    { name: 'Efectivo / Presencial', value: Number(data.revenue?.cash || 0) },
  ] : [];

  const attendanceData = data ? [
    { name: 'Completadas', value: Number(data.attendance?.completed || 0), color: '#7fb88f' },
    { name: 'Confirmadas', value: Number(data.attendance?.confirmed || 0), color: '#4d7ea8' },
    { name: 'Pendientes', value: Number(data.attendance?.pending || 0), color: '#d9b56b' },
    { name: 'Canceladas', value: Number(data.attendance?.cancelled || 0), color: '#c97f7f' },
  ].filter(d => d.value > 0) : [];

  const totalRevenue = data ? Number(data.revenue?.online || 0) + Number(data.revenue?.cash || 0) : 0;

  return (
    <main className="panel-body">
      <PanelNav role="doctor" active="/doctor/analytics" onLogout={logout} />

      <div className="panel-content">
        <div className="panel-eyebrow">Panel del doctor</div>
        <h1 className="panel-title">Métricas y Rendimiento</h1>
        <p className="panel-subtitle">Análisis visual de citas, distribución de ingresos, servicios más demandados y asistencia clínica.</p>

        {/* Selector de moneda */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="panel-btn" style={currency === 'COP' ? { borderColor: '#4d7ea8', color: '#fff' } : {}} onClick={() => setCurrency('COP')}>COP</button>
            <button type="button" className="panel-btn" style={currency === 'USD' ? { borderColor: '#4d7ea8', color: '#fff' } : {}} onClick={() => setCurrency('USD')}>USD</button>
          </div>
        </div>

        {loading && <p className="panel-empty">Cargando métricas…</p>}
        {error && <p className="panel-msg error">{error}</p>}

        {!loading && data && (
          <>
            {/* Tarjetas de Resumen KPI */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 32 }}>
              <div className="panel-section" style={{ margin: 0, padding: 20, textAlign: 'center' }}>
                <div style={{ color: '#8a8a86', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: 1 }}>Ingresos Totales</div>
                <div style={{ fontSize: '1.6rem', color: '#7fb88f', fontWeight: 600, marginTop: 8 }}>
                  {formatMoney(totalRevenue, currency)}
                </div>
              </div>

              <div className="panel-section" style={{ margin: 0, padding: 20, textAlign: 'center' }}>
                <div style={{ color: '#8a8a86', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: 1 }}>Citas Completadas</div>
                <div style={{ fontSize: '1.6rem', color: '#4d7ea8', fontWeight: 600, marginTop: 8 }}>
                  {data.attendance?.completed || 0}
                </div>
              </div>

              <div className="panel-section" style={{ margin: 0, padding: 20, textAlign: 'center' }}>
                <div style={{ color: '#8a8a86', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: 1 }}>Citas Activas (Conf / Pend)</div>
                <div style={{ fontSize: '1.6rem', color: '#d9b56b', fontWeight: 600, marginTop: 8 }}>
                  {(Number(data.attendance?.confirmed || 0) + Number(data.attendance?.pending || 0))}
                </div>
              </div>

              <div className="panel-section" style={{ margin: 0, padding: 20, textAlign: 'center' }}>
                <div style={{ color: '#8a8a86', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: 1 }}>Franjas / Días Bloqueados</div>
                <div style={{ fontSize: '1.6rem', color: '#c9c8c3', fontWeight: 600, marginTop: 8 }}>
                  {data.totalBlockedSlots || 0}
                </div>
              </div>
            </div>

            {/* Cuadrícula de 4 Gráficas */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 24 }}>
              
              {/* Gráfica 1: Servicios más demandados */}
              <div className="panel-section" style={{ margin: 0, padding: 20 }}>
                <h3 className="panel-section-title" style={{ fontSize: '1.1rem' }}>Top Servicios Agendados</h3>
                <div style={{ width: '100%', height: 260, marginTop: 16 }}>
                  {data.byService?.length === 0 ? (
                    <p className="panel-empty">Sin datos de servicios.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.byService} layout="vertical" margin={{ left: 40, right: 20 }}>
                        <XAxis type="number" stroke="#8a8a86" />
                        <YAxis dataKey="name" type="category" stroke="#8a8a86" width={120} tick={{ fontSize: 11 }} />
                        <Tooltip contentStyle={{ background: '#1c1c1a', border: '1px solid #3f3f3d', color: '#fff' }} />
                        <Bar dataKey="count" fill="#4d7ea8" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Gráfica 2: Ingresos Online vs Efectivo */}
              <div className="panel-section" style={{ margin: 0, padding: 20 }}>
                <h3 className="panel-section-title" style={{ fontSize: '1.1rem' }}>Ingresos: Online (Wompi) vs Efectivo</h3>
                <div style={{ width: '100%', height: 260, marginTop: 16 }}>
                  {totalRevenue === 0 ? (
                    <p className="panel-empty">No hay pagos registrados aún.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={revenueData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                          <Cell fill="#4d7ea8" />
                          <Cell fill="#7fb88f" />
                        </Pie>
                        <Tooltip formatter={(val) => formatMoney(val, currency)} contentStyle={{ background: '#1c1c1a', border: '1px solid #3f3f3d', color: '#fff' }} />
                        <Legend wrapperStyle={{ color: '#c9c8c3' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Gráfica 3: Asistencia vs Cancelación */}
              <div className="panel-section" style={{ margin: 0, padding: 20 }}>
                <h3 className="panel-section-title" style={{ fontSize: '1.1rem' }}>Asistencia y Estado de Citas</h3>
                <div style={{ width: '100%', height: 260, marginTop: 16 }}>
                  {attendanceData.length === 0 ? (
                    <p className="panel-empty">Sin citas registradas.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={attendanceData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                          {attendanceData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ background: '#1c1c1a', border: '1px solid #3f3f3d', color: '#fff' }} />
                        <Legend wrapperStyle={{ color: '#c9c8c3' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Gráfica 4: Citas por Día (Últimos 30 días) */}
              <div className="panel-section" style={{ margin: 0, padding: 20 }}>
                <h3 className="panel-section-title" style={{ fontSize: '1.1rem' }}>Citas por Día (Últimos 30 días)</h3>
                <div style={{ width: '100%', height: 260, marginTop: 16 }}>
                  {data.byDay?.length === 0 ? (
                    <p className="panel-empty">No hay citas en los últimos 30 días.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data.byDay} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                        <XAxis dataKey="date" stroke="#8a8a86" tick={{ fontSize: 10 }} />
                        <YAxis stroke="#8a8a86" allowDecimals={false} />
                        <Tooltip contentStyle={{ background: '#1c1c1a', border: '1px solid #3f3f3d', color: '#fff' }} />
                        <Line type="monotone" dataKey="count" stroke="#d9b56b" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

            </div>
          </>
        )}
      </div>
    </main>
  );
}

