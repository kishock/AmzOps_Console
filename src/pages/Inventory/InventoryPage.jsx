import { useEffect, useState } from "react";
import {
  fetchInventory,
  fetchInventoryLedger,
  INVENTORY_ADJUSTMENT_ENDPOINTS,
  INVENTORY_ENDPOINT,
  INVENTORY_LEDGER_ENDPOINT,
  submitInventoryAdjustment,
} from "../../api/inventory";

const STATUS_FILTERS = ["ALL", "OK", "LOW", "OUT"];
const ADJUSTMENT_TRANSACTION_TYPE_OPTIONS = ["RECEIVE", "PICK", "SHIP", "ADJUST", "RETURN"];
const LEDGER_PAGE_SIZE = 5;
const EMPTY_ADJUSTMENT_FORM = {
  sku: "",
  quantity: "0",
  transactionType: "ADJUST",
  reason: "",
  approvedBy: "Kai",
};

function InventoryPage() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchText, setSearchText] = useState("");
  const [selectedInventoryKey, setSelectedInventoryKey] = useState("");
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [ledgerError, setLedgerError] = useState("");
  const [isLedgerLoading, setIsLedgerLoading] = useState(false);
  const [currentLedgerPage, setCurrentLedgerPage] = useState(1);
  const [adjustmentForm, setAdjustmentForm] = useState(EMPTY_ADJUSTMENT_FORM);
  const [adjustmentMessage, setAdjustmentMessage] = useState("");
  const [adjustmentError, setAdjustmentError] = useState("");
  const [isSubmittingAdjustment, setIsSubmittingAdjustment] = useState(false);

  async function loadInventory() {
    setIsLoading(true);
    setError("");

    try {
      const { inventory } = await fetchInventory();
      setItems(inventory);
      setSelectedInventoryKey((currentKey) =>
        inventory.some((item, index) => getInventoryKey(item, index) === currentKey)
          ? currentKey
          : inventory.length > 0 ? getInventoryKey(inventory[0], 0) : "",
      );
    } catch (requestError) {
      setItems([]);
      setSelectedInventoryKey("");
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unknown error while fetching inventory.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadInventory();
  }, []);

  const filteredItems = items.filter((item) => {
    const normalizedStatus = String(item.status || "").toUpperCase();
    const normalizedSearch = searchText.trim().toLowerCase();
    const matchesStatus = statusFilter === "ALL" || normalizedStatus === statusFilter;
    const matchesSearch =
      !normalizedSearch ||
      String(item.sku || "").toLowerCase().includes(normalizedSearch) ||
      String(item.product_name || "").toLowerCase().includes(normalizedSearch);

    return matchesStatus && matchesSearch;
  });

  useEffect(() => {
    setSelectedInventoryKey((currentKey) => {
      if (filteredItems.some((item, index) => getInventoryKey(item, index) === currentKey)) {
        return currentKey;
      }

      return filteredItems.length > 0 ? getInventoryKey(filteredItems[0], 0) : "";
    });
  }, [filteredItems]);

  const selectedItem =
    filteredItems.find(
      (item, index) => getInventoryKey(item, index) === selectedInventoryKey,
    ) || filteredItems[0] || null;

  useEffect(() => {
    if (!selectedItem) {
      setLedgerEntries([]);
      setLedgerError("");
      setCurrentLedgerPage(1);
      setAdjustmentMessage("");
      setAdjustmentError("");
      setAdjustmentForm((current) => ({ ...current, sku: "", quantity: "0", reason: "" }));
      return;
    }

    const sku = String(selectedItem.sku || "");
    setCurrentLedgerPage(1);
    setAdjustmentMessage("");
    setAdjustmentError("");
    setAdjustmentForm((current) => ({
      ...current,
      sku,
      quantity: "0",
      reason: "",
    }));

    let cancelled = false;

    async function loadLedger() {
      setIsLedgerLoading(true);
      setLedgerError("");

      try {
        const result = await fetchInventoryLedger(sku);

        if (cancelled) {
          return;
        }

        setLedgerEntries(result.ledger);
      } catch (requestError) {
        if (cancelled) {
          return;
        }

        setLedgerEntries([]);
          setLedgerError(
          requestError instanceof Error
            ? requestError.message
            : "Unknown error while fetching inventory transaction history.",
        );
      } finally {
        if (!cancelled) {
          setIsLedgerLoading(false);
        }
      }
    }

    loadLedger();

    return () => {
      cancelled = true;
    };
  }, [selectedItem]);

  const adjustmentQuantity = Number(adjustmentForm.quantity);
  const currentAvailableQuantity = Number(selectedItem?.available_qty ?? 0);
  const projectedAvailableQuantity = currentAvailableQuantity + adjustmentQuantity;
  const isAdjustmentQuantityValid = Number.isFinite(adjustmentQuantity) && adjustmentQuantity !== 0;
  const wouldCreateNegativeInventory =
    Number.isFinite(currentAvailableQuantity) &&
    Number.isFinite(adjustmentQuantity) &&
    projectedAvailableQuantity < 0;

  useEffect(() => {
    if (isAdjustmentQuantityValid && adjustmentError === "Quantity must be a non-zero value.") {
      setAdjustmentError("");
    }

    if (
      !wouldCreateNegativeInventory &&
      adjustmentError.startsWith("Adjustment would make inventory negative")
    ) {
      setAdjustmentError("");
    }
  }, [adjustmentError, isAdjustmentQuantityValid, wouldCreateNegativeInventory]);

  const totalLedgerPages = Math.max(1, Math.ceil(ledgerEntries.length / LEDGER_PAGE_SIZE));
  const paginatedLedgerEntries = ledgerEntries.slice(
    (currentLedgerPage - 1) * LEDGER_PAGE_SIZE,
    currentLedgerPage * LEDGER_PAGE_SIZE,
  );

  const summaryItems = [
    { label: "Total SKUs", value: filteredItems.length, filter: "ALL" },
    { label: "OK", value: countByStatus(filteredItems, "OK"), filter: "OK" },
    { label: "LOW", value: countByStatus(filteredItems, "LOW"), filter: "LOW" },
    { label: "OUT", value: countByStatus(filteredItems, "OUT"), filter: "OUT" },
  ];

  async function handleSubmitAdjustment(event) {
    event.preventDefault();

    setAdjustmentMessage("");
    setAdjustmentError("");

    if (!isAdjustmentQuantityValid) {
      setAdjustmentError("Quantity must be a non-zero value.");
      return;
    }

    if (wouldCreateNegativeInventory) {
      setAdjustmentError(
        `Adjustment would make inventory negative. Available: ${formatSignedQuantity(currentAvailableQuantity, false)}, requested change: ${formatSignedQuantity(adjustmentQuantity)}.`
      );
      return;
    }

    setIsSubmittingAdjustment(true);

    try {
      const payload = {
        sku: adjustmentForm.sku,
        quantity: Number(adjustmentForm.quantity),
        transaction_type: adjustmentForm.transactionType,
        reason: adjustmentForm.reason,
        approved_by: adjustmentForm.approvedBy,
      };

      const result = await submitInventoryAdjustment(payload);
      setAdjustmentMessage(`Inventory adjustment submitted via ${result.endpoint}`);
      await loadInventory();

      if (payload.sku) {
        const ledgerResult = await fetchInventoryLedger(payload.sku);
        setLedgerEntries(ledgerResult.ledger);
      }
    } catch (requestError) {
      setAdjustmentError(
        requestError instanceof Error
          ? requestError.message
          : "Unknown error while submitting the inventory adjustment.",
      );
    } finally {
      setIsSubmittingAdjustment(false);
    }
  }

  return (
    <section className="orders-layout inventory-layout">
      <article className="panel-card">
        <div className="card-heading-row">
          <h3>Inventory List</h3>
          <span className="inline-badge">{filteredItems.length} records</span>
        </div>
        <p className="card-copy compact">
          Reads from <code>{INVENTORY_ENDPOINT}</code>.
        </p>
        <div className="inventory-toolbar">
          <div className="segmented-control" role="tablist" aria-label="Inventory status filters">
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter}
                type="button"
                className={statusFilter === filter ? "tab-button active" : "tab-button"}
                onClick={() => setStatusFilter(filter)}
              >
                {filter}
              </button>
            ))}
          </div>
          <label className="inventory-search">
            <span className="sr-only">Search by SKU or product name</span>
            <input
              type="text"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Search SKU or product name"
            />
          </label>
          <button type="button" onClick={loadInventory} disabled={isLoading}>
            {isLoading ? "Loading..." : "Reload Inventory"}
          </button>
        </div>
        <p className="inventory-summary-line" aria-live="polite">
          {summaryItems.map((item) => (
            <span
              key={item.filter}
              className={
                statusFilter === item.filter
                  ? "inventory-summary-chip active"
                  : "inventory-summary-chip"
              }
            >
              {item.label}: {item.value}
            </span>
          ))}
        </p>
        {error ? <p className="feedback error-text">Error: {error}</p> : null}
        {filteredItems.length > 0 ? (
          <InventoryDataTable
            items={filteredItems}
            selectedItem={selectedItem}
            onSelectItem={setSelectedInventoryKey}
          />
        ) : (
          <p className="empty-state">
            {isLoading ? "Loading inventory..." : "No inventory records matched the current filters."}
          </p>
        )}
      </article>

      <aside className="detail-column">
        <article className="panel-card">
          <div className="card-heading-row">
            <h3>Inventory Adjustment</h3>
            <span className="inline-badge">POST</span>
          </div>
          <p className="card-copy compact">
            Writes to <code>{INVENTORY_ADJUSTMENT_ENDPOINTS[0]}</code>.
          </p>
          {selectedItem ? (
            <form className="inventory-adjustment-form" onSubmit={handleSubmitAdjustment}>
              <label className="inventory-field">
                <span>SKU</span>
                <input
                  type="text"
                  className="inventory-readonly-input"
                  value={adjustmentForm.sku}
                  readOnly
                  aria-readonly="true"
                />
              </label>
              <div className="inventory-inline-fields">
                <label className="inventory-field">
                  <span>Quantity</span>
                  <input
                    type="number"
                    value={adjustmentForm.quantity}
                    onChange={(event) =>
                      setAdjustmentForm((current) => ({ ...current, quantity: event.target.value }))
                    }
                    required
                  />
                </label>
                <label className="inventory-field">
                  <span>Type</span>
                  <select
                    value={adjustmentForm.transactionType}
                    onChange={(event) =>
                      setAdjustmentForm((current) => ({ ...current, transactionType: event.target.value }))
                    }
                    required
                  >
                    {ADJUSTMENT_TRANSACTION_TYPE_OPTIONS.map((transactionType) => (
                      <option key={transactionType} value={transactionType}>
                        {transactionType}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="inventory-field">
                <span>Reason</span>
                <input
                  type="text"
                  value={adjustmentForm.reason}
                  onChange={(event) =>
                    setAdjustmentForm((current) => ({ ...current, reason: event.target.value }))
                  }
                  placeholder="Enter adjustment reason"
                />
              </label>
              <label className="inventory-field">
                <span>Approved By</span>
                <input
                  type="text"
                  value={adjustmentForm.approvedBy}
                  onChange={(event) =>
                    setAdjustmentForm((current) => ({ ...current, approvedBy: event.target.value }))
                  }
                  required
                />
              </label>
              <div className="actions inventory-form-actions">
                <button
                  type="submit"
                  className={!isAdjustmentQuantityValid ? "pseudo-disabled-button" : undefined}
                  aria-disabled={!isAdjustmentQuantityValid}
                  disabled={isSubmittingAdjustment}
                >
                  {isSubmittingAdjustment ? "Submitting..." : "Submit Adjustment"}
                </button>
              </div>
            </form>
          ) : (
            <p className="empty-state">Select an inventory row to prepare an adjustment.</p>
          )}
          {adjustmentMessage ? <p className="feedback success-text">{adjustmentMessage}</p> : null}
          {adjustmentError ? <p className="feedback error-text">Error: {adjustmentError}</p> : null}
        </article>

      </aside>

      <article className="panel-card inventory-ledger-panel">
        <div className="card-heading-row">
          <div className="card-heading-row inventory-ledger-title-row">
            <h3>Inventory Transaction Ledger</h3>
            <span className="inline-badge inventory-ledger-sku-badge">{selectedItem?.sku || "Waiting"}</span>
          </div>
          <span className="inline-badge">{ledgerEntries.length} records</span>
        </div>
        <p className="card-copy compact">
          Reads from <code>{INVENTORY_LEDGER_ENDPOINT}?sku=SELECTED_SKU&limit=100</code>.
        </p>
        {ledgerError ? <p className="feedback error-text">Error: {ledgerError}</p> : null}
        {ledgerEntries.length > 0 ? (
          <>
            <InventoryLedgerTable entries={paginatedLedgerEntries} />
            {ledgerEntries.length > LEDGER_PAGE_SIZE ? (
              <div className="inventory-ledger-pagination">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setCurrentLedgerPage((page) => Math.max(1, page - 1))}
                  disabled={currentLedgerPage === 1}
                >
                  Previous
                </button>
                <span className="inventory-ledger-page-indicator">
                  Page {currentLedgerPage} of {totalLedgerPages}
                </span>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setCurrentLedgerPage((page) => Math.min(totalLedgerPages, page + 1))}
                  disabled={currentLedgerPage === totalLedgerPages}
                >
                  Next
                </button>
              </div>
            ) : null}
          </>
        ) : ledgerError ? null : (
          <p className="empty-state">
            {isLedgerLoading
              ? "Loading transaction history..."
              : "No transaction history was returned for the selected SKU."}
          </p>
        )}
      </article>
    </section>
  );
}

function InventoryDataTable({ items, selectedItem, onSelectItem }) {
  return (
    <div className="inventory-table-shell">
      <div className="table-row table-head inventory-table-row">
        <span>SKU</span>
        <span>Product</span>
        <span>Warehouse</span>
        <span>Location</span>
        <span>Available</span>
        <span>Status</span>
      </div>
      <div className="inventory-table-body">
        {items.map((item, index) => {
          const key = getInventoryKey(item, index);
          const selected = getInventoryKey(selectedItem, 0) === key;

          return (
            <button
              key={key}
              type="button"
              className={selected ? "inventory-table-row inventory-row-button active" : "inventory-table-row inventory-row-button"}
              onClick={() => onSelectItem(key)}
            >
              <span className="cell-strong">{item.sku || "Unavailable"}</span>
              <span>{item.product_name || "Unavailable"}</span>
              <span>{item.warehouse_code || "Unavailable"}</span>
              <span>{item.location_code || "Unavailable"}</span>
              <span>{formatSignedQuantity(item.available_qty, false)}</span>
              <span>{item.status || "Unknown"}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function InventoryLedgerTable({ entries }) {
  return (
    <div className="inventory-ledger-shell">
      <div className="inventory-ledger-row inventory-ledger-head">
        <span>Date</span>
        <span>Time</span>
        <span>Type</span>
        <span>Qty</span>
        <span>Ending Qty</span>
        <span>Ref No</span>
        <span>Reason</span>
      </div>
      <div className="inventory-ledger-body">
        {entries.map((entry, index) => (
          <div key={getLedgerKey(entry, index)} className="inventory-ledger-row">
            <span>{formatLedgerDate(entry)}</span>
            <span>{formatLedgerTime(entry)}</span>
            <span>{getLedgerField(entry, ["type", "transaction_type", "movement_type"]) || "Unavailable"}</span>
            <span>{formatSignedQuantity(getLedgerField(entry, ["qty", "quantity", "delta_qty", "change_qty"]))}</span>
            <span>{formatSignedQuantity(getLedgerField(entry, ["ending_qty", "ending_quantity", "balance_qty", "on_hand_qty"]), false)}</span>
            <span>{getLedgerField(entry, ["ref_no", "reference_no", "reference", "refNo"]) || "Unavailable"}</span>
            <span>{getLedgerField(entry, ["reason", "memo", "note"]) || "Unavailable"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function countByStatus(items, status) {
  return items.filter((item) => String(item.status || "").toUpperCase() === status).length;
}

function getInventoryKey(item, index = 0) {
  if (!item || typeof item !== "object") {
    return `inventory-${index}`;
  }

  return item.id || item.sku || `inventory-${index}`;
}

function getLedgerKey(entry, index = 0) {
  return (
    getLedgerField(entry, ["id", "transaction_id", "ledger_id", "ref_no", "reference_no"]) ||
    `ledger-${index}`
  );
}

function getLedgerField(record, keys) {
  if (!record || typeof record !== "object") {
    return undefined;
  }

  for (const key of keys) {
    const value = record[key];

    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }

  return undefined;
}

function formatSignedQuantity(value, includeSign = true) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return "0";
  }

  if (!includeSign) {
    return String(numericValue);
  }

  if (numericValue > 0) {
    return `+${numericValue}`;
  }

  return String(numericValue);
}

function formatLedgerDate(entry) {
  const rawValue = getLedgerField(entry, ["time", "transaction_time", "created_at", "createdAt", "timestamp"]);

  if (!rawValue) {
    return "Unavailable";
  }

  const parsedDate = new Date(rawValue);

  if (Number.isNaN(parsedDate.getTime())) {
    return String(rawValue);
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "2-digit",
  }).format(parsedDate).replace(/\//g, "-");
}

function formatLedgerTime(entry) {
  const rawValue = getLedgerField(entry, ["time", "transaction_time", "created_at", "createdAt", "timestamp"]);

  if (!rawValue) {
    return "Unavailable";
  }

  const parsedDate = new Date(rawValue);

  if (Number.isNaN(parsedDate.getTime())) {
    return String(rawValue);
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(parsedDate);
}

export default InventoryPage;






























