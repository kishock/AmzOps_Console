function PageHeader({
  eyebrow,
  title,
  description,
  activeRouteLabel,
  theme,
  onThemeChange,
}) {
  return (
    <header className="page-header">
      <div>
        <p className="section-eyebrow">{eyebrow}</p>
        <h2 className="page-title">{title}</h2>
        <p className="page-description">{description}</p>
      </div>
      <div className="header-status">
        <span className="status-pill">View: {activeRouteLabel}</span>
        <span className="status-pill">
          Theme: {theme === "dark" ? "Dark" : "White"}
        </span>
        <button
          type="button"
          className={theme === "dark" ? "theme-switch dark" : "theme-switch"}
          onClick={() => onThemeChange(theme === "dark" ? "white" : "dark")}
          aria-label={`Switch to ${theme === "dark" ? "white" : "dark"} theme`}
        >
          <span className="theme-option left">
            <span className="theme-icon sun" aria-hidden="true" />
            White
          </span>
          <span className="theme-option right">
            <span className="theme-icon moon" aria-hidden="true" />
            Dark
          </span>
          <span className="theme-thumb" aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}

export default PageHeader;
