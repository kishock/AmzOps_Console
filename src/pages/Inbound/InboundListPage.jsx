import { useEffect, useMemo, useRef, useState } from "react";
import {
  completeInbound,
  createInbound,
  confirmInboundChecking,
  deleteInbound,
  fetchInboundDetail,
  fetchInboundList,
  INBOUND_LIST_ENDPOINT,
  submitInboundChecking,
  submitInboundPutaway,
  updateInbound,
  updateInboundStatus,
} from "../../api/inbound";

const FILTERS = ["ALL", "DRAFT", "SCHEDULED", "ARRIVED", "CHECKING", "PUTAWAY", "COMPLETED"];
const LABELS = {
  DRAFT: "Draft",
  SCHEDULED: "Scheduled",
  ARRIVED: "Arrived",
  CHECKING: "Checking",
  PUTAWAY: "Putaway",
  COMPLETED: "Completed",
  EXCEPTION: "Exception",
  CANCELLED: "Cancelled",
};
const WORKFLOW_STEPS = ["DRAFT", "SCHEDULED", "ARRIVED", "CHECKING", "PUTAWAY", "COMPLETED"];
const ACTIONS = {
  SCHEDULED: { label: "Mark as Arrived", next: "ARRIVED" },
  ARRIVED: { label: "Start Checking", next: "CHECKING" },
  CHECKING: { label: "Confirm Checking", next: "PUTAWAY" },
  PUTAWAY: { label: "Complete Inbound", next: "COMPLETED" },
};
const PUTAWAY_LOCATIONS = ["A-01-01", "A-01-02", "B-02-01", "B-02-02"];
const EMPTY_FORM = {
  inboundNo: "",
  supplier: "",
  expectedDate: "2026-03-14",
  warehouse: "Main Warehouse",
  referenceNo: "",
  memo: "",
  items: [
    { sku: "SKU-001", productName: "Phone Case", expectedQty: 50, uom: "EA" },
    { sku: "SKU-002", productName: "Charger", expectedQty: 30, uom: "EA" },
    { sku: "SKU-003", productName: "Cable", expectedQty: 40, uom: "EA" },
  ],
};

function InboundListPage() {
  const [inbounds, setInbounds] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [supplier, setSupplier] = useState("ALL");
  const [expectedDate, setExpectedDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [isEditingDraft, setIsEditingDraft] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [source, setSource] = useState("");
  const [page, setPage] = useState(1);
  const [checkingSaved, setCheckingSaved] = useState(false);
  const [putawaySaved, setPutawaySaved] = useState(false);
  const lastPopupRef = useRef({ message: "", error: "" });
  const [form, setForm] = useState(() => ({ ...EMPTY_FORM, inboundNo: nextInboundNo([]), referenceNo: "" }));

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      try {
        const { inbounds: rows } = await fetchInboundList();
        if (!active) {
          return;
        }
        const normalized = rows.map(normalizeInbound);
        setInbounds(normalized);
        setSelectedId(normalized[0]?.id || "");
        setSource(INBOUND_LIST_ENDPOINT);
      } catch (requestError) {
        if (!active) {
          return;
        }
        setInbounds([]);
        setSelectedId("");
        setSource(INBOUND_LIST_ENDPOINT);
        setError(requestError instanceof Error ? requestError.message : "Failed to load inbound list.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadDetail() {
      if (!selectedId || createOpen) {
        return;
      }

      try {
        const result = await fetchInboundDetail(selectedId);
        if (!active) {
          return;
        }
        const detail = normalizeInbound(result.data?.inbound || result.data?.data || result.data || {}, 0);
        setInbounds((rows) => rows.map((row) => row.id === selectedId ? {
          ...row,
          ...detail,
          skuCount: Number(detail.skuCount) || Number(row.skuCount) || 0,
          totalQty: Number(detail.totalQty) || Number(row.totalQty) || 0,
        } : row));
      } catch (requestError) {
        if (!active) {
          return;
        }
        setError(requestError instanceof Error ? requestError.message : "Failed to load inbound detail.");
      }
    }

    loadDetail();

    return () => {
      active = false;
    };
  }, [createOpen, selectedId]);

  const suppliers = useMemo(() => [...new Set(inbounds.map((row) => row.supplier))].sort(), [inbounds]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return inbounds.filter((row) => {
      return (filter === "ALL" || row.status === filter)
        && (supplier === "ALL" || row.supplier === supplier)
        && (!expectedDate || row.expectedDate === expectedDate)
        && (!q || row.inboundNo.toLowerCase().includes(q) || row.supplier.toLowerCase().includes(q) || row.items.some((item) => item.sku.toLowerCase().includes(q)));
    });
  }, [expectedDate, filter, inbounds, search, supplier]);

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const selected = filtered.find((row) => row.id === selectedId) || inbounds.find((row) => row.id === selectedId) || filtered[0] || inbounds[0] || null;
  const isDraftSelected = selected?.status === "DRAFT";
  const action = selected ? ACTIONS[selected.status] : null;
  const summary = selected ? summarize(selected.items) : { expected: 0, received: 0, damaged: 0, variance: 0 };
  const putaway = selected ? buildPutaway(selected) : [];
  const canConfirmChecking = selected?.status === "CHECKING" && checkingSaved;
  const canSavePutaway = selected?.status === "PUTAWAY" && putaway.length > 0 && putaway.every((line) => Number(line.putawayQty) > 0 && String(line.location || "").trim());
  const canCompleteInbound = selected?.status === "PUTAWAY" && putawaySaved;

  useEffect(() => {
    setPage(1);
  }, [expectedDate, filter, search, supplier]);

  useEffect(() => {
    setCheckingSaved(false);
    setPutawaySaved(false);
  }, [selectedId]);

  useEffect(() => {
    if (message && message !== lastPopupRef.current.message) {
      window.alert(message);
      lastPopupRef.current.message = message;
    }

    if (!message) {
      lastPopupRef.current.message = "";
    }
  }, [message]);

  useEffect(() => {
    if (error && error !== lastPopupRef.current.error) {
      window.alert(`Error: ${error}`);
      lastPopupRef.current.error = error;
    }

    if (!error) {
      lastPopupRef.current.error = "";
    }
  }, [error]);

  function patchSelected(updater) {
    setInbounds((rows) => rows.map((row) => row.id === selectedId ? updater(row) : row));
  }

  function createItemChange(index, field, value) {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: field === "expectedQty" ? Number(value) || 0 : value } : item),
    }));
  }

  function addDraftItem() {
    if (!isDraftSelected) return;
    patchSelected((row) => ({
      ...row,
      items: [...row.items, { id: `SKU-${Date.now()}`, sku: "", productName: "", expectedQty: 0, receivedQty: 0, damagedQty: 0, uom: "EA" }],
    }));
  }

  function updateDraftItem(itemId, field, value) {
    if (!isDraftSelected) return;
    patchSelected((row) => ({
      ...row,
      items: row.items.map((item) => item.id === itemId ? { ...item, [field]: field === "expectedQty" ? Number(value) || 0 : value } : item),
    }));
  }

  function removeDraftItem(itemId) {
    if (!isDraftSelected) return;
    patchSelected((row) => ({
      ...row,
      items: row.items.filter((item) => item.id !== itemId),
    }));
  }

  async function saveInbound(status) {
    const payload = buildInboundPayload({
      inboundNo: form.inboundNo,
      supplier: form.supplier,
      expectedDate: form.expectedDate,
      warehouse: form.warehouse,
      referenceNo: form.referenceNo,
      memo: form.memo,
      status,
      items: form.items,
    });
    setMessage("");
    setError("");

    try {
      const result = await createInbound(payload);
      const created = normalizeInbound(result.data?.inbound || result.data?.data || result.data || payload);
      setInbounds((rows) => [created, ...rows]);
      setSelectedId(created.id);
      setCreateOpen(false);
      setForm({ ...EMPTY_FORM, inboundNo: nextInboundNo([...inbounds, created]), expectedDate: "2026-03-14", warehouse: "Main Warehouse", referenceNo: "" });
      setMessage(status === "DRAFT" ? `Inbound ${created.inboundNo} saved as Draft.` : `Inbound ${created.inboundNo} confirmed and moved to Scheduled.`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to create inbound.");
    }
  }

  async function saveDraftChanges(nextStatus = "DRAFT") {
    if (!selected || selected.status !== "DRAFT") return;
    setMessage("");
    setError("");
    try {
      const payload = buildInboundPayload({ ...selected, status: nextStatus, items: selected.items });
      const result = await updateInbound(selected.id, payload);
      const updated = normalizeInbound(result.data?.inbound || result.data?.data || result.data || payload);
      patchSelected(() => updated);
      setIsEditingDraft(false);
      setMessage(nextStatus === "SCHEDULED" ? `Inbound ${updated.inboundNo} confirmed and moved to Scheduled.` : `Inbound ${updated.inboundNo} draft updated.`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to update draft inbound.");
    }
  }

  async function removeDraft() {
    if (!selected || selected.status !== "DRAFT") return;
    setMessage("");
    setError("");
    try {
      await deleteInbound(selected.id);
      const nextRows = inbounds.filter((row) => row.id !== selected.id);
      setInbounds(nextRows);
      setSelectedId(nextRows[0]?.id || "");
      setIsEditingDraft(false);
      setMessage(`Inbound ${selected.inboundNo} draft deleted.`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to delete draft inbound.");
    }
  }

  async function advanceStatus() {
    if (!selected || !action) return;
    setMessage("");
    setError("");
    try {
      await updateInboundStatus(selected.id, action.next);
      patchSelected((row) => ({ ...row, status: action.next }));
      setMessage(`${selected.inboundNo} moved to ${LABELS[action.next]}.`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to update inbound status.");
    }
  }

  async function saveChecking(confirmStep) {
    if (!selected) return;
    const payload = {
      items: selected.items.map((item) => ({
        item_id: item.itemId,
        received_qty: item.receivedQty,
        damaged_qty: item.damagedQty,
      })),
    };
    setMessage("");
    setError("");
    try {
      await submitInboundChecking(selected.id, payload);
      if (confirmStep) {
        await confirmInboundChecking(selected.id);
      }
      patchSelected((row) => ({ ...row, status: confirmStep ? "PUTAWAY" : row.status }));
      setCheckingSaved(!confirmStep);
      setMessage(confirmStep ? `${selected.inboundNo} checking confirmed and moved to Putaway.` : `${selected.inboundNo} checking progress saved.`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to save checking results.");
    }
  }
  async function savePutaway(complete) {
    if (!selected) return;
    const payload = {
      items: putaway.map((line) => ({
        item_id: line.itemId,
        location: line.location,
        putaway_qty: line.putawayQty,
      })),
    };
    setMessage("");
    setError("");
    try {
      await submitInboundPutaway(selected.id, payload);
      if (complete) {
        await completeInbound(selected.id);
      }
      patchSelected((row) => ({ ...row, status: complete ? "COMPLETED" : row.status, putawayLines: putaway }));
      setPutawaySaved(!complete);
      setMessage(complete ? `${selected.inboundNo} completed. Inventory will reflect received stock after putaway.` : `${selected.inboundNo} putaway progress saved.`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to save putaway progress.");
    }
  }
  return (
    <section className="content-grid">
      <article className="panel-card">
        <div className="card-heading-row">
          <div>
            <h3>Inbound Receiving</h3>
            <p className="card-copy compact">Manage draft inbound plans, receiving checks, and putaway so the Inbound to Inventory flow is visible in one workspace.</p>
          </div>
          <span className="inline-badge">{filtered.length} inbound orders</span>
        </div>
        <p className="card-copy compact">Reads from <code>{source || INBOUND_LIST_ENDPOINT}</code>.</p>
        <div className="inbound-toolbar">
          <div className="inventory-search inbound-search"><input type="search" placeholder="Search Inbound No" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
          <button type="button" onClick={() => setCreateOpen((current) => !current)}>{createOpen ? "Close Create Inbound" : "+ Create Inbound"}</button>
        </div>

        {createOpen ? (
          <section className="inbound-create-shell">
            <div className="card-heading-row"><h4>Create Inbound</h4><span className="inline-badge warning">Draft to Scheduled</span></div>
            <div className="inbound-create-grid">
              <label className="inventory-field"><span>Inbound No</span><input value={form.inboundNo} onChange={(event) => setForm((current) => ({ ...current, inboundNo: event.target.value }))} /></label>
              <label className="inventory-field"><span>Supplier</span><input value={form.supplier} onChange={(event) => setForm((current) => ({ ...current, supplier: event.target.value }))} /></label>
              <label className="inventory-field"><span>Expected Date</span><input type="date" value={form.expectedDate} onChange={(event) => setForm((current) => ({ ...current, expectedDate: event.target.value }))} /></label>
              <label className="inventory-field"><span>Warehouse</span><input value={form.warehouse} onChange={(event) => setForm((current) => ({ ...current, warehouse: event.target.value }))} /></label>
              <label className="inventory-field"><span>Reference No</span><input value={form.referenceNo} onChange={(event) => setForm((current) => ({ ...current, referenceNo: event.target.value }))} /></label>
            </div>
            <label className="inventory-field"><span>Memo</span><textarea className="inbound-textarea" value={form.memo} onChange={(event) => setForm((current) => ({ ...current, memo: event.target.value }))} /></label>
            <div className="inbound-items-shell">
              <div className="inbound-items-head inbound-create-item-row"><span>SKU</span><span>Product Name</span><span>Expected Qty</span><span>UOM</span></div>
              {form.items.map((item, index) => (
                <div key={`item-${index}`} className="inbound-create-item-row">
                  <input value={item.sku} onChange={(event) => createItemChange(index, "sku", event.target.value)} />
                  <input value={item.productName} onChange={(event) => createItemChange(index, "productName", event.target.value)} />
                  <input type="number" min="0" value={item.expectedQty} onChange={(event) => createItemChange(index, "expectedQty", event.target.value)} />
                  <input value={item.uom} onChange={(event) => createItemChange(index, "uom", event.target.value)} />
                </div>
              ))}
            </div>
            <div className="actions">
              <button type="button" className="secondary-button" onClick={() => setForm((current) => ({ ...current, items: [...current.items, { sku: "", productName: "", expectedQty: 0, uom: "EA" }] }))}>Add Item</button>
              <button type="button" className="secondary-button" onClick={() => saveInbound("DRAFT")}>Save Draft</button>
              <button type="button" onClick={() => saveInbound("SCHEDULED")}>Confirm Inbound</button>
            </div>
          </section>
        ) : (
          <>
            <div className="inbound-filter-row">
              <div className="segmented-control" role="tablist" aria-label="Inbound status filters">{FILTERS.map((name) => <button key={name} type="button" className={filter === name ? "tab-button active" : "tab-button"} onClick={() => setFilter(name)}>{name === "ALL" ? "All" : LABELS[name]}</button>)}</div>
              <div className="inbound-select-row">
                <label className="inventory-field inbound-filter-field"><span>Supplier</span><select value={supplier} onChange={(event) => setSupplier(event.target.value)}><option value="ALL">All</option>{suppliers.map((name) => <option key={name} value={name}>{name}</option>)}</select></label>
                <label className="inventory-field inbound-filter-field"><span>Expected Date</span><input type="date" value={expectedDate} onChange={(event) => setExpectedDate(event.target.value)} /></label>
              </div>
            </div>

            {message ? <p className="feedback success-text">{message}</p> : null}
            {error ? <p className="feedback error-text">Error: {error}</p> : null}

            <div className="inbound-layout">
              <div className="panel-card inbound-list-panel">
                <div className="card-heading-row"><h4>Inbound List</h4><span className="inline-badge">{filtered.length} visible</span></div>
                <div className="inventory-table-shell inbound-table-shell">
                  <div className="inventory-table-row inventory-ledger-head inbound-table-row"><span>Inbound No</span><span>Supplier</span><span>Expected Date</span><span>Status</span><span>SKU Count</span><span>Qty</span></div>
                  <div className="inventory-table-body inbound-table-body">
                    {pagedRows.map((row) => (
                      <button key={row.id} type="button" className={selected?.id === row.id ? "inventory-row-button active" : "inventory-row-button"} onClick={() => { setSelectedId(row.id); setIsEditingDraft(false); setMessage(""); setError(""); }}>
                        <div className="inventory-table-row inbound-table-row"><span className="cell-strong">{row.inboundNo}</span><span>{row.supplier}</span><span>{dateText(row.expectedDate)}</span><span><span className={`inbound-status-badge ${row.status.toLowerCase()}`}>{LABELS[row.status] || row.status}</span></span><span>{getInboundSkuCount(row)}</span><span>{getInboundTotalQty(row)}</span></div>
                      </button>
                    ))}
                  </div>
                </div>
                {!loading && filtered.length === 0 ? <p className="empty-state">No inbound records matched the current filter.</p> : null}
                {filtered.length > pageSize ? <div className="inventory-ledger-pagination"><button type="button" className="secondary-button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={currentPage === 1}>Previous</button><span className="inventory-ledger-page-indicator">Page {currentPage} of {totalPages}</span><button type="button" className="secondary-button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={currentPage === totalPages}>Next</button></div> : null}
              </div>

              <div className="detail-column">
                {!selected ? <article className="panel-card"><h4>Inbound Detail</h4><p className="empty-state">Select an inbound record to review receiving and putaway actions.</p></article> : (
                  <>
                    <article className="panel-card">
                      <div className="card-heading-row"><div><h4>Inbound Detail</h4><p className="inbound-no-highlight">Inbound No : {selected.inboundNo}</p></div><span className={`inbound-status-badge ${selected.status.toLowerCase()}`}>{LABELS[selected.status] || selected.status}</span></div>
                      <div className="detail-grid">
                        <label className="detail-item"><span>Supplier</span>{isDraftSelected && isEditingDraft ? <input value={selected.supplier} onChange={(event) => patchSelected((row) => ({ ...row, supplier: event.target.value }))} /> : <strong>{selected.supplier}</strong>}</label>
                        <label className="detail-item"><span>Warehouse</span>{isDraftSelected && isEditingDraft ? <input value={selected.warehouse} onChange={(event) => patchSelected((row) => ({ ...row, warehouse: event.target.value }))} /> : <strong>{selected.warehouse}</strong>}</label>
                        <label className="detail-item"><span>Expected Date</span>{isDraftSelected && isEditingDraft ? <input type="date" value={selected.expectedDate} onChange={(event) => patchSelected((row) => ({ ...row, expectedDate: event.target.value }))} /> : <strong>{dateText(selected.expectedDate)}</strong>}</label>
                        <label className="detail-item"><span>Reference No</span>{isDraftSelected && isEditingDraft ? <input value={selected.referenceNo} onChange={(event) => patchSelected((row) => ({ ...row, referenceNo: event.target.value }))} /> : <strong>{selected.referenceNo || "Unavailable"}</strong>}</label>
                      </div>
                                            {selected.status === "PUTAWAY" ? (
                        <div className="inbound-items-shell">
                          <div className="inbound-items-head inbound-putaway-row"><span>SKU</span><span>Product</span><span>Received Qty</span><span>Putaway Qty</span><span>Location</span><span>Remaining</span><span>Action</span></div>
                          {putaway.map((line) => (
                            <div key={line.id} className="inbound-putaway-row">
                              <span className="cell-strong">{line.sku}</span>
                              <span>{selected.items.find((item) => item.sku === line.sku)?.productName || "-"}</span>
                              <span>{line.receivedQty}</span>
                              <input type="number" min="0" value={line.putawayQty} onChange={(event) => { setPutawaySaved(false); patchSelected((row) => ({ ...row, putawayLines: buildPutaway(row).map((current) => current.id === line.id ? { ...current, putawayQty: Number(event.target.value) || 0 } : current) })); }} />
                              <select value={line.location} onChange={(event) => { setPutawaySaved(false); patchSelected((row) => ({ ...row, putawayLines: buildPutaway(row).map((current) => current.id === line.id ? { ...current, location: event.target.value } : current) })); }}><option value="">Select location</option>{PUTAWAY_LOCATIONS.map((location) => <option key={location} value={location}>{location}</option>)}</select>
                              <span>{Math.max(line.receivedQty - putaway.filter((current) => current.sku === line.sku).reduce((sum, current) => sum + current.putawayQty, 0), 0)}</span>
                              <button type="button" className="secondary-button inbound-inline-button" onClick={() => { setPutawaySaved(false); patchSelected((row) => ({ ...row, putawayLines: [...buildPutaway(row), { itemId: line.itemId, id: `${line.sku}-${Date.now()}`, sku: line.sku, receivedQty: line.receivedQty, putawayQty: 0, location: "" }] })); }}>Split</button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="inbound-items-shell inbound-detail-table">
                          <div className="inbound-items-head inbound-detail-item-row"><span>SKU</span><span>Product Name</span><span>Expected</span><span>UOM</span><span>Received</span><span>Damaged</span><span>{isDraftSelected && isEditingDraft ? "Action" : ""}</span></div>
                          {selected.items.map((item) => (
                            <div key={item.id} className="inbound-detail-item-row">
                              <span className="cell-strong">{isDraftSelected && isEditingDraft ? <input value={item.sku} onChange={(event) => updateDraftItem(item.id, "sku", event.target.value)} /> : item.sku}</span>
                              {isDraftSelected && isEditingDraft ? <input value={item.productName} onChange={(event) => updateDraftItem(item.id, "productName", event.target.value)} /> : <span>{item.productName}</span>}
                              {isDraftSelected && isEditingDraft ? <input type="number" min="0" value={item.expectedQty} onChange={(event) => updateDraftItem(item.id, "expectedQty", event.target.value)} /> : <span>{item.expectedQty}</span>}
                              {isDraftSelected && isEditingDraft ? <input value={item.uom} onChange={(event) => updateDraftItem(item.id, "uom", event.target.value)} /> : <span>{item.uom}</span>}
                              {selected.status === "CHECKING" ? <input type="number" min="0" value={item.receivedQty} onChange={(event) => { setCheckingSaved(false); patchSelected((row) => ({ ...row, items: row.items.map((current) => current.id === item.id ? { ...current, receivedQty: Number(event.target.value) || 0 } : current) })); }} /> : <span>{item.receivedQty}</span>}
                              {selected.status === "CHECKING" ? <input type="number" min="0" value={item.damagedQty} onChange={(event) => { setCheckingSaved(false); patchSelected((row) => ({ ...row, items: row.items.map((current) => current.id === item.id ? { ...current, damagedQty: Number(event.target.value) || 0 } : current) })); }} /> : <span>{item.damagedQty}</span>}
                              <span>{isDraftSelected && isEditingDraft ? <button type="button" className="danger-button inbound-inline-button" onClick={() => removeDraftItem(item.id)}>Delete</button> : null}</span>
                            </div>
                          ))}
                          {selected.status === "CHECKING" ? (
                            <div className="summary-metrics inbound-summary-grid">
                              <div><span>Expected</span><strong>{summary.expected}</strong></div>
                              <div><span>Received</span><strong>{summary.received}</strong></div>
                              <div><span>Damaged</span><strong>{summary.damaged}</strong></div>
                              <div><span>Variance</span><strong>{summary.variance}</strong></div>
                            </div>
                          ) : null}
                          {isDraftSelected && isEditingDraft ? <div className="actions"><button type="button" className="secondary-button" onClick={addDraftItem}>Add Item</button></div> : null}
                        </div>
                      )}
                      <div className="inbound-progress-shell"><div className="card-heading-row"><h5>Workflow Progress Status</h5><span className="inline-badge">{progress(selected.status)}%</span></div><div className="warehouse-status-progress inbound-progress-bar" aria-hidden="true"><span className="warehouse-status-progress-fill" style={{ width: `${progress(selected.status)}%` }} /></div><div className="inbound-workflow-steps">{WORKFLOW_STEPS.map((step) => <span key={step} className={selected.status === step ? `inbound-status-badge ${step.toLowerCase()} active` : "inbound-status-badge inactive"}>{LABELS[step]}</span>)}</div>{selected.status === "CHECKING" ? <div className="actions inbound-checking-actions"><button type="button" className="secondary-button" onClick={() => saveChecking(false)}>Save Checking</button><button type="button" onClick={() => saveChecking(true)} disabled={!canConfirmChecking}>Confirm Checking</button></div> : null}{selected.status === "PUTAWAY" ? <div className="actions inbound-checking-actions"><button type="button" className="secondary-button" onClick={() => savePutaway(false)} disabled={!canSavePutaway}>Save Putaway</button><button type="button" onClick={() => savePutaway(true)} disabled={!canCompleteInbound}>Complete Inbound</button></div> : null}</div>
                      <div className="actions">{isDraftSelected ? <><button type="button" className="secondary-button" onClick={() => setIsEditingDraft((current) => !current)}>{isEditingDraft ? "Cancel Edit" : "Edit Draft"}</button><button type="button" onClick={() => saveDraftChanges("SCHEDULED")}>Confirm Inbound</button><button type="button" className="danger-button" onClick={removeDraft}>Delete Draft</button>{isEditingDraft ? <button type="button" className="secondary-button" onClick={() => saveDraftChanges("DRAFT")}>Save Draft Changes</button> : null}</> : (action && selected?.status !== "CHECKING" && selected?.status !== "PUTAWAY") ? <button type="button" onClick={advanceStatus}>{action.label}</button> : null}</div>
                    </article>
                    
                    
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </article>
    </section>
  );
}

function buildInboundPayload(source) {
  return {
    inbound_no: source.inboundNo,
    supplier: source.supplier,
    expected_date: source.expectedDate,
    warehouse: source.warehouse,
    reference_no: source.referenceNo,
    memo: source.memo,
    status: source.status,
    items: source.items.map((item) => ({ sku: item.sku, product_name: item.productName, expected_qty: Number(item.expectedQty) || 0, uom: item.uom || "EA" })),
  };
}

function normalizeInbound(record, index = 0) {
  const items = record.items || record.lines || record.inbound_items || record.inboundItems || record.details || [];
  const summary = record.summary || record.totals || record.aggregate || {};

  const apiId = record.id ?? record.inbound_id ?? record.inboundId ?? record.pk ?? record.inbound_pk;

  return {
    id: String(apiId || record.inbound_no || record.inboundNo || `INB-${1000 + index}`),
    inboundNo: String(record.inbound_no || record.inboundNo || apiId || `INB-${1000 + index}`),
    supplier: String(record.supplier || record.vendor || "Unknown Supplier"),
    expectedDate: String(record.expected_date || record.expectedDate || ""),
    warehouse: String(record.warehouse || "Main Warehouse"),
    referenceNo: String(record.reference_no || record.referenceNo || ""),
    memo: String(record.memo || ""),
    status: String(record.status || "DRAFT").toUpperCase(),
    skuCount: readNumericValue([
      record.sku_count,
      record.skuCount,
      record.item_count,
      record.itemCount,
      record.total_skus,
      record.totalSkus,
      summary.sku_count,
      summary.skuCount,
      summary.item_count,
      summary.itemCount,
      summary.total_skus,
      summary.totalSkus,
    ]),
    totalQty: readNumericValue([
      record.total_qty,
      record.totalQty,
      record.qty,
      record.quantity,
      record.expected_qty_total,
      record.expectedQtyTotal,
      record.total_expected_qty,
      record.totalExpectedQty,
      record.expected_total_qty,
      record.expectedTotalQty,
      summary.total_qty,
      summary.totalQty,
      summary.qty,
      summary.quantity,
      summary.expected_qty_total,
      summary.expectedQtyTotal,
      summary.total_expected_qty,
      summary.totalExpectedQty,
    ]),
    items: items.map((item, itemIndex) => ({
      itemId: item.id ?? item.item_id ?? item.itemId ?? item.pk ?? null,
      id: `${item.sku || item.SKU || "SKU"}-${itemIndex}`,
      sku: String(item.sku || item.SKU || `SKU-${itemIndex + 1}`),
      productName: String(item.product_name || item.productName || item.name || "Unknown Product"),
      expectedQty: Number(item.expected_qty ?? item.expectedQty ?? item.qty ?? 0) || 0,
      receivedQty: Number(item.received_qty ?? item.receivedQty ?? 0) || 0,
      damagedQty: Number(item.damaged_qty ?? item.damagedQty ?? 0) || 0,
      uom: String(item.uom || "EA"),
    })),
    putawayLines: (record.putaway_lines || record.putawayLines || []).map((line, lineIndex) => ({
      itemId: line.item_id ?? line.itemId ?? null,
      id: String(line.id || `${line.sku || "SKU"}-${lineIndex}`),
      sku: String(line.sku || `SKU-${lineIndex + 1}`),
      receivedQty: Number(line.received_qty ?? line.receivedQty ?? 0) || 0,
      putawayQty: Number(line.putaway_qty ?? line.putawayQty ?? 0) || 0,
      location: String(line.location || ""),
    })),
  };
}

function getInboundSkuCount(row) {
  return Number(row.skuCount) || row.items.length;
}

function getInboundTotalQty(row) {
  return Number(row.totalQty) || row.items.reduce((sum, item) => sum + (Number(item.expectedQty) || 0), 0);
}

function summarize(items) {
  return items.reduce((sum, item) => ({ expected: sum.expected + item.expectedQty, received: sum.received + item.receivedQty, damaged: sum.damaged + item.damagedQty, variance: sum.variance + item.receivedQty - item.expectedQty }), { expected: 0, received: 0, damaged: 0, variance: 0 });
}

function buildPutaway(row) {
  if (row.putawayLines && row.putawayLines.length > 0) return row.putawayLines;
  return row.items.map((item, index) => ({
    itemId: item.itemId,
    id: `${item.sku}-${index}`,
    sku: item.sku,
    receivedQty: item.receivedQty,
    putawayQty: item.receivedQty,
    location: "",
  }));
}

function nextInboundNo(rows) {
  const max = rows.reduce((value, row) => Math.max(value, Number(String(row.inboundNo || row.inbound_no || "INB-1000").match(/INB-(\d+)/i)?.[1] || 1000)), 1000);
  return `INB-${String(max + 1).padStart(4, "0")}`;
}

function progress(status) {
  return { DRAFT: 8, SCHEDULED: 24, ARRIVED: 42, CHECKING: 64, PUTAWAY: 84, COMPLETED: 100 }[status] || 0;
}

function dateText(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value || "Unavailable") : new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

function readNumericValue(values) {
  for (const value of values) {
    if (value === null || value === undefined || value === "") {
      continue;
    }
    const normalized = typeof value === "string" ? value.replace(/,/g, "").trim() : value;
    const parsed = Number(normalized);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return 0;
}

export default InboundListPage;
































