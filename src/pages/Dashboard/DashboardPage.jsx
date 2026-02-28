const DASHBOARD_CARDS = [
  { label: "Net Sales", value: "$124.8K", tone: "primary" },
  { label: "Orders Today", value: "312", tone: "neutral" },
  { label: "Fill Rate", value: "98.6%", tone: "success" },
  { label: "Open Issues", value: "4", tone: "danger" },
];

const PIPELINE_ITEMS = [
  ["Order intake", "Stable", "All inbound channels posting normally."],
  ["Warehouse sync", "Monitoring", "Last sync completed within SLA range."],
  ["Carrier updates", "Stable", "Tracking events flowing without backlog."],
];

function DashboardPage() {
  return (
    <>
      <section className="stats-grid">
        {DASHBOARD_CARDS.map((card) => (
          <article key={card.label} className="panel-card stat-card">
            <p className="card-label">{card.label}</p>
            <strong className={`card-value ${card.tone}`}>{card.value}</strong>
          </article>
        ))}
      </section>

      <section className="two-column-grid">
        <article className="panel-card">
          <div className="card-heading-row">
            <h3>Operations Pipeline</h3>
            <span className="inline-badge">Live View</span>
          </div>
          <div className="list-stack">
            {PIPELINE_ITEMS.map(([title, status, text]) => (
              <div key={title} className="line-item">
                <div>
                  <strong>{title}</strong>
                  <p>{text}</p>
                </div>
                <span className="inline-badge">{status}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="panel-card">
          <div className="card-heading-row">
            <h3>Leadership Summary</h3>
            <span className="inline-badge">Daily</span>
          </div>
          <p className="card-copy">
            Revenue remains on target, order flow is stable, and only a limited
            number of exceptions require manual review. The layout mirrors a
            clean enterprise dashboard rather than a promotional marketing page.
          </p>
          <div className="summary-metrics">
            <div>
              <span>Marketplace uptime</span>
              <strong>99.94%</strong>
            </div>
            <div>
              <span>Average response time</span>
              <strong>420 ms</strong>
            </div>
          </div>
        </article>
      </section>
    </>
  );
}

export default DashboardPage;
