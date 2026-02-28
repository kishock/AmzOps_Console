import { useEffect, useState } from "react";
import OrderList from "../../components/orders/OrderList";
import {
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

  return (
    <>
      <section className="panel-card">
        <div className="card-heading-row">
          <h3>Orders Tools</h3>
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
        </div>
        <p className="card-copy compact">
          All existing order test functionality now lives under the Orders page.
        </p>
      </section>

      {view === ORDER_VIEWS.sync ? <SyncSandboxSection /> : <OrdersApiSection />}
    </>
  );
}

function OrdersApiSection() {
  const [orders, setOrders] = useState([]);
  const [rawResponse, setRawResponse] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function loadOrders() {
    setIsLoading(true);
    setError("");

    try {
      const { data, orders: orderList } = await fetchOrders();

      setRawResponse(data);
      setOrders(orderList);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unknown error while fetching orders.",
      );
      setRawResponse(null);
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
  }, []);

  return (
    <section className="two-column-grid">
      <article className="panel-card">
        <div className="card-heading-row">
          <h3>Current Orders</h3>
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
          <OrderList orders={orders} />
        ) : (
          <p className="empty-state">
            {isLoading ? "Loading orders..." : "No order records available yet."}
          </p>
        )}
      </article>

      <article className="panel-card">
        <div className="card-heading-row">
          <h3>Raw Response</h3>
          <span className="inline-badge">JSON</span>
        </div>
        <pre className="response-box">
          {JSON.stringify(rawResponse, null, 2) || "No response loaded yet."}
        </pre>
      </article>
    </section>
  );
}

function SyncSandboxSection() {
  const [responseData, setResponseData] = useState(null);
  const [latestOrders, setLatestOrders] = useState([]);
  const [error, setError] = useState("");
  const [statusCode, setStatusCode] = useState(null);
  const [lastMethod, setLastMethod] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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
    <section className="two-column-grid">
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
          <button
            type="button"
            className="secondary-button"
            onClick={() => runSandboxSync("GET")}
            disabled={isLoading}
          >
            {isLoading && lastMethod === "GET" ? "Running GET..." : "Run GET"}
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
          <h3>Orders After Sync</h3>
          <span className="inline-badge">{latestOrders.length} records</span>
        </div>
        {latestOrders.length > 0 ? (
          <OrderList orders={latestOrders} />
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

export default OrdersPage;
