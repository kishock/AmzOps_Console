import { useEffect, useState } from "react";
import "./App.css";
import PageHeader from "./components/layout/PageHeader";
import Sidebar from "./components/layout/Sidebar";
import DashboardPage from "./pages/Dashboard/DashboardPage";
import InventoryPage from "./pages/Inventory/InventoryPage";
import LogsPage from "./pages/Logs/LogsPage";
import OrdersPage from "./pages/Orders/OrdersPage";
import ReportsPage from "./pages/Reports/ReportsPage";

const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", href: "#/dashboard" },
  { key: "orders", label: "Orders", href: "#/orders" },
  { key: "inventory", label: "Inventory", href: "#/inventory" },
  { key: "reports", label: "Reports", href: "#/reports" },
  { key: "logs", label: "Logs", href: "#/logs" },
];

const PAGE_META = {
  dashboard: {
    eyebrow: "Operations Overview",
    title: "Executive Command Center",
    description:
      "Monitor fulfillment health, revenue momentum, and operational risk from one consistent control surface.",
  },
  orders: {
    eyebrow: "Order Controls",
    title: "Orders Workspace",
    description:
      "Inspect live orders, run sandbox sync tests, and validate API responses without leaving the operations console.",
  },
  inventory: {
    eyebrow: "Stock Visibility",
    title: "Inventory Snapshot",
    description:
      "Track on-hand units, replenishment pressure, and SKU health using a clean operational summary.",
  },
  reports: {
    eyebrow: "Business Reporting",
    title: "Performance Reports",
    description:
      "Review revenue, service levels, and trend indicators in a restrained executive reporting layout.",
  },
  logs: {
    eyebrow: "Audit Trail",
    title: "System Logs",
    description:
      "Keep recent sync events, API warnings, and exception traces visible for quick operational review.",
  },
};

function getCurrentRoute() {
  const hash = window.location.hash.replace("#/", "");
  const matched = NAV_ITEMS.find((item) => item.key === hash);

  return matched?.key || "dashboard";
}

function App() {
  const [activeRoute, setActiveRoute] = useState(getCurrentRoute);

  useEffect(() => {
    function handleHashChange() {
      setActiveRoute(getCurrentRoute());
    }

    window.addEventListener("hashchange", handleHashChange);

    if (!window.location.hash) {
      window.location.hash = "#/dashboard";
    }

    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, []);

  return (
    <div className="app-frame">
      <Sidebar items={NAV_ITEMS} activeRoute={activeRoute} />
      <div className="content-shell">
        <PageHeader {...PAGE_META[activeRoute]} />
        <div className="content-grid">{renderPage(activeRoute)}</div>
      </div>
    </div>
  );
}

function renderPage(route) {
  switch (route) {
    case "orders":
      return <OrdersPage />;
    case "inventory":
      return <InventoryPage />;
    case "reports":
      return <ReportsPage />;
    case "logs":
      return <LogsPage />;
    case "dashboard":
    default:
      return <DashboardPage />;
  }
}

export default App;
