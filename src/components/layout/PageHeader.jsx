function PageHeader({ eyebrow, title, description }) {
  return (
    <header className="page-header">
      <div>
        <p className="section-eyebrow">{eyebrow}</p>
        <h2 className="page-title">{title}</h2>
        <p className="page-description">{description}</p>
      </div>
      <div className="header-status">
        <span className="status-pill success">API Healthy</span>
        <span className="status-pill">Updated Layout</span>
      </div>
    </header>
  );
}

export default PageHeader;
