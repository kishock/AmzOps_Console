import { useEffect, useState } from "react";
import "./App.css";
import ApiTestPage from "./pages/ApiTest/ApiTestPage";
import PageHeader from "./components/layout/PageHeader";
import Sidebar from "./components/layout/Sidebar";
import InboundListPage from "./pages/Inbound/InboundListPage";
import DashboardPage from "./pages/Dashboard/DashboardPage";
import InventoryPage from "./pages/Inventory/InventoryPage";
import LogsPage from "./pages/Logs/LogsPage";
import OrdersPage from "./pages/Orders/OrdersPage";
import WarehousePage from "./pages/Warehouse/WarehousePage";

const THEMES = {
  white: "white",
  dark: "dark",
};

const SIDEBAR_STATE_KEY = "amzops-sidebar-collapsed";

const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", href: "#/dashboard", icon: "grid" },
  { key: "orders", label: "Orders", href: "#/orders", icon: "orders" },
  { key: "inbound", label: "Inbound", href: "#/inbound", icon: "inbound" },
  { key: "warehouse", label: "Warehouse Tasks", href: "#/warehouse", icon: "reports" },
  { key: "inventory", label: "Inventory", href: "#/inventory", icon: "inventory" },
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
  inbound: {
    eyebrow: "Receiving Queue",
    title: "Inbound",
    description:
      "Monitor inbound receiving work, open ASN handling, and dock-side execution priorities.",
  },
  "api-test": {
    eyebrow: "Service Health",
    title: "API Test Console",
    description:
      "Run direct platform health checks and inspect the current API response payload from the dedicated test workspace.",
  },
  inventory: {
    eyebrow: "Stock Visibility",
    title: "Inventory Overview",
    description:
      "Track on-hand units, replenishment pressure, and SKU health using a clean operational summary.",
  },
  warehouse: {
    eyebrow: "Warehouse Floor",
    title: "Warehouse Tasks",
    description:
      "Coordinate receiving, picking, replenishment, and exception handling from a dedicated warehouse workspace.",
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
  const [theme, setTheme] = useState(() => {
    const savedTheme = window.localStorage.getItem("amzops-theme");

    return savedTheme === THEMES.dark ? THEMES.dark : THEMES.white;
  });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return window.sessionStorage.getItem(SIDEBAR_STATE_KEY) === "true";
  });

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

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("amzops-theme", theme);
  }, [theme]);

  useEffect(() => {
    window.sessionStorage.setItem(
      SIDEBAR_STATE_KEY,
      isSidebarCollapsed ? "true" : "false",
    );
  }, [isSidebarCollapsed]);

  return (
    <div className={isSidebarCollapsed ? "app-frame sidebar-collapsed" : "app-frame"}>
      <Sidebar
        items={NAV_ITEMS}
        activeRoute={activeRoute}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((current) => !current)}
      />
      <div className="content-shell">
        <PageHeader {...PAGE_META[activeRoute]} theme={theme} onThemeChange={setTheme} />
        <div className="content-grid">{renderPage(activeRoute)}</div>
      </div>
    </div>
  );
}

function renderPage(route) {
  switch (route) {
    case "orders":
      return <OrdersPage />;
    case "inbound":
      return <InboundListPage />;
    case "inventory":
      return <InventoryPage />;
    case "api-test":
      return <ApiTestPage />;
    case "warehouse":
      return <WarehousePage />;
    case "logs":
      return <LogsPage />;
    case "dashboard":
    default:
      return <DashboardPage />;
  }
}

export default App;





