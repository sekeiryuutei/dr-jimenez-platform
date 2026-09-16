import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import PanelNav from '../../components/PanelNav';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://dr-jimenez-platform.onrender.com';

function resolveUrl(url) {
  if (!url) return '';
  return url.startsWith('/uploads') ? `${BACKEND_URL}${url}` : url;
}

export default function Media() {
  const router = useRouter();
  const [services, setServices] = useState([]);
  const [gallery, setGallery] = useState([]);
  const [transformations, setTransformations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  const [beforeFile, setBeforeFile] = useState(null);
  const [afterFile, setAfterFile] = useState(null);
  const [transformTitle, setTransformTitle] = useState('');

  function getToken() {
    return typeof window !== 'undefined' ? localStorage.getItem('doctor_token') : null;
  }

  async function loadAll() {
    if (!getToken()) { router.replace('/doctor/login'); return; }
    setLoading(true);
    setError('');
    try {
      const [svcRes, galRes, transRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/services`),
        fetch(`${BACKEND_URL}/api/gallery`),
        fetch(`${BACKEND_URL}/api/transformations`),
      ]);
      setServices(await svcRes.json());
      setGallery(await galRes.json());
      setTransformations(await transRes.json());
    } catch (err) {
      setError('No se pudo conectar con el servidor');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function uploadServiceImage(serviceId, file) {
    if (!file) return;
    setBusyId('service-' + serviceId);
    const form = new FormData();
    form.append('image', file);
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/services/${serviceId}/image`, {
        method: 'POST', headers: { Authorization: `Bearer ${getToken()}` }, body: form,
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Error al subir');
      await loadAll();
    } catch (err) {
      alert(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function uploadGalleryImage(file) {
    if (!file) return;
    setBusyId('gallery-new');
    const form = new FormData();
    form.append('image', file);
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/gallery`, {
        method: 'POST', headers: { Authorization: `Bearer ${getToken()}` }, body: form,
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Error al subir');
      await loadAll();
    } catch (err) {
      alert(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function deleteGalleryImage(id) {
    if (!confirm('¿Quitar esta foto de la galería?')) return;
    setBusyId('gallery-' + id);
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/gallery/${id}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error('No se pudo eliminar');
      await loadAll();
    } catch (err) {
      alert(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function uploadTransformation(e) {
    e.preventDefault();
    if (!beforeFile || !afterFile) return;
    setBusyId('transform-new');
    const form = new FormData();
    form.append('before', beforeFile);
    form.append('after', afterFile);
    form.append('title_es', transformTitle);
    form.append('title_en', transformTitle);
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/transformations`, {
        method: 'POST', headers: { Authorization: `Bearer ${getToken()}` }, body: form,
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Error al subir');
      setBeforeFile(null);
      setAfterFile(null);
      setTransformTitle('');
      await loadAll();
    } catch (err) {
      alert(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function deleteTransformation(id) {
    if (!confirm('¿Quitar este caso antes/después?')) return;
    setBusyId('transform-' + id);
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/transformations/${id}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error('No se pudo eliminar');
      await loadAll();
    } catch (err) {
      alert(err.message);
    } finally {
      setBusyId(null);
    }
  }

  function logout() {
    localStorage.removeItem('doctor_token');
    router.push('/doctor/login');
  }

  return (
    <main className="panel-body">
      <PanelNav role="doctor" active="/doctor/media" onLogout={logout} />

      <div className="panel-content">
        <div className="panel-eyebrow">Panel del doctor</div>
        <h1 className="panel-title">Imágenes</h1>
        <p className="panel-subtitle">Estas fotos se ven en tiempo real en el sitio público — no necesitas tocar archivos ni pedirle nada a nadie.</p>

        {loading && <p className="panel-empty">Cargando…</p>}
        {error && <p className="panel-msg error">{error}</p>}

        {!loading && (
          <>
            <section className="panel-section">
              <h2 className="panel-section-title">Imágenes de servicios</h2>
              <p className="panel-section-hint">Sube o cambia la foto de cada servicio del catálogo.</p>
              <div className="panel-thumb-grid">
                {services.map((s) => (
                  <div className="panel-thumb-card" key={s.id}>
                    <div className="panel-thumb">
                      {s.image_url ? <img src={resolveUrl(s.image_url)} alt={s.name_es} /> : <div className="panel-thumb-empty">Sin imagen</div>}
                    </div>
                    <div className="panel-row-main" style={{ marginBottom: 12 }}>{s.name_es}</div>
                    <label className="panel-upload-label" style={{ width: '100%' }}>
                      {busyId === 'service-' + s.id ? 'Subiendo…' : 'Cambiar imagen'}
                      <input type="file" accept="image/*" hidden disabled={busyId === 'service-' + s.id}
                        onChange={(e) => uploadServiceImage(s.id, e.target.files[0])} />
                    </label>
                  </div>
                ))}
              </div>
            </section>

            <section className="panel-section">
              <h2 className="panel-section-title">Galería de casos</h2>
              <p className="panel-section-hint">Estas fotos aparecen en "Casos y transformaciones" del sitio público.</p>
              <label className="panel-upload-label" style={{ marginBottom: 24, display: 'inline-block' }}>
                {busyId === 'gallery-new' ? 'Subiendo…' : '+ Agregar foto a la galería'}
                <input type="file" accept="image/*" hidden disabled={busyId === 'gallery-new'}
                  onChange={(e) => uploadGalleryImage(e.target.files[0])} />
              </label>
              <div className="panel-gallery-grid">
                {gallery.map((g) => (
                  <div className="panel-gallery-item" key={g.id}>
                    <img src={resolveUrl(g.image_url)} alt="Caso" />
                    <button className="panel-gallery-remove" disabled={busyId === 'gallery-' + g.id} onClick={() => deleteGalleryImage(g.id)}>
                      {busyId === 'gallery-' + g.id ? '…' : 'Quitar'}
                    </button>
                  </div>
                ))}
              </div>
              {gallery.length === 0 && <p className="panel-empty">Todavía no hay fotos en la galería.</p>}
            </section>

            <section className="panel-section">
              <h2 className="panel-section-title">Real Smile Transformations</h2>
              <p className="panel-section-hint">Sube pares de fotos "antes" y "después" — aparecen con el efecto de deslizador en el sitio público.</p>
              <form onSubmit={uploadTransformation} className="panel-form-grid" style={{ marginBottom: 30 }}>
                <div>
                  <label className="panel-label" style={{ marginTop: 0 }}>Foto "antes"</label>
                  <input className="panel-input" type="file" accept="image/*" onChange={(e) => setBeforeFile(e.target.files[0])} required />
                </div>
                <div>
                  <label className="panel-label" style={{ marginTop: 0 }}>Foto "después"</label>
                  <input className="panel-input" type="file" accept="image/*" onChange={(e) => setAfterFile(e.target.files[0])} required />
                </div>
                <div>
                  <label className="panel-label" style={{ marginTop: 0 }}>Título (opcional)</label>
                  <input className="panel-input" placeholder="Ej: Diseño de sonrisa" value={transformTitle} onChange={(e) => setTransformTitle(e.target.value)} />
                </div>
                <button type="submit" className="panel-btn panel-btn-primary" disabled={busyId === 'transform-new'}>
                  {busyId === 'transform-new' ? 'Subiendo…' : 'Agregar caso'}
                </button>
              </form>

              <div className="panel-thumb-grid">
                {transformations.map((t) => (
                  <div className="panel-thumb-card" key={t.id}>
                    <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                      <div className="panel-thumb" style={{ flex: 1, aspectRatio: '1/1' }}>
                        <img src={resolveUrl(t.before_url)} alt="Antes" />
                      </div>
                      <div className="panel-thumb" style={{ flex: 1, aspectRatio: '1/1' }}>
                        <img src={resolveUrl(t.after_url)} alt="Después" />
                      </div>
                    </div>
                    <div className="panel-row-main" style={{ marginBottom: 12 }}>{t.title_es || 'Sin título'}</div>
                    <button className="panel-btn panel-btn-danger" style={{ width: '100%' }} disabled={busyId === 'transform-' + t.id} onClick={() => deleteTransformation(t.id)}>
                      {busyId === 'transform-' + t.id ? '…' : 'Quitar caso'}
                    </button>
                  </div>
                ))}
              </div>
              {transformations.length === 0 && <p className="panel-empty">Todavía no hay casos antes/después.</p>}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
