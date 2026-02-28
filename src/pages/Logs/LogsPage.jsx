const LOG_ITEMS = [
  ["09:42", "INFO", "Orders endpoint polled successfully."],
  ["09:45", "WARN", "Inventory feed latency above nominal threshold."],
  ["09:49", "INFO", "Sandbox sync page ready for manual validation."],
];

function LogsPage() {
  return (
    <section className="panel-card">
      <div className="card-heading-row">
        <h3>Recent Logs</h3>
        <span className="inline-badge">Rolling Window</span>
      </div>
      <div className="list-stack">
        {LOG_ITEMS.map(([time, level, message]) => (
          <div key={`${time}-${level}`} className="line-item">
            <div>
              <strong>
                {time} · {level}
              </strong>
              <p>{message}</p>
            </div>
            <span
              className={
                level === "WARN" ? "inline-badge warning" : "inline-badge success"
              }
            >
              {level}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default LogsPage;
