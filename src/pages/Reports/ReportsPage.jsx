const REPORT_SUMMARIES = [
  ["Weekly Sales", "$482K", "Primary"],
  ["Refund Rate", "1.9%", "Stable"],
  ["Late Shipment Rate", "0.6%", "Healthy"],
];

function ReportsPage() {
  return (
    <section className="two-column-grid">
      <article className="panel-card">
        <div className="card-heading-row">
          <h3>Reporting Summary</h3>
          <span className="inline-badge">Snapshot</span>
        </div>
        <div className="list-stack">
          {REPORT_SUMMARIES.map(([label, value, note]) => (
            <div key={label} className="line-item">
              <div>
                <strong>{label}</strong>
                <p>{note}</p>
              </div>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      </article>

      <article className="panel-card">
        <div className="card-heading-row">
          <h3>Analyst Notes</h3>
          <span className="inline-badge">Internal</span>
        </div>
        <p className="card-copy">
          Report visuals are intentionally restrained: neutral surfaces, clear
          typography, and color only where status matters. This keeps the UI
          closer to enterprise operations software than a consumer dashboard.
        </p>
      </article>
    </section>
  );
}

export default ReportsPage;
