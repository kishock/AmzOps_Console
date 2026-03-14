import { useEffect, useState } from "react";
import {
  fetchWarehouseTasks,
  updateWarehouseTaskStatus,
  WAREHOUSE_TASKS_ENDPOINT,
} from "../../api/warehouse";

const TASK_FILTERS = [
  { key: "ALL", label: "All" },
  { key: "READY", label: "Ready" },
  { key: "PICKING", label: "Picking" },
  { key: "PICKED", label: "Picked" },
  { key: "PACKING", label: "Packing" },
  { key: "SHIPPED", label: "Shipped" },
];

const STATUS_LABEL_MAP = {
  READY: "작업 대기",
  PICKING: "피킹 중",
  PICKED: "피킹 완료",
  PACKING: "포장 중",
  SHIPPED: "출고 완료",
};

const NEXT_ACTION_MAP = {
  READY: { label: "Start Picking", nextStatus: "PICKING" },
  PICKING: { label: "Mark Picked", nextStatus: "PICKED" },
  PICKED: { label: "Start Packing", nextStatus: "PACKING" },
  PACKING: { label: "Mark Shipped", nextStatus: "SHIPPED" },
  SHIPPED: null,
};

const STATUS_PROGRESS = {
  READY: 20,
  PICKING: 45,
  PICKED: 70,
  PACKING: 88,
  SHIPPED: 100,
};

function WarehousePage() {
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [updatingTaskId, setUpdatingTaskId] = useState("");

  async function loadTasks() {
    setIsLoading(true);
    setError("");

    try {
      const { tasks: taskList } = await fetchWarehouseTasks();
      setTasks(taskList);
    } catch (requestError) {
      setTasks([]);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unknown error while fetching warehouse tasks.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadTasks();
  }, []);

  const filteredTasks = tasks.filter((task) => {
    const normalizedStatus = getTaskStatus(task);

    return statusFilter === "ALL" || normalizedStatus === statusFilter;
  });

  async function handleAdvanceTask(task) {
    const taskId = getWarehouseTaskKey(task);
    const currentStatus = getTaskStatus(task);
    const action = NEXT_ACTION_MAP[currentStatus];

    if (!action) {
      return;
    }

    setUpdatingTaskId(taskId);
    setError("");
    setMessage("");

    try {
      await updateWarehouseTaskStatus(taskId, action.nextStatus);
      setTasks((currentTasks) =>
        currentTasks.map((currentTask) => {
          if (getWarehouseTaskKey(currentTask) !== taskId) {
            return currentTask;
          }

          return {
            ...currentTask,
            status: action.nextStatus,
            task_status: action.nextStatus,
            updated_at: new Date().toISOString(),
          };
        }),
      );
      setMessage(`Task moved to ${formatStatusLabel(action.nextStatus)}.`);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to update task status.",
      );
    } finally {
      setUpdatingTaskId("");
    }
  }

  return (
    <section className="content-grid">
      <article className="panel-card">
        <div className="card-heading-row">
          <h3>Warehouse Tasks</h3>
          <span className="inline-badge">{filteredTasks.length} tasks</span>
        </div>
        <p className="card-copy compact">
          Track and update warehouse task progress from picking to shipping.
        </p>
        <p className="card-copy compact">
          Reads from <code>{WAREHOUSE_TASKS_ENDPOINT}</code>.
        </p>
        <div className="warehouse-toolbar">
          <div className="segmented-control" role="tablist" aria-label="Warehouse task filters">
            {TASK_FILTERS.map((filter) => (
              <button
                key={filter.key}
                type="button"
                className={statusFilter === filter.key ? "tab-button active" : "tab-button"}
                onClick={() => setStatusFilter(filter.key)}
              >
                {filter.label}
              </button>
            ))}
          </div>
          <button type="button" onClick={loadTasks} disabled={isLoading}>
            {isLoading ? "Loading..." : "Reload Tasks"}
          </button>
        </div>
        {message ? <p className="feedback success-text">{message}</p> : null}
        {error ? <p className="feedback error-text">Error: {error}</p> : null}
        {filteredTasks.length > 0 ? (
          <div className="warehouse-table-shell table-shell">
            <div className="table-row table-head warehouse-table-row warehouse-table-head-row">
              <span>Task ID</span>
              <span>Order No</span>
              <span>SKU</span>
              <span>Product</span>
              <span>Qty</span>
              <span>Picker</span>
              <span>Location</span>
              <span>Status</span>
              <span>Updated At</span>
              <span>Action</span>
            </div>
            {filteredTasks.map((task, index) => {
              const taskId = getWarehouseTaskKey(task, index);
              const status = getTaskStatus(task);
              const action = NEXT_ACTION_MAP[status];
              const isUpdating = updatingTaskId === taskId;

              return (
                <div key={taskId} className="table-row warehouse-table-row">
                  <span className="cell-strong">{taskId}</span>
                  <span>{getTaskField(task, ["order_no", "order_number", "orderNo"]) || "Unavailable"}</span>
                  <span>{getTaskField(task, ["sku", "SKU"]) || "Unavailable"}</span>
                  <span>{getTaskField(task, ["product", "product_name", "productName", "title"]) || "Unavailable"}</span>
                  <span>{formatTaskQuantity(getTaskField(task, ["qty", "quantity"]))}</span>
                  <span>{getTaskField(task, ["picker", "picker_name", "pickerName"]) || "Unavailable"}</span>
                  <span>{getTaskField(task, ["loc", "location", "location_code", "locationCode"]) || "Unavailable"}</span>
                  <div className="warehouse-status-cell">
                    <span className={`warehouse-status-badge ${status.toLowerCase()}`}>
                      {formatStatusLabel(status)}
                    </span>
                    <div className="warehouse-status-progress" aria-hidden="true">
                      <span
                        className="warehouse-status-progress-fill"
                        style={{ width: `${STATUS_PROGRESS[status] || 0}%` }}
                      />
                    </div>
                  </div>
                  <span>{formatTaskUpdatedAt(getTaskField(task, ["updated_at", "updatedAt", "last_updated_at", "lastUpdatedAt"]))}</span>
                  <div className="warehouse-action-cell">
                    {action ? (
                      <button
                        type="button"
                        className="secondary-button warehouse-action-button"
                        onClick={() => handleAdvanceTask(task)}
                        disabled={isUpdating}
                      >
                        {isUpdating ? "Updating..." : action.label}
                      </button>
                    ) : (
                      <span className="warehouse-action-complete">Completed</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="empty-state">
            {isLoading ? "Loading warehouse tasks..." : "No warehouse tasks matched the current filter."}
          </p>
        )}
      </article>
    </section>
  );
}

function getWarehouseTaskKey(task, index = 0) {
  return getTaskField(task, ["task_id", "taskId", "id"]) || `task-${index}`;
}

function getTaskField(task, keys) {
  if (!task || typeof task !== "object") {
    return undefined;
  }

  for (const key of keys) {
    const value = task[key];

    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }

  return undefined;
}

function getTaskStatus(task) {
  return String(getTaskField(task, ["status", "task_status"]) || "READY").toUpperCase();
}

function formatTaskQuantity(value) {
  const numericValue = Number(value);

  return Number.isFinite(numericValue) ? String(numericValue) : "0";
}

function formatStatusLabel(status) {
  return STATUS_LABEL_MAP[status] || status;
}

function formatTaskUpdatedAt(value) {
  if (!value) {
    return "Unavailable";
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsedDate);
}

export default WarehousePage;
