import { useEffect, useState } from "react";
import { fetchOrders } from "../../api/orders";

function DashboardPage() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      setIsLoading(true);
      setError("");

      try {
        const result = await fetchOrders();

        if (active) {
          setOrders(result.orders);
        }
      } catch (requestError) {
        if (active) {
          setOrders([]);
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Unknown error while loading dashboard orders.",
          );
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      active = false;
    };
  }, []);

  const totalOrders = orders.length;
  const pendingCount = countByStatus(orders, "pending");
  const unshippedCount = countByStatus(orders, "unshipped");
  const todaysOrders = countTodayOrders(orders);
  const totalRevenue = orders.reduce(
    (sum, order) => sum + getNumericAmount(order),
    0,
  );
  const latestSync = getLatestDateValue(orders, "synced_at");
  const latestSyncCount = countOrdersBySyncTime(orders, latestSync);
  const invalidPurchaseDates = orders.filter(hasInvalidPurchaseDate);
  const statusSegments = buildStatusSegments(orders);

  return (
    <>
      <section className="stats-grid">
        <article className="panel-card stat-card compact-stat">
          <p className="card-label">Total Orders</p>
          <strong className="card-value primary">{totalOrders}</strong>
        </article>
        <article className="panel-card stat-card compact-stat">
          <p className="card-label">Total Revenue</p>
          <strong className="card-value">{formatMoney(totalRevenue)}</strong>
        </article>
        <article className="panel-card stat-card compact-stat">
          <p className="card-label">Today&apos;s Orders</p>
          <strong className="card-value success">{todaysOrders}</strong>
        </article>
        <article className="panel-card stat-card compact-stat">
          <p className="card-label">Last Sync</p>
          <strong className="card-value small-text">
            {latestSync ? formatDateTime(latestSync) : "Unavailable"}
          </strong>
        </article>
      </section>

      {error ? <p className="feedback error-text">Error: {error}</p> : null}

      <section className="two-column-grid">
        <article className="panel-card">
          <div className="card-heading-row">
            <h3>Order Status Distribution</h3>
            <span className="inline-badge">{totalOrders} total</span>
          </div>
          <div className="status-chart-layout">
            <div
              className="status-donut"
              style={{
                background: buildStatusChartBackground(statusSegments),
              }}
              aria-label="Order status donut chart"
            >
              <div className="status-donut-center">
                <strong>{totalOrders}</strong>
                <span>orders</span>
              </div>
            </div>
            <div className="status-legend">
              {statusSegments.map((segment) => (
                <div key={segment.label} className="status-legend-item">
                  <span
                    className="status-dot"
                    style={{ background: segment.color }}
                    aria-hidden="true"
                  />
                  <div>
                    <strong>{segment.label}</strong>
                    <p>{segment.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </article>

        <article className="panel-card">
          <div className="card-heading-row">
            <h3>Sync Snapshot</h3>
            <span className="inline-badge">Automation</span>
          </div>
          <div className="list-stack">
            <div className="line-item">
              <div>
                <strong>Pending / Unshipped</strong>
                <p>
                  Pending: {pendingCount} | Unshipped: {unshippedCount}
                </p>
              </div>
            </div>
            <div className="line-item">
              <div>
                <strong>Last Sync Time</strong>
                <p>{latestSync ? formatDateTime(latestSync) : "Unavailable"}</p>
              </div>
            </div>
            <div className="line-item">
              <div>
                <strong>Sync Count</strong>
                <p>
                  {latestSyncCount > 0
                    ? `Last Sync: ${latestSyncCount} orders processed`
                    : "No sync activity detected"}
                </p>
              </div>
            </div>
          </div>
        </article>
      </section>

      <section className="two-column-grid">
        <article className="panel-card">
          <div className="card-heading-row">
            <h3>Recent Orders</h3>
            <span className="inline-badge">Latest 5</span>
          </div>
          <div className="table-shell dashboard-table-shell">
            <div className="table-row table-head dashboard-table-row">
              <span>Order ID</span>
              <span>Status</span>
              <span>Purchase Date</span>
              <span>Synced</span>
            </div>
            {orders.slice(0, 5).map((order) => (
              <div
                key={order.id ?? order.amazon_order_id}
                className="table-row dashboard-table-row"
              >
                <span>{order.amazon_order_id || order.id}</span>
                <span>
                  <span
                    className={
                      getNormalizedStatus(order.order_status) === "pending"
                        ? "inline-badge warning"
                        : "inline-badge"
                    }
                  >
                    {order.order_status || "Unknown"}
                  </span>
                </span>
                <span>{formatDateTime(order.purchase_date)}</span>
                <span>{formatRelativeTime(order.synced_at)}</span>
              </div>
            ))}
            {!isLoading && orders.length === 0 ? (
              <div className="table-row dashboard-table-row">
                <span>No recent orders available.</span>
                <span />
                <span />
                <span />
              </div>
            ) : null}
          </div>
        </article>

        <article className="panel-card">
          <div className="card-heading-row">
            <h3>Data Quality Warning</h3>
            <span
              className={
                invalidPurchaseDates.length > 0 ? "inline-badge warning" : "inline-badge success"
              }
            >
              {invalidPurchaseDates.length > 0 ? "Issue Detected" : "Clean"}
            </span>
          </div>
          {invalidPurchaseDates.length > 0 ? (
            <div className="list-stack">
              <div className="line-item">
                <div>
                  <strong>Data Issue Detected</strong>
                  <p>
                    {invalidPurchaseDates.length} orders have invalid purchase date
                    (1970).
                  </p>
                </div>
              </div>
              {invalidPurchaseDates.slice(0, 3).map((order) => (
                <div
                  key={`issue-${order.id ?? order.amazon_order_id}`}
                  className="line-item"
                >
                  <div>
                    <strong>{order.amazon_order_id}</strong>
                    <p>{formatDateTime(order.purchase_date)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="card-copy">
              No invalid purchase dates detected in the current order payload.
            </p>
          )}
        </article>
      </section>
    </>
  );
}

function countByStatus(orders, status) {
  return orders.filter(
    (order) => getNormalizedStatus(order.order_status) === status,
  ).length;
}

function getNormalizedStatus(value) {
  return String(value || "").trim().toLowerCase();
}

function countTodayOrders(orders) {
  const today = new Date();
  const yyyy = today.getUTCFullYear();
  const mm = String(today.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(today.getUTCDate()).padStart(2, "0");
  const todayKey = `${yyyy}-${mm}-${dd}`;

  return orders.filter((order) => {
    if (!order.purchase_date) {
      return false;
    }

    return String(order.purchase_date).startsWith(todayKey);
  }).length;
}

function getNumericAmount(order) {
  const value = Number(order.Amount ?? 0);

  return Number.isFinite(value) ? value : 0;
}

function getLatestDateValue(orders, field) {
  const timestamps = orders
    .map((order) => order[field])
    .filter(Boolean)
    .map((value) => new Date(value))
    .filter((value) => !Number.isNaN(value.getTime()))
    .sort((a, b) => b.getTime() - a.getTime());

  return timestamps[0]?.toISOString() || "";
}

function countOrdersBySyncTime(orders, syncTime) {
  if (!syncTime) {
    return 0;
  }

  return orders.filter((order) => order.synced_at === syncTime).length;
}

function hasInvalidPurchaseDate(order) {
  if (!order.purchase_date) {
    return false;
  }

  const parsedDate = new Date(order.purchase_date);

  return !Number.isNaN(parsedDate.getTime()) && parsedDate.getUTCFullYear() === 1970;
}

function buildStatusChartBackground(segments) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);

  if (total === 0) {
    return "conic-gradient(var(--surface-soft) 0deg 360deg)";
  }

  let currentAngle = 0;
  const stops = segments.map((segment) => {
    const start = currentAngle;
    const sweep = (segment.value / total) * 360;
    currentAngle += sweep;

    return `${segment.color} ${start}deg ${currentAngle}deg`;
  });

  return `conic-gradient(${stops.join(", ")})`;
}

function buildStatusSegments(orders) {
  const counts = new Map();

  for (const order of orders) {
    const rawStatus = String(order.order_status || "Unknown").trim();
    const label = rawStatus || "Unknown";
    counts.set(label, (counts.get(label) || 0) + 1);
  }

  if (counts.size === 0) {
    return [];
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([label, value], index) => ({
      label,
      value,
      color: getStatusColor(label, index),
    }));
}

function getStatusColor(status, index) {
  const normalized = getNormalizedStatus(status);
  const palette = [
    "var(--primary)",
    "var(--warning)",
    "var(--success)",
    "var(--error)",
    "var(--text-muted)",
  ];

  if (normalized === "pending") {
    return "var(--warning)";
  }

  if (normalized === "unshipped") {
    return "var(--primary)";
  }

  if (normalized === "shipped" || normalized === "delivered") {
    return "var(--success)";
  }

  if (normalized === "cancelled" || normalized === "canceled") {
    return "var(--error)";
  }

  return palette[index % palette.length];
}

function formatMoney(value) {
  return `$${value.toFixed(2)}`;
}

function formatDateTime(value) {
  if (!value) {
    return "Unavailable";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(parsed);
}

function formatRelativeTime(value) {
  if (!value) {
    return "Unavailable";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return String(value);
  }

  const diffMs = Date.now() - parsed.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes <= 0) {
    return "just now";
  }

  if (diffMinutes === 1) {
    return "1 min ago";
  }

  if (diffMinutes < 60) {
    return `${diffMinutes} mins ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);

  if (diffHours === 1) {
    return "1 hour ago";
  }

  if (diffHours < 24) {
    return `${diffHours} hours ago`;
  }

  return formatDateTime(value);
}

export default DashboardPage;
