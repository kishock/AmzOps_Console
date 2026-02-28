function Sidebar({ items, activeRoute }) {
  return (
    <aside className="sidebar">
      <div className="brand-block">
        <div className="brand-mark">AO</div>
        <div>
          <p className="brand-eyebrow">Amazon Ops</p>
          <h1 className="brand-title">Console</h1>
        </div>
      </div>

      <nav className="side-nav" aria-label="Primary">
        {items.map((item) => (
          <a
            key={item.key}
            href={item.href}
            className={activeRoute === item.key ? "nav-link active" : "nav-link"}
          >
            {item.label}
          </a>
        ))}
      </nav>

      <div className="sidebar-note">
        <p className="sidebar-note-label">Environment</p>
        <strong>Production Sandbox</strong>
        <span>Stable corporate theme and test utilities enabled.</span>
      </div>
    </aside>
  );
}

export default Sidebar;
