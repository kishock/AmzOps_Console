import { useEffect, useState } from "react";
import { fetchOrders, ORDERS_ENDPOINT } from "./api/orders";
import "./App.css";

function App() {
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
    <main className="app-shell">
      <section className="panel">
        <p className="eyebrow">API Test</p>
        <h1>Orders Endpoint Check</h1>
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
      </section>
    </main>
  );
}

export default App;
