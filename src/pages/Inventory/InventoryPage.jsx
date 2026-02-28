const INVENTORY_ROWS = [
  ["SKU-AX102", "Warehouse A", "128", "Healthy"],
  ["SKU-BX410", "Warehouse B", "24", "Low"],
  ["SKU-CX050", "Warehouse A", "0", "Out"],
];

function InventoryPage() {
  return (
    <section className="two-column-grid">
      <article className="panel-card">
        <div className="card-heading-row">
          <h3>Stock Overview</h3>
          <span className="inline-badge">3 key SKUs</span>
        </div>
        <div className="table-shell">
          <div className="table-row table-head">
            <span>SKU</span>
            <span>Location</span>
            <span>Units</span>
            <span>Status</span>
          </div>
          {INVENTORY_ROWS.map((row) => (
            <div key={row[0]} className="table-row">
              {row.map((cell) => (
                <span key={cell}>{cell}</span>
              ))}
            </div>
          ))}
        </div>
      </article>

      <article className="panel-card">
        <div className="card-heading-row">
          <h3>Replenishment Notes</h3>
          <span className="inline-badge">Planning</span>
        </div>
        <p className="card-copy">
          This section is prepared for future inventory integrations. It keeps
          the application structure aligned with a production dashboard while
          leaving room for API-backed stock modules later.
        </p>
      </article>
    </section>
  );
}

export default InventoryPage;
