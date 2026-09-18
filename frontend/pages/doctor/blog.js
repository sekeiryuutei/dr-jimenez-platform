import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import PanelNav from '../../components/PanelNav';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://dr-jimenez-platform.onrender.com';

const EMPTY_FORM = { title_es: '', title_en: '', excerpt_es: '', excerpt_en: '', content_es: '', content_en: '', published: true };

export default function Blog() {
  const router = useRouter();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [busy, setBusy] = useState(false);

  function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('doctor_token') : null; }
  function authHeaders() { return { Authorization: `Bearer ${getToken()}` }; }

  async function loadPosts() {
    if (!getToken()) { router.replace('/doctor/login'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/blog`, { headers: authHeaders() });
      if (res.status === 401) { router.replace('/doctor/login'); return; }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cargar el blog');
      setPosts(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadPosts(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  function startEdit(post) {
    setEditingId(post.id);
    setForm({
      title_es: post.title_es, title_en: post.title_en,
      excerpt_es: post.excerpt_es || '', excerpt_en: post.excerpt_en || '',
      content_es: post.content_es, content_en: post.content_en,
      published: post.published,
    });
    setImageFile(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setImageFile(null);
  }

  async function submitForm(e) {
    e.preventDefault();
    setBusy(true);
    const body = new FormData();
    Object.entries(form).forEach(([k, v]) => body.append(k, v));
    if (imageFile) body.append('image', imageFile);

    try {
      const url = editingId ? `${BACKEND_URL}/api/admin/blog/${editingId}` : `${BACKEND_URL}/api/admin/blog`;
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: authHeaders(), body });
      if (!res.ok) throw new Error((await res.json()).error || 'Error al guardar');
      resetForm();
      loadPosts();
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function deletePost(id) {
    if (!confirm('¿Borrar este artículo?')) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/blog/${id}`, { method: 'DELETE', headers: authHeaders() });
      if (!res.ok) throw new Error('No se pudo borrar');
      loadPosts();
    } catch (err) {
      alert(err.message);
    }
  }

  function logout() {
    localStorage.removeItem('doctor_token');
    router.push('/doctor/login');
  }

  return (
    <main className="panel-body">
      <PanelNav role="doctor" active="/doctor/blog" onLogout={logout} />

      <div className="panel-content">
        <div className="panel-eyebrow">Panel del doctor</div>
        <h1 className="panel-title">Blog</h1>
        <p className="panel-subtitle">Escribe artículos para el sitio público, en español e inglés. Puedes guardarlos como borrador (no visibles) hasta que estén listos.</p>

        {error && <p className="panel-msg error">{error}</p>}

        <section className="panel-section">
          <h2 className="panel-section-title">{editingId ? 'Editar artículo' : 'Nuevo artículo'}</h2>
          <form onSubmit={submitForm}>
            <div className="panel-form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div>
                <label className="panel-label" style={{ marginTop: 0 }}>Título (Español)</label>
                <input className="panel-input" value={form.title_es} onChange={(e) => setForm({ ...form, title_es: e.target.value })} required />
              </div>
              <div>
                <label className="panel-label" style={{ marginTop: 0 }}>Título (Inglés)</label>
                <input className="panel-input" value={form.title_en} onChange={(e) => setForm({ ...form, title_en: e.target.value })} required />
              </div>
            </div>

            <label className="panel-label">Extracto (Español) — se ve en la tarjeta de la lista</label>
            <input className="panel-input" value={form.excerpt_es} onChange={(e) => setForm({ ...form, excerpt_es: e.target.value })} />
            <label className="panel-label">Extracto (Inglés)</label>
            <input className="panel-input" value={form.excerpt_en} onChange={(e) => setForm({ ...form, excerpt_en: e.target.value })} />

            <label className="panel-label">Contenido (Español)</label>
            <textarea className="panel-input" rows={8} value={form.content_es} onChange={(e) => setForm({ ...form, content_es: e.target.value })} required />
            <label className="panel-label">Contenido (Inglés)</label>
            <textarea className="panel-input" rows={8} value={form.content_en} onChange={(e) => setForm({ ...form, content_en: e.target.value })} required />

            <label className="panel-label">Imagen destacada {editingId && '(deja vacío para conservar la actual)'}</label>
            <input className="panel-input" type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files[0])} />

            <label className="panel-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} />
              Publicado (visible en el sitio)
            </label>

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button type="submit" className="panel-btn panel-btn-primary" disabled={busy}>
                {busy ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Publicar artículo'}
              </button>
              {editingId && <button type="button" className="panel-btn" onClick={resetForm}>Cancelar edición</button>}
            </div>
          </form>
        </section>

        <section className="panel-section">
          <h2 className="panel-section-title">Artículos</h2>
          {loading && <p className="panel-empty">Cargando…</p>}
          {!loading && posts.length === 0 && <p className="panel-empty">Todavía no has escrito ningún artículo.</p>}
          {!loading && posts.length > 0 && (
            <div className="panel-list">
              {posts.map((p) => (
                <div className="panel-row" key={p.id}>
                  <div>
                    <div className="panel-row-main">{p.title_es} {!p.published && <span className="panel-badge badge-pending" style={{ marginLeft: 8 }}>Borrador</span>}</div>
                    <div className="panel-row-meta">{new Date(p.created_at).toLocaleDateString('es-CO')}</div>
                  </div>
                  <div className="panel-row-actions">
                    <button className="panel-btn" onClick={() => startEdit(p)}>Editar</button>
                    <button className="panel-btn panel-btn-danger" onClick={() => deletePost(p.id)}>Borrar</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
