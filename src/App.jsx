import { useEffect, useState } from "react";
import {
  fetchOrders,
  ORDERS_ENDPOINT,
  SYNC_SANDBOX_ENDPOINT,
  triggerSandboxOrder,
} from "./api/orders";
import "./App.css";

const ROUTES = {
  orders: "#/orders",
  syncSandbox: "#/sync-sandbox",
};

function getCurrentRoute() {
  const hash = window.location.hash || ROUTES.orders;

  return hash === ROUTES.syncSandbox ? "syncSandbox" : "orders";
}

function App() {
  const [route, setRoute] = useState(getCurrentRoute);

  useEffect(() => {
    function handleHashChange() {
      setRoute(getCurrentRoute());
    }

    window.addEventListener("hashchange", handleHashChange);

    if (!window.location.hash) {
      window.location.hash = ROUTES.orders;
    }

    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, []);

  return (
    <main className="app-shell">
      <section className="panel">
        <header className="page-header">
          <div>
            <p className="eyebrow">API Test</p>
            <h1>Amazon Orders Sandbox Tools</h1>
          </div>
          <nav className="route-nav" aria-label="Test pages">
            <a
              href={ROUTES.orders}
              className={route === "orders" ? "route-link active" : "route-link"}
            >
              Orders List
            </a>
            <a
              href={ROUTES.syncSandbox}
              className={
                route === "syncSandbox" ? "route-link active" : "route-link"
              }
            >
              Sync Sandbox
            </a>
          </nav>
        </header>

        {route === "syncSandbox" ? <SyncSandboxPage /> : <OrdersPage />}
      </section>
    </main>
  );
}

function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [rawResponse, setRawResponse] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function loadOrders() {
    setIsLoading(true);
    setError("");

    try {
      const { data, orders: orderList } = await fetchOrders();

      console.log("Orders API response:", data);
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
    <>
      <p className="summary">
        Calls <code>{ORDERS_ENDPOINT}</code> and shows the current order list.
      </p>

      <div className="actions">
        <button type="button" onClick={loadOrders} disabled={isLoading}>
          {isLoading ? "Loading..." : "Reload Orders"}
        </button>
        <span className="meta">Orders found: {orders.length}</span>
      </div>

      {error ? <p className="error">Error: {error}</p> : null}

      <div className="section">
        <h2>Order List</h2>
        {orders.length > 0 ? (
          <OrderList orders={orders} />
        ) : (
          <p className="empty">
            {isLoading
              ? "Loading orders..."
              : "No array-like order list found in the response yet."}
          </p>
        )}
      </div>

      <div className="section">
        <h2>Raw Response</h2>
        <pre className="response-box">
          {JSON.stringify(rawResponse, null, 2) || "No response loaded yet."}
        </pre>
      </div>
    </>
  );
}

function SyncSandboxPage() {
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

      console.log(`Sandbox sync (${method}) response:`, result.data);
      console.log("Orders after sandbox sync:", refreshedOrders.data);
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
    <>
      <p className="summary">
        Uses <code>{SYNC_SANDBOX_ENDPOINT}</code> to trigger a sandbox order sync
        test.
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
        <span className="meta">
          Last method: {lastMethod || "Not run yet"}
          {statusCode ? ` | Status: ${statusCode}` : ""}
        </span>
      </div>

      <p className="helper-text">
        If the endpoint only accepts one HTTP method, use the matching button.
      </p>

      {error ? <p className="error">Error: {error}</p> : null}

      <div className="section">
        <h2>Sync Response</h2>
        <pre className="response-box">
          {responseData !== null
            ? JSON.stringify(responseData, null, 2)
            : "No sync request has been run yet."}
        </pre>
      </div>

      <div className="section">
        <h2>Orders After Sync</h2>
        {latestOrders.length > 0 ? (
          <OrderList orders={latestOrders} />
        ) : (
          <p className="empty">
            {responseData !== null
              ? "No refreshed orders were returned after the sync."
              : "Run a sync request to auto-refresh the order list."}
          </p>
        )}
      </div>
    </>
  );
}

function OrderList({ orders }) {
  return (
    <ul className="order-list">
      {orders.map((order, index) => {
        const key =
          order?.id ??
          order?.order_id ??
          order?.amazon_order_id ??
          `order-${index}`;

        return (
          <li key={key}>
            <strong>{order?.amazon_order_id || order?.order_id || key}</strong>
            <pre>{JSON.stringify(order, null, 2)}</pre>
          </li>
        );
      })}
    </ul>
  );
}

export default App;
