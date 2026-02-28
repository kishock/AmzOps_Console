import { useEffect, useState } from "react";
import {
  deleteAllOrders,
  fetchOrders,
  ORDERS_ENDPOINT,
  SYNC_SANDBOX_ENDPOINT,
  triggerSandboxOrder,
} from "../../api/orders";

const ORDER_VIEWS = {
  list: "list",
  sync: "sync",
};

function OrdersPage() {
  const [view, setView] = useState(ORDER_VIEWS.list);
  const [refreshKey, setRefreshKey] = useState(0);
  const [toolbarMessage, setToolbarMessage] = useState("");
  const [toolbarError, setToolbarError] = useState("");
  const [isClearing, setIsClearing] = useState(false);

  async function handleClearOrders() {
    const shouldDelete = window.confirm(
      "Delete all order data from the order table? This action cannot be undone.",
    );

    if (!shouldDelete) {
      return;
    }

    setIsClearing(true);
    setToolbarError("");
    setToolbarMessage("");

    try {
      await deleteAllOrders();
      setRefreshKey((current) => current + 1);
      setToolbarMessage("All order data has been deleted.");
    } catch (requestError) {
      setToolbarMessage("");
      setToolbarError(
        requestError instanceof Error
          ? requestError.message
          : "Unknown error while deleting order data.",
      );
    } finally {
      setIsClearing(false);
    }
  }

  return (
    <>
      <section className="panel-card">
        <div className="card-heading-row">
          <h3>Orders Tools</h3>
          <div className="toolbar-actions">
            <div className="segmented-control" role="tablist" aria-label="Orders views">
              <button
                type="button"
                className={view === ORDER_VIEWS.list ? "tab-button active" : "tab-button"}
                onClick={() => setView(ORDER_VIEWS.list)}
              >
                Orders API
              </button>
              <button
                type="button"
                className={view === ORDER_VIEWS.sync ? "tab-button active" : "tab-button"}
                onClick={() => setView(ORDER_VIEWS.sync)}
              >
                Sync Sandbox
              </button>
            </div>
            <button
              type="button"
              className="danger-button"
              onClick={handleClearOrders}
              disabled={isClearing}
            >
              {isClearing ? "Deleting..." : "Order Table 초기화"}
            </button>
          </div>
        </div>
        <p className="card-copy compact">
          The orders workspace is optimized for operational review with a table-first
          layout and a structured detail panel.
        </p>
        {toolbarMessage ? <p className="feedback success-text">{toolbarMessage}</p> : null}
        {toolbarError ? <p className="feedback error-text">Error: {toolbarError}</p> : null}
      </section>

      {view === ORDER_VIEWS.sync ? (
        <SyncSandboxSection refreshKey={refreshKey} />
      ) : (
        <OrdersApiSection refreshKey={refreshKey} />
      )}
    </>
  );
}

function OrdersApiSection({ refreshKey }) {
  const [orders, setOrders] = useState([]);
  const [rawResponse, setRawResponse] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedOrderKey, setSelectedOrderKey] = useState("");

  async function loadOrders() {
    setIsLoading(true);
    setError("");

    try {
      const { data, orders: orderList } = await fetchOrders();

      setRawResponse(data);
      setOrders(orderList);
      setSelectedOrderKey((currentKey) =>
        orderList.some((order, index) => getOrderKey(order, index) === currentKey)
          ? currentKey
          : getOrderKey(orderList[0], 0),
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unknown error while fetching orders.",
      );
      setRawResponse(null);
      setOrders([]);
      setSelectedOrderKey("");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
  }, [refreshKey]);

  const selectedOrder =
    orders.find(
      (order, index) => getOrderKey(order, index) === selectedOrderKey,
    ) || orders[0];

  return (
    <>
      <section className="stats-grid">
        <article className="panel-card stat-card compact-stat">
          <p className="card-label">Visible Orders</p>
          <strong className="card-value primary">{orders.length}</strong>
        </article>
        <article className="panel-card stat-card compact-stat">
          <p className="card-label">Open / Pending</p>
          <strong className="card-value">
            {countMatchingOrders(orders, ["pending", "unshipped", "open"])}
          </strong>
        </article>
        <article className="panel-card stat-card compact-stat">
          <p className="card-label">Shipped / Closed</p>
          <strong className="card-value success">
            {countMatchingOrders(orders, ["shipped", "closed", "delivered"])}
          </strong>
        </article>
        <article className="panel-card stat-card compact-stat">
          <p className="card-label">Endpoint</p>
          <strong className="card-value small-text">Live API</strong>
        </article>
      </section>

      <section className="orders-layout">
        <article className="panel-card">
          <div className="card-heading-row">
            <h3>Operational Orders Table</h3>
            <span className="inline-badge">{orders.length} records</span>
          </div>
          <p className="card-copy compact">
            Reads from <code>{ORDERS_ENDPOINT}</code>.
          </p>
          <div className="actions">
            <button type="button" onClick={loadOrders} disabled={isLoading}>
              {isLoading ? "Loading..." : "Reload Orders"}
            </button>
          </div>
          {error ? <p className="feedback error-text">Error: {error}</p> : null}
          {orders.length > 0 ? (
            <OrdersDataTable
              orders={orders}
              selectedOrder={selectedOrder}
              onSelectOrder={setSelectedOrderKey}
            />
          ) : (
            <p className="empty-state">
              {isLoading ? "Loading orders..." : "No order records available yet."}
            </p>
          )}
        </article>

        <aside className="detail-column">
          <article className="panel-card">
            <div className="card-heading-row">
              <h3>Order Detail</h3>
              <span className="inline-badge">
                {selectedOrder ? "Selected" : "Waiting"}
              </span>
            </div>
            {selectedOrder ? (
              <OrderDetailPanel order={selectedOrder} />
            ) : (
              <p className="empty-state">
                Select a row after the data loads to inspect the order payload.
              </p>
            )}
          </article>

          <article className="panel-card">
            <div className="card-heading-row">
              <h3>Raw Response</h3>
              <span className="inline-badge">JSON</span>
            </div>
            <pre className="response-box compact-box">
              {JSON.stringify(rawResponse, null, 2) || "No response loaded yet."}
            </pre>
          </article>
        </aside>
      </section>
    </>
  );
}

function SyncSandboxSection({ refreshKey }) {
  const [responseData, setResponseData] = useState(null);
  const [latestOrders, setLatestOrders] = useState([]);
  const [error, setError] = useState("");
  const [statusCode, setStatusCode] = useState(null);
  const [lastMethod, setLastMethod] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setResponseData(null);
    setLatestOrders([]);
    setError("");
    setStatusCode(null);
    setLastMethod("");
  }, [refreshKey]);

  async function runSandboxSync(method) {
    setIsLoading(true);
    setError("");
    setLastMethod(method);

    try {
      const result = await triggerSandboxOrder(method);
      const refreshedOrders = await fetchOrders();

      setStatusCode(result.status);
      setResponseData(result.data);
      setLatestOrders(refreshedOrders.orders);
    } catch (requestError) {
      setStatusCode(null);
      setResponseData(null);
      setLatestOrders([]);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unknown error while triggering sandbox sync.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="orders-layout">
      <article className="panel-card">
        <div className="card-heading-row">
          <h3>Sandbox Sync Trigger</h3>
          <span className="inline-badge">Test Utility</span>
        </div>
        <p className="card-copy compact">
          Calls <code>{SYNC_SANDBOX_ENDPOINT}</code> and refreshes orders after a
          successful response.
        </p>
        <div className="actions">
          <button
            type="button"
            onClick={() => runSandboxSync("POST")}
            disabled={isLoading}
          >
            {isLoading && lastMethod === "POST" ? "Running POST..." : "Run POST"}
          </button>
        </div>
        <p className="helper-text">
          Last method: {lastMethod || "Not run yet"}
          {statusCode ? ` | Status: ${statusCode}` : ""}
        </p>
        {error ? <p className="feedback error-text">Error: {error}</p> : null}
        <div className="section-block">
          <h4>Sync Response</h4>
          <pre className="response-box">
            {responseData !== null
              ? JSON.stringify(responseData, null, 2)
              : "No sync request has been run yet."}
          </pre>
        </div>
      </article>

      <article className="panel-card">
        <div className="card-heading-row">
          <h3>Refreshed Orders Table</h3>
          <span className="inline-badge">{latestOrders.length} records</span>
        </div>
        {latestOrders.length > 0 ? (
          <OrdersDataTable
            orders={latestOrders}
            selectedOrder={latestOrders[0]}
            onSelectOrder={() => {}}
            readOnly
          />
        ) : (
          <p className="empty-state">
            {responseData !== null
              ? "No refreshed orders were returned after the sync."
              : "Run a sync request to auto-refresh the order list."}
          </p>
        )}
      </article>
    </section>
  );
}

function OrdersDataTable({
  orders,
  selectedOrder,
  onSelectOrder,
  readOnly = false,
}) {
  return (
    <div className="orders-table-shell">
      <div className="orders-table-head">
        <span>Order ID</span>
        <span>Status</span>
        <span>Purchase Date</span>
        <span>Buyer</span>
        <span>Amount</span>
      </div>
      <div className="orders-table-body">
        {orders.map((order, index) => {
          const key = getOrderKey(order, index);
          const selected = getOrderKey(selectedOrder, 0) === key;

          return (
            <button
              key={key}
              type="button"
              className={
                selected ? "orders-table-row active" : "orders-table-row"
              }
              onClick={() => onSelectOrder(key)}
              disabled={readOnly}
            >
              <span className="cell-strong">{getOrderId(order, index)}</span>
              <span>{getOrderStatus(order)}</span>
              <span>{getOrderDate(order)}</span>
              <span>{getBuyerLabel(order)}</span>
              <span>{getOrderAmount(order)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function OrderDetailPanel({ order }) {
  return (
    <div className="detail-panel">
      <div className="detail-grid">
        <DetailItem label="Order ID" value={getOrderId(order)} />
        <DetailItem label="Status" value={getOrderStatus(order)} />
        <DetailItem label="Purchase Date" value={getOrderDate(order)} />
        <DetailItem label="Buyer" value={getBuyerLabel(order)} />
        <DetailItem label="Amount" value={getOrderAmount(order)} />
        <DetailItem
          label="Last Update"
          value={
            getField(order, [
              "last_update_date",
              "lastUpdatedAt",
              "updated_at",
              "updatedAt",
            ]) || "Unavailable"
          }
        />
      </div>
      <div className="section-block">
        <h4>Payload</h4>
        <pre className="response-box compact-box">{JSON.stringify(order, null, 2)}</pre>
      </div>
    </div>
  );
}

function DetailItem({ label, value }) {
  return (
    <div className="detail-item">
      <span>{label}</span>
      <strong>{value || "Unavailable"}</strong>
    </div>
  );
}

function countMatchingOrders(orders, matches) {
  return orders.filter((order) => {
    const status = getOrderStatus(order).toLowerCase();

    return matches.some((match) => status.includes(match));
  }).length;
}

function getOrderKey(order, index = 0) {
  return (
    getField(order, ["id", "order_id", "amazon_order_id", "AmazonOrderId"]) ||
    `order-${index}`
  );
}

function getOrderId(order, index = 0) {
  return (
    getField(order, ["amazon_order_id", "AmazonOrderId", "order_id", "id"]) ||
    `order-${index}`
  );
}

function getOrderStatus(order) {
  return (
    getField(order, ["status", "order_status", "OrderStatus"]) || "Unknown"
  );
}

function getOrderDate(order) {
  return (
    getField(order, ["purchase_date", "PurchaseDate", "created_at", "createdAt"]) ||
    "Unavailable"
  );
}

function getBuyerLabel(order) {
  return (
    getField(order, ["buyer_name", "buyerName", "customer_name", "customerName"]) ||
    getField(order, ["buyer_email", "customer_email", "email"]) ||
    "Unavailable"
  );
}

function getOrderAmount(order) {
  const explicitAmount = getField(order, [
    "order_total",
    "amount",
    "total_amount",
    "OrderTotal",
  ]);

  if (typeof explicitAmount === "object" && explicitAmount !== null) {
    const currency =
      explicitAmount.currency_code || explicitAmount.CurrencyCode || "USD";
    const value = explicitAmount.amount || explicitAmount.Amount;

    return value ? `${currency} ${value}` : "Unavailable";
  }

  if (explicitAmount !== undefined && explicitAmount !== null && explicitAmount !== "") {
    return String(explicitAmount);
  }

  return "Unavailable";
}

function getField(record, keys) {
  if (!record || typeof record !== "object") {
    return undefined;
  }

  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null && record[key] !== "") {
      return record[key];
    }
  }

  return undefined;
}

export default OrdersPage;
