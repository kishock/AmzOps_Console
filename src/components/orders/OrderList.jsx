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
          <li key={key} className="panel-card">
            <div className="order-item-header">
              <strong>{order?.amazon_order_id || order?.order_id || key}</strong>
              <span className="inline-badge">Live Record</span>
            </div>
            <pre>{JSON.stringify(order, null, 2)}</pre>
          </li>
        );
      })}
    </ul>
  );
}

export default OrderList;
