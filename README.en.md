# Amazon Ops Console

Amazon Ops Console is a React + Vite operations console frontend for viewing Amazon order operation data, checking API health, and running sandbox sync tasks.

This project is not a demo-only page. It is structured to resemble a practical operations UI focused on:

- Order data monitoring
- Operations KPI visualization
- API health checks
- Sandbox order sync testing
- Order data reset and validation

## Screenshot

The image below is a README preview that shows the current UI structure.

![Amazon Ops Console Dashboard Preview](./docs/screenshots/dashboard-preview.svg)

## Key Features

- `Dashboard`
  - Displays KPIs, status distribution, recent orders, and data-quality warnings based on Orders API data.
- `Orders`
  - Provides an order table, detail panel, sandbox sync, and delete-all-orders action.
- `API Test`
  - Calls the backend health endpoint (`/dashboard/health`) directly to check service status.
- `Inventory`, `Reports`, `Logs`
  - Provides enterprise-style placeholder modules for future expansion.
- `White / Dark` Theme
  - Switches global theme from the top toggle and stores preference in local storage.

## Tech Stack

- React 19
- Vite 7
- Plain CSS (no external UI framework)
- Fetch API
- Hash-based client navigation

## Project Structure

```text
amzops_console/
├─ docs/
│  └─ screenshots/
│     └─ dashboard-preview.svg
├─ public/
│  └─ vite.svg
├─ src/
│  ├─ api/
│  │  ├─ health.js
│  │  └─ orders.js
│  ├─ components/
│  │  └─ layout/
│  │     ├─ PageHeader.jsx
│  │     └─ Sidebar.jsx
│  ├─ pages/
│  │  ├─ ApiTest/
│  │  │  └─ ApiTestPage.jsx
│  │  ├─ Dashboard/
│  │  │  └─ DashboardPage.jsx
│  │  ├─ Inventory/
│  │  │  └─ InventoryPage.jsx
│  │  ├─ Logs/
│  │  │  └─ LogsPage.jsx
│  │  ├─ Orders/
│  │  │  └─ OrdersPage.jsx
│  │  └─ Reports/
│  │     └─ ReportsPage.jsx
│  ├─ App.css
│  ├─ App.jsx
│  ├─ index.css
│  └─ main.jsx
├─ .env
├─ .gitignore
├─ index.html
├─ package-lock.json
├─ package.json
└─ vite.config.js
```

## Folder and File Notes

### `src/App.jsx`

Top-level application shell.

- Defines sidebar menu
- Resolves current hash route
- Manages global theme state
- Composes common layout (sidebar + header + content)

### `src/api`

Backend communication layer.

- `orders.js`
  - Fetches order list
  - Runs sandbox sync
  - Deletes all orders
  - Manages common API base URL
- `health.js`
  - Calls `/dashboard/health`
  - Measures response time (ms)

### `src/components/layout`

Shared layout components.

- `Sidebar.jsx`
  - Renders brand area and left navigation
- `PageHeader.jsx`
  - Renders page title area and theme toggle

### `src/pages`

Feature-based page modules.

- `Dashboard`
  - Operations dashboard based on order data
- `Orders`
  - Order table, detail panel, delete/sync actions
- `ApiTest`
  - Health-check test page
- `Inventory`, `Reports`, `Logs`
  - Enterprise-style extension pages

### `src/App.css`

Layout/page/component styles.

- Sidebar
- Header
- KPI cards
- Donut chart
- Order table
- Status badges
- Detail panel

### `src/index.css`

Global design tokens and theme variables.

- Light theme
- Dark theme
- Global color variables
- Global element styles
- Motion and accessibility-related settings

## Architecture

The project intentionally avoids complex state-management libraries and focuses on a simple, maintainable structure appropriate for an operations frontend.

### 1. App Shell Structure

`App.jsx` acts as a shared shell.

- Left sidebar
- Top header
- Center content area

When pages change, this shell stays mounted and only the content section is replaced.

### 2. Page-Level Separation

Each major feature is separated under `src/pages/<FeatureName>`.

Examples:

- `DashboardPage.jsx`
  - Reads order data and computes KPIs/charts
- `OrdersPage.jsx`
  - Manages table selection state, delete action, and sandbox actions
- `ApiTestPage.jsx`
  - Sends health-check requests and renders response details

### 3. API Layer Separation

Backend request logic is separated into `src/api`.

Benefits:

- Centralized endpoint management
- Separation between UI and network logic
- Better reusability

### 4. CSS Variable-Based Theme System

Light/Dark themes are controlled through CSS custom properties in `index.css`.

Benefits:

- Theme extension without changing component structure
- Consistent color usage
- Lower maintenance cost

## Routing

The project uses hash-based routing without an external router library.

Supported routes:

- `#/dashboard`
- `#/api-test`
- `#/orders`
- `#/inventory`
- `#/reports`
- `#/logs`

If no hash is provided, `#/dashboard` opens by default.

## Current Backend Endpoints

Default API base URL:

- `https://amazon-ops-dashboard.onrender.com`

Used endpoints:

- `GET /orders/`
  - Fetch all orders
- `POST /orders/sync-sandbox`
  - Run sandbox order sync
- `POST /orders/delete-all`
  - Delete all orders
  - If response is `405`, retries once with `DELETE /orders/delete-all`
- `GET /dashboard/health`
  - API health check

## Environment Variables

Create `.env` in the project root.

```env
VITE_API_URL=https://amazon-ops-dashboard.onrender.com
```

Notes:

- In Vite, browser-exposed env vars must use the `VITE_` prefix.
- Trailing `/` is normalized by the code.

## Local Run

### 1. Install packages

```bash
npm install
```

### 2. Start dev server

```bash
npm run dev
```

Default URL:

- `http://localhost:5173`

### 3. Production build

```bash
npm run build
```

### 4. Preview build

```bash
npm run preview
```

## Available Scripts

- `npm run dev`
  - Start development server
- `npm run build`
  - Create production build in `dist/`
- `npm run preview`
  - Preview the build locally
- `npm run lint`
  - Run ESLint

## Dashboard Screen

The dashboard is built from real `Orders API` data.

Current widgets:

- `Total Orders`
  - Total number of orders
- `Total Revenue`
  - Sum of `Amount`
- `Today's Orders`
  - Number of orders for today
- `Last Sync`
  - Most recent `synced_at`
- `Order Status Distribution`
  - Donut chart by order status
- `Sync Snapshot`
  - Pending / Unshipped and latest sync info
- `Recent Orders`
  - Recent orders table
- `Data Quality Warning`
  - Detects records where `purchase_date` is in 1970

### Status Chart Behavior

The donut chart no longer assumes fixed statuses (`Pending`, `Unshipped`) only.

It dynamically aggregates real `order_status` values such as:

- `Pending`
- `Unshipped`
- `Shipped`
- `Delivered`
- `Canceled`
- Other custom statuses

## Orders Screen

The Orders page is the main operational workspace used most frequently.

Included features:

- Switch between `Orders API` and `Sync Sandbox`
- `Reset Order Table`
  - Delete all orders
- KPI cards
  - Total Orders
  - Pending
  - Unshipped
  - Endpoint
- Order table
- Selected row highlight
- Right-side detail panel
- Raw response panel
- Sync Sandbox result display

### Delete-All Behavior

When clicking `Reset Order Table`:

1. Confirmation prompt is shown
2. `/orders/delete-all` is called
3. On success, order data is reloaded
4. Server response is shown in the top toolbar

### Order Value Mapping

The UI is currently aligned to this response shape:

```json
{
  "id": 39,
  "amazon_order_id": "902-1845936-5435065",
  "order_status": "Unshipped",
  "purchase_date": "1970-01-19T03:58:30+00:00",
  "last_update_date": "1970-01-19T03:58:32+00:00",
  "synced_at": "2026-02-28T04:44:06.893865+00:00",
  "Buyer": "Taylor Kim",
  "Amount": 101.23,
  "Cost": 18.96
}
```

Rendering rules:

- `Buyer` -> `Buyer`
- `Amount` -> `Amount`
- USD amount -> `$101.23` format
- Dates -> formatted into human-readable text

## API Test Screen

The API Test page is for backend status checks.

Current behavior:

- Calls `/dashboard/health`
- Measures response time (ms)
- Displays HTTP status code
- Displays response type
- Displays response payload

## Theme System

You can switch Light / Dark theme from the toggle at the top-right.

Behavior:

- Saves selection in `localStorage` key `amzops-theme`
- Updates `document.documentElement.dataset.theme`
- Switches all colors with CSS variables

Additional note:

- Smooth transition animation is applied during switching
