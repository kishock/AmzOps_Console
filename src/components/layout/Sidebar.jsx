function Sidebar({ items, activeRoute, isCollapsed, onToggleCollapse }) {
  return (
    <aside className={isCollapsed ? "sidebar collapsed" : "sidebar"}>
      <div className="sidebar-top-row">
        <button
          type="button"
          className="sidebar-toggle"
          onClick={onToggleCollapse}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-pressed={isCollapsed}
        >
          <span className="sidebar-toggle-bar" />
          <span className="sidebar-toggle-bar" />
          <span className="sidebar-toggle-bar" />
        </button>
      </div>
      <div className="brand-block">
        <div className="brand-mark" aria-hidden="true">
          <span className="brand-mark-badge">
            <span className="brand-mark-text">AO</span>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="brand-mark-icon"
            >
              <rect x="4" y="5" width="16" height="11" rx="2.5" />
              <path d="M8 20h8" />
              <path d="m8.2 9.2 2.2 1.8-2.2 1.8" />
              <path d="M12.8 13h2.8" />
            </svg>
          </span>
        </div>
        <div className="brand-copy">
          <h1 className="brand-title">Amazon Ops Console</h1>
        </div>
      </div>

      <nav className="side-nav" aria-label="Primary">
        {items.map((item) => (
          <a
            key={item.key}
            href={item.href}
            className={activeRoute === item.key ? "nav-link active" : "nav-link"}
            title={isCollapsed ? item.label : undefined}
          >
            <span className={`nav-icon nav-icon-${item.icon}`} aria-hidden="true">
              {getNavIcon(item.icon)}
            </span>
            <span className="nav-link-label">{item.label}</span>
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

function getNavIcon(icon) {
  const commonProps = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className: "nav-icon-svg",
    "aria-hidden": "true",
  };

  switch (icon) {
    case "pulse":
      return (
        <svg {...commonProps}>
          <path d="M3 12h4l2-4 4 8 2-4h6" />
        </svg>
      );
    case "orders":
      return (
        <svg {...commonProps}>
          <rect x="4" y="5" width="16" height="14" rx="2" />
          <path d="M8 9h8M8 13h8M8 17h5" />
        </svg>
      );
    case "inbound":
      return (
        <svg {...commonProps}>
          <path d="M12 4v10" />
          <path d="m8 10 4 4 4-4" />
          <path d="M5 19h14" />
        </svg>
      );
    case "inventory":
      return (
        <svg {...commonProps}>
          <path d="M12 3 20 7v10l-8 4-8-4V7l8-4Z" />
          <path d="M12 12 20 7M12 12 4 7M12 12v9" />
        </svg>
      );
    case "reports":
      return (
        <svg {...commonProps}>
          <path d="M5 19V9M12 19V5M19 19v-7" />
        </svg>
      );
    case "logs":
      return (
        <svg {...commonProps}>
          <path d="M8 7h11M8 12h11M8 17h11" />
          <path d="M4 7h.01M4 12h.01M4 17h.01" />
        </svg>
      );
    case "grid":
    default:
      return (
        <svg {...commonProps}>
          <rect x="4" y="4" width="6" height="6" rx="1.5" />
          <rect x="14" y="4" width="6" height="6" rx="1.5" />
          <rect x="4" y="14" width="6" height="6" rx="1.5" />
          <rect x="14" y="14" width="6" height="6" rx="1.5" />
        </svg>
      );
  }
}

export default Sidebar;

