const LOGO = (
  <svg viewBox="0 0 60 90" fill="none">
    <path d="M38 6C24 12 20 28 30 40C40 52 38 66 20 78" stroke="#4d7ea8" strokeWidth="6" strokeLinecap="round" />
    <path d="M28 10C22 20 24 30 30 36" stroke="#7f9fa2" strokeWidth="5" strokeLinecap="round" />
  </svg>
);

const DOCTOR_LINKS = [
  { href: '/doctor/dashboard', label: 'Citas' },
  { href: '/doctor/media', label: 'Imágenes' },
  { href: '/doctor/schedule', label: 'Agenda' },
  { href: '/doctor/settings', label: 'Horario' },
  { href: '/doctor/charge', label: 'Cobros' },
  { href: '/doctor/blog', label: 'Blog' },
];

export default function PanelNav({ role = 'doctor', active, subtitle, onLogout }) {
  const links = role === 'doctor' ? DOCTOR_LINKS : [];

  return (
    <nav className="panel-nav">
      <a href={role === 'doctor' ? '/doctor/dashboard' : '/paciente/dashboard'} className="panel-brand">
        {LOGO}
        <div className="panel-brand-text">
          <div className="name">Dr. Jorge Jiménez</div>
          <div className="sub">{subtitle || (role === 'doctor' ? 'Panel del doctor' : 'Mi cuenta')}</div>
        </div>
      </a>
      <div className="panel-links">
        {links.map((l) => (
          <a key={l.href} href={l.href} className={active === l.href ? 'active' : ''}>{l.label}</a>
        ))}
        <button className="panel-logout" onClick={onLogout}>Cerrar sesión</button>
      </div>
    </nav>
  );
}
