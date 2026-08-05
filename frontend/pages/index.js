export default function Home() {
  return (
    <main className="main">
      <nav className="nav">
        <div className="brand">
          <svg viewBox="0 0 60 90" width="26" fill="none">
            <path d="M38 6C24 12 20 28 30 40C40 52 38 66 20 78" stroke="#4d7ea8" strokeWidth="6" strokeLinecap="round" />
            <path d="M28 10C22 20 24 30 30 36" stroke="#7f9fa2" strokeWidth="5" strokeLinecap="round" />
          </svg>
          <div className="brand-text">
            <div className="name">Dr. Jorge Jiménez</div>
            <div className="sub">Panel interno de desarrollo</div>
          </div>
        </div>
        <div className="status">Backend: <span className="dot" /> localhost:4000</div>
      </nav>

      <header className="hero">
        <div className="eyebrow">Revisión de diseño</div>
        <h1>Elige la dirección visual</h1>
        <p>
          Estos son los prototipos en curso. Ábrelos con el doctor, decidan la dirección
          y seguimos conectando el sistema completo sobre esa base.
        </p>
      </header>

      <section className="grid">
        {prototypes.map((p) => (
          <a key={p.href} href={p.href} className="card" target="_blank" rel="noreferrer">
            <div className="card-top">
              <span className="card-tag">{p.tag}</span>
            </div>
            <div className="card-label">{p.label}</div>
            <div className="card-desc">{p.desc}</div>
            <div className="card-cta">Ver prototipo <span className="arrow">→</span></div>
          </a>
        ))}

        <div className="card card-placeholder">
          <div className="card-label">+ Nueva variante</div>
          <div className="card-desc">
            Cuando tengan otra dirección de diseño, se agrega aquí como otra tarjeta.
          </div>
        </div>
      </section>

      <footer className="footer">
        <div>Sistema en construcción — agendamiento, dashboard y pagos se conectan en la siguiente fase.</div>
        <div className="foot-credit">Proyecto realizado por &lt;CodeVAM&gt;</div>
      </footer>

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
          padding: 24px 6vw;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }
        .brand { display: flex; align-items: center; gap: 12px; }
        .brand-text .name {
          font-family: 'Cormorant Garamond', serif;
          font-size: 16px;
          letter-spacing: 0.04em;
        }
        .brand-text .sub {
          font-size: 9px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: #7f9fa2;
        }
        .status {
          font-size: 11px;
          color: #7a7a76;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #4d7ea8;
          display: inline-block;
        }
        .hero {
          padding: 90px 8vw 60px;
          max-width: 720px;
        }
        .eyebrow {
          font-size: 12px;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: #7f9fa2;
          margin-bottom: 18px;
        }
        .hero h1 {
          font-family: 'Cormorant Garamond', serif;
          font-weight: 400;
          font-size: clamp(34px, 4.2vw, 54px);
          margin-bottom: 18px;
        }
        .hero p {
          color: #c9c8c3;
          line-height: 1.75;
          font-size: 15px;
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1px;
          background: #2b2b29;
          margin: 0 8vw 100px;
          border: 1px solid #2b2b29;
        }
        .card {
          background: #121212;
          padding: 34px 30px;
          text-decoration: none;
          color: #f6f5f2;
          display: block;
          transition: background 0.3s ease, transform 0.3s ease;
        }
        .card:hover {
          background: #1a1a1a;
          transform: translateY(-2px);
        }
        .card-top { margin-bottom: 20px; }
        .card-tag {
          font-size: 10px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #4d7ea8;
          border: 1px solid #2c4a5c;
          padding: 4px 10px;
          border-radius: 20px;
        }
        .card-label {
          font-family: 'Cormorant Garamond', serif;
          font-size: 24px;
          margin-bottom: 12px;
        }
        .card-desc {
          font-size: 13px;
          color: #a8a7a2;
          line-height: 1.65;
          margin-bottom: 26px;
        }
        .card-cta {
          font-size: 12px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #7f9fa2;
        }
        .card .arrow {
          display: inline-block;
          transition: transform 0.25s ease;
        }
        .card:hover .arrow {
          transform: translateX(4px);
        }
        .card-placeholder {
          border: 1px dashed #333;
          background: transparent;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .card-placeholder .card-label { color: #6a6a66; }
        .footer {
          padding: 40px 8vw 60px;
          font-size: 11px;
          color: #3a3a38;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
        }
        .foot-credit {
          margin-top: 10px;
          letter-spacing: 0.06em;
        }
      `}</style>
    </main>
  );
}

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

const prototypes = [
  {
    href: `${basePath}/prototypes/preview-landing.html`,
    tag: 'V1',
    label: 'Luxury Parallax',
    desc: 'Hero con sonrisa animada por scroll, catálogo, galería, misión/visión, bilingüe ES/EN.',
  },
];
