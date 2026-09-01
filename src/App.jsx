import { useState, useEffect, useCallback, useRef } from "react";
import { LogOut, Search, Plus, Package, ArrowDownToLine, ArrowUpFromLine, ClipboardList, LayoutDashboard, ScanLine, RefreshCw, AlertCircle, CheckCircle2, ListTree, UploadCloud, ClipboardCheck, ChevronLeft, ChevronRight } from "lucide-react";
import * as XLSX from "xlsx";

const SUPABASE_URL = "https://zaakpcdkxdvpfribryvt.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InphYWtwY2RreGR2cGZyaWJyeXZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxODMxMTIsImV4cCI6MjEwMzc1OTExMn0.vwxS6XgPwAu_IhnMeiF_a7XaLhsR5md_qM4jAKMIMxY";

function useSupabase(accessToken) {
  const rest = useCallback(async (path, opts = {}) => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      ...opts,
      headers: {
        apikey: ANON_KEY,
        Authorization: `Bearer ${accessToken || ANON_KEY}`,
        "Content-Type": "application/json",
        Prefer: opts.prefer || "return=representation",
        ...(opts.headers || {}),
      },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `Request failed (${res.status})`);
    }
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }, [accessToken]);

  const rpc = useCallback(async (fn, params) => {
    return rest(`rpc/${fn}`, { method: "POST", body: JSON.stringify(params) });
  }, [rest]);

  return { rest, rpc };
}

function Banner({ error, success, onClear }) {
  if (!error && !success) return null;
  return (
    <div className={`flex items-start gap-2 rounded-md px-3 py-2 text-sm mb-4 ${error ? "bg-red-50 text-red-800 border border-red-200" : "bg-emerald-50 text-emerald-800 border border-emerald-200"}`}>
      {error ? <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> : <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />}
      <span className="flex-1">{error || success}</span>
      <button onClick={onClear} className="text-xs opacity-60 hover:opacity-100">dismiss</button>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block mb-3">
      <span className="block text-xs font-medium text-slate-500 mb-1">{label}</span>
      {children}
    </label>
  );
}

const inputCls = "w-full border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600";
const btnPrimary = "bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium px-4 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed";
const btnSecondary = "bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium px-4 py-2 rounded-md border border-slate-300 disabled:opacity-50";
const card = "bg-white border border-slate-200 rounded-lg p-5";

function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (!email || !password) { setError("Enter email and password."); return; }
    setBusy(true); setError("");
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: { apikey: ANON_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error_description || data.msg || "Login failed.");
      onLogin(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-[520px] flex items-center justify-center bg-slate-100">
      <form onSubmit={submit} className="bg-white border border-slate-200 rounded-lg p-8 w-80">
        <div className="flex items-center gap-2 mb-6">
          <Package className="w-5 h-5 text-blue-700" />
          <h1 className="text-lg font-semibold text-slate-900">Warehouse inventory</h1>
        </div>
        <Banner error={error} onClear={() => setError("")} />
        <Field label="Email">
          <input className={inputCls} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@warehouse.com" />
        </Field>
        <Field label="Password">
          <input className={inputCls} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
        </Field>
        <button type="submit" disabled={busy} className={`${btnPrimary} w-full mt-2`}>
          {busy ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}

function SkuSearchInput({ rest, value, onChange, onSelect, placeholder }) {
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const timer = useRef(null);

  const handleChange = (v) => {
    onChange(v);
    clearTimeout(timer.current);
    if (!v || v.length < 2) { setResults([]); return; }
    timer.current = setTimeout(async () => {
      try {
        const rows = await rest(`skus?select=sku_code,style_code,category,color,size&sku_code=ilike.*${encodeURIComponent(v)}*&limit=15`);
        setResults(rows || []);
        setOpen(true);
      } catch { /* ignore search errors while typing */ }
    }, 250);
  };

  return (
    <div className="relative">
      <input
        className={inputCls}
        value={value}
        placeholder={placeholder || "Type or scan SKU code"}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => results.length && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && results.length > 0 && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-md shadow-md max-h-56 overflow-auto">
          {results.map((r) => (
            <button
              type="button"
              key={r.sku_code}
              className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 border-b border-slate-100 last:border-0"
              onMouseDown={() => { onSelect(r); setOpen(false); }}
            >
              <span className="font-medium text-slate-900">{r.sku_code}</span>
              <span className="text-slate-500 ml-2">{[r.style_code, r.color, r.size].filter(Boolean).join(" / ")}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Dashboard({ rest }) {
  const [query, setQuery] = useState("");
  const [sku, setSku] = useState(null);
  const [stock, setStock] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newSku, setNewSku] = useState({ sku_code: "", style_code: "", category: "", color: "", size: "", description: "" });

  const loadStock = async (skuRow) => {
    setSku(skuRow);
    setError("");
    try {
      const rows = await rest(`sku_stock?select=location_code,quantity&sku_code=eq.${encodeURIComponent(skuRow.sku_code)}&order=quantity.desc`);
      setStock(rows || []);
    } catch (err) {
      setError(err.message);
    }
  };

  const addSku = async (e) => {
    e.preventDefault();
    if (!newSku.sku_code) { setError("SKU code is required."); return; }
    setError(""); setSuccess("");
    try {
      await rest("skus", { method: "POST", body: JSON.stringify(newSku) });
      setSuccess(`SKU ${newSku.sku_code} added to master list.`);
      setNewSku({ sku_code: "", style_code: "", category: "", color: "", size: "", description: "" });
      setShowAdd(false);
    } catch (err) {
      setError(err.message);
    }
  };

  const totalQty = stock.reduce((s, r) => s + r.quantity, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-slate-900">SKU lookup</h2>
        <button onClick={() => setShowAdd((v) => !v)} className={btnSecondary}>
          <Plus className="w-4 h-4 inline -mt-0.5 mr-1" /> Add SKU
        </button>
      </div>

      <Banner error={error} success={success} onClear={() => { setError(""); setSuccess(""); }} />

      {showAdd && (
        <form onSubmit={addSku} className={`${card} mb-5 grid grid-cols-2 gap-x-4`}>
          <Field label="SKU code"><input className={inputCls} value={newSku.sku_code} onChange={(e) => setNewSku({ ...newSku, sku_code: e.target.value })} /></Field>
          <Field label="Style code"><input className={inputCls} value={newSku.style_code} onChange={(e) => setNewSku({ ...newSku, style_code: e.target.value })} /></Field>
          <Field label="Category"><input className={inputCls} value={newSku.category} onChange={(e) => setNewSku({ ...newSku, category: e.target.value })} /></Field>
          <Field label="Color"><input className={inputCls} value={newSku.color} onChange={(e) => setNewSku({ ...newSku, color: e.target.value })} /></Field>
          <Field label="Size"><input className={inputCls} value={newSku.size} onChange={(e) => setNewSku({ ...newSku, size: e.target.value })} /></Field>
          <Field label="Description"><input className={inputCls} value={newSku.description} onChange={(e) => setNewSku({ ...newSku, description: e.target.value })} /></Field>
          <div className="col-span-2"><button type="submit" className={btnPrimary}>Save SKU</button></div>
        </form>
      )}

      <div className={`${card} mb-5`}>
        <Field label="Search SKU code, style, color or size">
          <SkuSearchInput rest={rest} value={query} onChange={setQuery} onSelect={(r) => { setQuery(r.sku_code); loadStock(r); }} />
        </Field>
      </div>

      {sku && (
        <div className={card}>
          <div className="flex items-baseline justify-between mb-3">
            <div>
              <div className="text-lg font-semibold text-slate-900">{sku.sku_code}</div>
              <div className="text-sm text-slate-500">{[sku.style_code, sku.category, sku.color, sku.size].filter(Boolean).join(" · ")}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-500">Total stock</div>
              <div className="text-2xl font-semibold text-slate-900">{totalQty}</div>
            </div>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-200">
                <th className="py-1.5 font-medium">Location</th>
                <th className="py-1.5 font-medium text-right">Quantity</th>
              </tr>
            </thead>
            <tbody>
              {stock.length === 0 && (
                <tr><td colSpan={2} className="py-3 text-slate-400">No stock recorded for this SKU yet.</td></tr>
              )}
              {stock.map((r) => (
                <tr key={r.location_code} className="border-b border-slate-100 last:border-0">
                  <td className="py-1.5 font-mono text-slate-800">{r.location_code}</td>
                  <td className="py-1.5 text-right text-slate-900">{r.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Generic small-file (bulk request lists, inbound receipt lists) reader.
// Unlike the SKU master importer, these don't need the COMBINED LOCATIONS
// format — just a flat sheet with a handful of columns.
function readSheetRows(file) {
  return new Promise((resolve, reject) => {
    file.arrayBuffer().then((buf) => {
      try {
        const wb = XLSX.read(buf, { type: "array" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        resolve(XLSX.utils.sheet_to_json(sheet, { defval: null }));
      } catch (err) { reject(err); }
    }).catch(reject);
  });
}
function findColumn(sampleRow, candidates) {
  const keys = Object.keys(sampleRow || {});
  for (const c of candidates) {
    const hit = keys.find((k) => k.trim().toLowerCase() === c);
    if (hit) return hit;
  }
  return null;
}

async function bulkInsert(rest, table, records, batchSize, setProgress) {
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    await rest(table, { method: "POST", body: JSON.stringify(batch), prefer: "return=minimal" });
    if (setProgress) setProgress({ done: Math.min(i + batchSize, records.length), total: records.length });
  }
}

function BulkReplenishRequest({ rest, stores, onDone }) {
  const [fileName, setFileName] = useState("");
  const [parsed, setParsed] = useState([]);
  const [unmatchedStore, setUnmatchedStore] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [progress, setProgress] = useState(null);
  const [busy, setBusy] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(""); setSuccess(""); setParsed([]); setUnmatchedStore("");
    setFileName(file.name);
    try {
      const rows = await readSheetRows(file);
      if (!rows.length) { setError("That file has no rows."); return; }
      const skuKey = findColumn(rows[0], ["sku_code", "sku code", "sku"]);
      const qtyKey = findColumn(rows[0], ["quantity", "qty", "qty_requested", "qty requested"]);
      const storeKey = findColumn(rows[0], ["store", "store_name", "store name", "destination"]);
      if (!skuKey || !qtyKey || !storeKey) {
        setError("Expected columns for SKU code, quantity, and store. Found: " + Object.keys(rows[0]).join(", "));
        return;
      }
      const storeByName = new Map(stores.map((s) => [s.name.trim().toLowerCase(), s.id]));
      const out = [];
      let firstUnmatched = "";
      for (const row of rows) {
        const sku = String(row[skuKey] ?? "").trim();
        const qty = Number(row[qtyKey] ?? 0);
        const storeName = String(row[storeKey] ?? "").trim();
        if (!sku || !qty) continue;
        const storeId = storeByName.get(storeName.toLowerCase());
        if (!storeId) { if (!firstUnmatched) firstUnmatched = storeName; continue; }
        out.push({ sku_code: sku, store_id: storeId, qty_requested: qty });
      }
      setUnmatchedStore(firstUnmatched);
      setParsed(out);
    } catch (err) {
      setError("Couldn't read that file: " + err.message);
    }
  };

  const runImport = async () => {
    setBusy(true); setError(""); setSuccess("");
    setProgress({ done: 0, total: parsed.length });
    try {
      await bulkInsert(rest, "replenishment_requests", parsed, 500, setProgress);
      setSuccess(`Created ${parsed.length} replenishment requests.`);
      setParsed([]); setFileName(""); setProgress(null);
      onDone?.();
    } catch (err) {
      setError(err.message.includes("foreign key") ? "Some SKU codes in that file aren't in the master list yet — add them first (Dashboard or Bulk upload SKUs)." : err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`${card} max-w-lg`}>
      <p className="text-xs text-slate-500 mb-3">
        Upload a store's replenishment list (.xlsx or .csv) with columns for SKU code, quantity, and store name — every row becomes an open request, ready for pick lists.
      </p>
      <Banner error={error} success={success} onClear={() => { setError(""); setSuccess(""); }} />
      <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} className="text-sm mb-4" />
      {unmatchedStore && <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mb-3">Some rows use a store name that doesn't match your store list (e.g. "{unmatchedStore}") — those rows were skipped. Store names must match exactly: {stores.map((s) => s.name).join(", ")}.</div>}
      {parsed.length > 0 && <div className="bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm mb-4">Found <strong>{parsed.length}</strong> valid request rows in {fileName}.</div>}
      {progress && (
        <div className="mb-4">
          <div className="w-full bg-slate-200 rounded-full h-2 mb-1"><div className="bg-blue-700 h-2 rounded-full transition-all" style={{ width: `${(progress.done / progress.total) * 100}%` }} /></div>
          <div className="text-xs text-slate-500">{progress.done} / {progress.total}</div>
        </div>
      )}
      <button disabled={parsed.length === 0 || busy} onClick={runImport} className={btnPrimary}>{busy ? "Creating..." : `Create ${parsed.length || ""} requests`}</button>
    </div>
  );
}

function BulkInboundReceive({ rest }) {
  const [meta, setMeta] = useState({ party_name: "", txn_type: "purchase", default_location: "" });
  const [fileName, setFileName] = useState("");
  const [parsed, setParsed] = useState([]);
  const [missingLocationCount, setMissingLocationCount] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [progress, setProgress] = useState(null);
  const [busy, setBusy] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(""); setSuccess(""); setParsed([]);
    setFileName(file.name);
    try {
      const rows = await readSheetRows(file);
      if (!rows.length) { setError("That file has no rows."); return; }
      const skuKey = findColumn(rows[0], ["sku_code", "sku code", "sku"]);
      const qtyKey = findColumn(rows[0], ["quantity", "qty", "qty_put_away", "put away", "put_away"]);
      const locKey = findColumn(rows[0], ["location", "location_code", "destination", "destination_location"]);
      if (!skuKey || !qtyKey) {
        setError("Expected columns for SKU code and quantity. Found: " + Object.keys(rows[0]).join(", "));
        return;
      }
      let missing = 0;
      const out = [];
      for (const row of rows) {
        const sku = String(row[skuKey] ?? "").trim();
        const qty = Number(row[qtyKey] ?? 0);
        const loc = locKey ? String(row[locKey] ?? "").trim() : "";
        if (!sku || !qty) continue;
        if (!loc) missing += 1;
        out.push({ sku_code: sku, qty_put_away: qty, location: loc });
      }
      setMissingLocationCount(missing);
      setParsed(out);
    } catch (err) {
      setError("Couldn't read that file: " + err.message);
    }
  };

  const runImport = async () => {
    if (missingLocationCount > 0 && !meta.default_location) {
      setError(`${missingLocationCount} row(s) have no location in the file — set a default put-away location above, or add a location column to the file.`);
      return;
    }
    if (!meta.party_name) { setError("Enter the supplier/vendor name for this shipment."); return; }
    setBusy(true); setError(""); setSuccess("");
    setProgress({ done: 0, total: parsed.length });
    try {
      const records = parsed.map((r) => ({
        sku_code: r.sku_code,
        txn_type: meta.txn_type,
        party_name: meta.party_name,
        qty_picked: r.qty_put_away,
        qty_packed: r.qty_put_away,
        qty_put_away: r.qty_put_away,
        destination_location: r.location || meta.default_location,
      }));
      await bulkInsert(rest, "inbound_transactions", records, 500, setProgress);
      setSuccess(`Logged inbound receipt for ${parsed.length} SKUs from ${meta.party_name}. Stock updated.`);
      setParsed([]); setFileName(""); setProgress(null);
    } catch (err) {
      setError(err.message.includes("foreign key") ? "Some SKU codes in that file aren't in the master list yet — add them first (Dashboard or Bulk upload SKUs)." : err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`${card} max-w-lg`}>
      <p className="text-xs text-slate-500 mb-3">
        Upload a shipment's packing list (.xlsx or .csv) — e.g. 1,000 SKUs received from one supplier at once. Columns needed: SKU code and quantity; a location column is optional if everything goes to the same spot.
      </p>
      <Banner error={error} success={success} onClear={() => { setError(""); setSuccess(""); }} />
      <Field label="Supplier / vendor name"><input className={inputCls} value={meta.party_name} onChange={(e) => setMeta({ ...meta, party_name: e.target.value })} placeholder="e.g. Aramex" /></Field>
      <Field label="Transaction type">
        <select className={inputCls} value={meta.txn_type} onChange={(e) => setMeta({ ...meta, txn_type: e.target.value })}>
          <option value="purchase">Purchase</option>
          <option value="returns">Returns</option>
          <option value="retrieval">Retrieval</option>
        </select>
      </Field>
      <Field label="Default put-away location (used if the file has no location column, or a row is blank)"><input className={inputCls} value={meta.default_location} onChange={(e) => setMeta({ ...meta, default_location: e.target.value })} placeholder="e.g. RECEIVING-01" /></Field>
      <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} className="text-sm mb-4" />
      {parsed.length > 0 && <div className="bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm mb-4">Found <strong>{parsed.length}</strong> SKU rows in {fileName}{missingLocationCount > 0 ? ` (${missingLocationCount} with no location in the file — will use your default)` : ""}.</div>}
      {progress && (
        <div className="mb-4">
          <div className="w-full bg-slate-200 rounded-full h-2 mb-1"><div className="bg-blue-700 h-2 rounded-full transition-all" style={{ width: `${(progress.done / progress.total) * 100}%` }} /></div>
          <div className="text-xs text-slate-500">{progress.done} / {progress.total}</div>
        </div>
      )}
      <button disabled={parsed.length === 0 || busy} onClick={runImport} className={btnPrimary}>{busy ? "Logging..." : `Log ${parsed.length || ""} inbound units`}</button>
    </div>
  );
}

function Replenishment({ rest, rpc }) {
  const [tab, setTab] = useState("new");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [stores, setStores] = useState([]);
  const [reqForm, setReqForm] = useState({ sku_code: "", store_id: "", qty_requested: "" });

  const [openRequests, setOpenRequests] = useState([]);
  const [selectedReq, setSelectedReq] = useState(null);
  const [pickLocations, setPickLocations] = useState([]);
  const [pickForm, setPickForm] = useState({ source_location: "", qty_picked: "", qty_packed: "", party_name: "" });

  const [verifyForm, setVerifyForm] = useState({ sku_code_requested: "", qty_requested: "", sku_code_scanned: "", qty_scanned: "" });

  useEffect(() => {
    rest("stores?select=id,name&order=name").then(setStores).catch((e) => setError(e.message));
  }, [rest]);

  const loadOpenRequests = useCallback(async () => {
    try {
      const rows = await rest("replenishment_requests?select=id,sku_code,qty_requested,status,stores(name)&status=eq.open&order=created_at.desc&limit=50");
      setOpenRequests(rows || []);
    } catch (err) { setError(err.message); }
  }, [rest]);

  useEffect(() => { if (tab === "pick") loadOpenRequests(); }, [tab, loadOpenRequests]);

  const submitRequest = async (e) => {
    e.preventDefault();
    if (!reqForm.sku_code || !reqForm.store_id || !reqForm.qty_requested) { setError("All fields are required."); return; }
    setError(""); setSuccess("");
    try {
      await rest("replenishment_requests", {
        method: "POST",
        body: JSON.stringify({ sku_code: reqForm.sku_code, store_id: Number(reqForm.store_id), qty_requested: Number(reqForm.qty_requested) }),
      });
      setSuccess(`Replenishment request created for ${reqForm.sku_code}.`);
      setReqForm({ sku_code: "", store_id: "", qty_requested: "" });
    } catch (err) { setError(err.message); }
  };

  const selectRequest = async (r) => {
    setSelectedReq(r);
    setError("");
    try {
      const rows = await rpc("get_pick_locations", { p_sku: r.sku_code, p_qty: r.qty_requested });
      setPickLocations(rows || []);
    } catch (err) { setError(err.message); }
  };

  const submitPick = async (e) => {
    e.preventDefault();
    if (!selectedReq) return;
    if (!pickForm.source_location || !pickForm.qty_picked) { setError("Pick location and quantity are required."); return; }
    setError(""); setSuccess("");
    try {
      await rest("replenishment_transactions", {
        method: "POST",
        body: JSON.stringify({
          request_id: selectedReq.id,
          sku_code: selectedReq.sku_code,
          source_location: pickForm.source_location,
          qty_picked: Number(pickForm.qty_picked),
          qty_packed: Number(pickForm.qty_packed || pickForm.qty_picked),
          party_name: pickForm.party_name,
        }),
      });
      await rest(`replenishment_requests?id=eq.${selectedReq.id}`, { method: "PATCH", body: JSON.stringify({ status: "issued" }) });
      setSuccess(`Picked ${pickForm.qty_picked} of ${selectedReq.sku_code} from ${pickForm.source_location}. Stock updated.`);
      setSelectedReq(null); setPickLocations([]); setPickForm({ source_location: "", qty_picked: "", qty_packed: "", party_name: "" });
      loadOpenRequests();
    } catch (err) { setError(err.message); }
  };

  const submitVerify = async (e) => {
    e.preventDefault();
    if (!verifyForm.sku_code_requested) { setError("Enter the SKU that was on the pick list."); return; }
    setError(""); setSuccess("");
    try {
      await rest("replenishment_list_items", {
        method: "POST",
        body: JSON.stringify({
          sku_code_requested: verifyForm.sku_code_requested,
          qty_requested: Number(verifyForm.qty_requested || 0),
          sku_code_scanned: verifyForm.sku_code_scanned || verifyForm.sku_code_requested,
          qty_scanned: Number(verifyForm.qty_scanned || 0),
        }),
      });
      const diff = Number(verifyForm.qty_scanned || 0) - Number(verifyForm.qty_requested || 0);
      setSuccess(diff === 0 ? "Match confirmed, no variance." : `Logged with a variance of ${diff}.`);
      setVerifyForm({ sku_code_requested: "", qty_requested: "", sku_code_scanned: "", qty_scanned: "" });
    } catch (err) { setError(err.message); }
  };

  const tabBtn = (id, label) => (
    <button onClick={() => { setTab(id); setError(""); setSuccess(""); }} className={`px-3 py-1.5 text-sm rounded-md font-medium ${tab === id ? "bg-blue-700 text-white" : "text-slate-600 hover:bg-slate-100"}`}>
      {label}
    </button>
  );

  return (
    <div>
      <div className="flex gap-1 mb-4">
        {tabBtn("new", "New request")}
        {tabBtn("bulk", "Bulk request")}
        {tabBtn("pick", "Pick list")}
        {tabBtn("verify", "Verify scan")}
      </div>

      <Banner error={error} success={success} onClear={() => { setError(""); setSuccess(""); }} />

      {tab === "bulk" && <BulkReplenishRequest rest={rest} stores={stores} onDone={loadOpenRequests} />}

      {tab === "new" && (
        <form onSubmit={submitRequest} className={`${card} max-w-md`}>
          <Field label="SKU code"><SkuSearchInput rest={rest} value={reqForm.sku_code} onChange={(v) => setReqForm({ ...reqForm, sku_code: v })} onSelect={(r) => setReqForm({ ...reqForm, sku_code: r.sku_code })} /></Field>
          <Field label="Destination store">
            <select className={inputCls} value={reqForm.store_id} onChange={(e) => setReqForm({ ...reqForm, store_id: e.target.value })}>
              <option value="">Select a store</option>
              {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="Quantity requested"><input className={inputCls} type="number" min="1" value={reqForm.qty_requested} onChange={(e) => setReqForm({ ...reqForm, qty_requested: e.target.value })} /></Field>
          <button className={btnPrimary} type="submit">Create request</button>
        </form>
      )}

      {tab === "pick" && (
        <div className="grid grid-cols-2 gap-5">
          <div className={card}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-900">Open requests</h3>
              <button onClick={loadOpenRequests} className="text-slate-400 hover:text-slate-700"><RefreshCw className="w-4 h-4" /></button>
            </div>
            <div className="space-y-1 max-h-96 overflow-auto">
              {openRequests.length === 0 && <div className="text-sm text-slate-400">No open requests.</div>}
              {openRequests.map((r) => (
                <button key={r.id} onClick={() => selectRequest(r)} className={`w-full text-left px-3 py-2 rounded-md text-sm border ${selectedReq?.id === r.id ? "border-blue-600 bg-blue-50" : "border-slate-200 hover:bg-slate-50"}`}>
                  <div className="font-medium text-slate-900">{r.sku_code} &middot; {r.qty_requested} units</div>
                  <div className="text-xs text-slate-500">{r.stores?.name}</div>
                </button>
              ))}
            </div>
          </div>

          <div className={card}>
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Pick locations {selectedReq ? `for ${selectedReq.sku_code}` : ""}</h3>
            {!selectedReq && <div className="text-sm text-slate-400">Select a request to see live pick locations.</div>}
            {selectedReq && (
              <>
                <table className="w-full text-sm mb-4">
                  <thead><tr className="text-left text-slate-500 border-b border-slate-200"><th className="py-1 font-medium">Location</th><th className="py-1 font-medium text-right">Available now</th></tr></thead>
                  <tbody>
                    {pickLocations.length === 0 && <tr><td colSpan={2} className="py-2 text-red-600">No stock currently available anywhere.</td></tr>}
                    {pickLocations.map((l) => (
                      <tr key={l.location_code} className="border-b border-slate-100 last:border-0">
                        <td className="py-1 font-mono">{l.location_code}</td>
                        <td className="py-1 text-right">{l.available_qty}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <form onSubmit={submitPick}>
                  <Field label="Pick from location">
                    <select className={inputCls} value={pickForm.source_location} onChange={(e) => setPickForm({ ...pickForm, source_location: e.target.value })}>
                      <option value="">Select location</option>
                      {pickLocations.map((l) => <option key={l.location_code} value={l.location_code}>{l.location_code} ({l.available_qty} available)</option>)}
                    </select>
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Qty picked"><input className={inputCls} type="number" min="1" value={pickForm.qty_picked} onChange={(e) => setPickForm({ ...pickForm, qty_picked: e.target.value })} /></Field>
                    <Field label="Qty packed"><input className={inputCls} type="number" min="0" value={pickForm.qty_packed} onChange={(e) => setPickForm({ ...pickForm, qty_packed: e.target.value })} /></Field>
                  </div>
                  <Field label="Picked/packed by"><input className={inputCls} value={pickForm.party_name} onChange={(e) => setPickForm({ ...pickForm, party_name: e.target.value })} /></Field>
                  <button className={btnPrimary} type="submit">Log pick and dispatch</button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {tab === "verify" && (
        <form onSubmit={submitVerify} className={`${card} max-w-md`}>
          <p className="text-xs text-slate-500 mb-3">Scan or type what the pick list said, then what was actually scanned off the shelf.</p>
          <Field label="SKU on pick list"><input className={inputCls} value={verifyForm.sku_code_requested} onChange={(e) => setVerifyForm({ ...verifyForm, sku_code_requested: e.target.value })} /></Field>
          <Field label="Quantity on pick list"><input className={inputCls} type="number" value={verifyForm.qty_requested} onChange={(e) => setVerifyForm({ ...verifyForm, qty_requested: e.target.value })} /></Field>
          <Field label="SKU scanned"><input className={inputCls} value={verifyForm.sku_code_scanned} onChange={(e) => setVerifyForm({ ...verifyForm, sku_code_scanned: e.target.value })} /></Field>
          <Field label="Quantity scanned"><input className={inputCls} type="number" value={verifyForm.qty_scanned} onChange={(e) => setVerifyForm({ ...verifyForm, qty_scanned: e.target.value })} /></Field>
          <button className={btnPrimary} type="submit">Log verification</button>
        </form>
      )}
    </div>
  );
}

function Inbound({ rest }) {
  const [mode, setMode] = useState("single");
  const [form, setForm] = useState({ sku_code: "", txn_type: "purchase", party_name: "", qty_picked: "", qty_packed: "", qty_put_away: "", destination_location: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (!form.sku_code || !form.destination_location || !form.qty_put_away) {
      setError("SKU code, destination location, and quantity put away are required.");
      return;
    }
    setError(""); setSuccess("");
    try {
      await rest("inbound_transactions", {
        method: "POST",
        body: JSON.stringify({
          sku_code: form.sku_code,
          txn_type: form.txn_type,
          party_name: form.party_name,
          qty_picked: Number(form.qty_picked || form.qty_put_away),
          qty_packed: Number(form.qty_packed || form.qty_put_away),
          qty_put_away: Number(form.qty_put_away),
          destination_location: form.destination_location,
        }),
      });
      setSuccess(`Put away ${form.qty_put_away} of ${form.sku_code} at ${form.destination_location}. Stock updated.`);
      setForm({ sku_code: "", txn_type: "purchase", party_name: "", qty_picked: "", qty_packed: "", qty_put_away: "", destination_location: "" });
    } catch (err) {
      setError(err.message.includes("foreign key") ? "That SKU isn't in the master list yet. Add it from the Dashboard tab first." : err.message);
    }
  };

  const tabBtn = (id, label) => (
    <button onClick={() => setMode(id)} className={`px-3 py-1.5 text-sm rounded-md font-medium ${mode === id ? "bg-blue-700 text-white" : "text-slate-600 hover:bg-slate-100"}`}>
      {label}
    </button>
  );

  return (
    <div>
      <h2 className="text-base font-semibold text-slate-900 mb-4">Log inbound receipt</h2>
      <div className="flex gap-1 mb-4">
        {tabBtn("single", "Single SKU")}
        {tabBtn("bulk", "Bulk shipment")}
      </div>
      {mode === "bulk" && <BulkInboundReceive rest={rest} />}
      {mode === "single" && (
      <>
      <Banner error={error} success={success} onClear={() => { setError(""); setSuccess(""); }} />
      <form onSubmit={submit} className={`${card} max-w-md`}>
        <Field label="SKU code"><SkuSearchInput rest={rest} value={form.sku_code} onChange={(v) => setForm({ ...form, sku_code: v })} onSelect={(r) => setForm({ ...form, sku_code: r.sku_code })} /></Field>
        <Field label="Transaction type">
          <select className={inputCls} value={form.txn_type} onChange={(e) => setForm({ ...form, txn_type: e.target.value })}>
            <option value="purchase">Purchase</option>
            <option value="returns">Returns</option>
            <option value="retrieval">Retrieval</option>
          </select>
        </Field>
        <Field label="Customer / vendor name"><input className={inputCls} value={form.party_name} onChange={(e) => setForm({ ...form, party_name: e.target.value })} /></Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Picked"><input className={inputCls} type="number" min="0" value={form.qty_picked} onChange={(e) => setForm({ ...form, qty_picked: e.target.value })} /></Field>
          <Field label="Packed"><input className={inputCls} type="number" min="0" value={form.qty_packed} onChange={(e) => setForm({ ...form, qty_packed: e.target.value })} /></Field>
          <Field label="Put away"><input className={inputCls} type="number" min="0" value={form.qty_put_away} onChange={(e) => setForm({ ...form, qty_put_away: e.target.value })} /></Field>
        </div>
        <Field label="Put-away location"><input className={inputCls} value={form.destination_location} onChange={(e) => setForm({ ...form, destination_location: e.target.value })} placeholder="e.g. A-12-03" /></Field>
        <button className={btnPrimary} type="submit">Log inbound</button>
      </form>
      </>
      )}
    </div>
  );
}

const PAGE_SIZE = 25;

function Pager({ page, setPage, hasMore }) {
  return (
    <div className="flex items-center justify-between mt-3">
      <button disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))} className={`${btnSecondary} !py-1 !px-2`}>
        <ChevronLeft className="w-4 h-4" />
      </button>
      <span className="text-xs text-slate-500">Page {page + 1}</span>
      <button disabled={!hasMore} onClick={() => setPage((p) => p + 1)} className={`${btnSecondary} !py-1 !px-2`}>
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

function StockOverview({ rest }) {
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE; // fetch one extra to know if there's a next page
      const filter = search ? `&sku_code=ilike.*${encodeURIComponent(search)}*` : "";
      const data = await rest(`sku_totals?select=sku_code,total_qty,location_breakdown&order=sku_code${filter}&limit=${PAGE_SIZE + 1}&offset=${from}`);
      setHasMore((data || []).length > PAGE_SIZE);
      setRows((data || []).slice(0, PAGE_SIZE));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [rest, page, search]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(0); }, [search]);

  return (
    <div>
      <h2 className="text-base font-semibold text-slate-900 mb-4">Stock on hand</h2>
      <Banner error={error} onClear={() => setError("")} />
      <div className={`${card} mb-4`}>
        <Field label="Search SKU code">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input className={`${inputCls} pl-9`} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Type a SKU code to filter" />
          </div>
        </Field>
      </div>
      <div className={card}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 border-b border-slate-200">
              <th className="py-1.5 font-medium">SKU code</th>
              <th className="py-1.5 font-medium text-right">Total qty</th>
              <th className="py-1.5 font-medium">Locations (code:qty)</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={3} className="py-3 text-slate-400">Loading...</td></tr>}
            {!loading && rows.length === 0 && <tr><td colSpan={3} className="py-3 text-slate-400">No SKUs found.</td></tr>}
            {rows.map((r) => (
              <tr key={r.sku_code} className="border-b border-slate-100 last:border-0 align-top">
                <td className="py-1.5 font-mono text-slate-800 whitespace-nowrap">{r.sku_code}</td>
                <td className="py-1.5 text-right text-slate-900 whitespace-nowrap">{r.total_qty}</td>
                <td className="py-1.5 text-slate-500 text-xs">{r.location_breakdown}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pager page={page} setPage={setPage} hasMore={hasMore} />
      </div>
    </div>
  );
}

function Ledger({ rest }) {
  const [skuFilter, setSkuFilter] = useState("");
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const from = page * PAGE_SIZE;
      const filter = skuFilter ? `&sku_code=ilike.*${encodeURIComponent(skuFilter)}*` : "";
      const data = await rest(`transaction_ledger?select=*&order=created_at.desc${filter}&limit=${PAGE_SIZE + 1}&offset=${from}`);
      setHasMore((data || []).length > PAGE_SIZE);
      setRows((data || []).slice(0, PAGE_SIZE));
    } catch (err) {
      setError(err.message.includes("relation") ? "Run schema_patch_2.sql in Supabase first to enable the ledger view." : err.message);
    } finally {
      setLoading(false);
    }
  }, [rest, page, skuFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(0); }, [skuFilter]);

  return (
    <div>
      <h2 className="text-base font-semibold text-slate-900 mb-4">Transaction ledger</h2>
      <Banner error={error} onClear={() => setError("")} />
      <div className={`${card} mb-4`}>
        <Field label="Filter by SKU code">
          <input className={inputCls} value={skuFilter} onChange={(e) => setSkuFilter(e.target.value)} placeholder="Leave blank to see everything" />
        </Field>
      </div>
      <div className={card}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 border-b border-slate-200">
              <th className="py-1.5 font-medium">Type</th>
              <th className="py-1.5 font-medium">SKU</th>
              <th className="py-1.5 font-medium">Date</th>
              <th className="py-1.5 font-medium">Party</th>
              <th className="py-1.5 font-medium">Location</th>
              <th className="py-1.5 font-medium text-right">Qty</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="py-3 text-slate-400">Loading...</td></tr>}
            {!loading && rows.length === 0 && <tr><td colSpan={6} className="py-3 text-slate-400">No transactions yet.</td></tr>}
            {rows.map((r) => (
              <tr key={`${r.txn_kind}-${r.id}`} className="border-b border-slate-100 last:border-0">
                <td className="py-1.5">
                  <span className={`text-xs px-1.5 py-0.5 rounded ${r.txn_kind === "inbound" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"}`}>{r.txn_kind}</span>
                </td>
                <td className="py-1.5 font-mono">{r.sku_code}</td>
                <td className="py-1.5 text-slate-500 text-xs">{r.txn_date}</td>
                <td className="py-1.5">{r.party_name}</td>
                <td className="py-1.5 font-mono text-xs">{r.location}</td>
                <td className="py-1.5 text-right">{r.quantity}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pager page={page} setPage={setPage} hasMore={hasMore} />
      </div>
    </div>
  );
}

function Summary({ rest, rpc }) {
  const [countForm, setCountForm] = useState({ sku_code: "", counted_qty: "" });
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    try {
      const from = page * PAGE_SIZE;
      const data = await rest(`stock_counts?select=sku_code,count_date,open_stock,close_stock,counted_qty,difference&order=count_date.desc&limit=${PAGE_SIZE + 1}&offset=${from}`);
      setHasMore((data || []).length > PAGE_SIZE);
      setRows((data || []).slice(0, PAGE_SIZE));
    } catch (err) {
      setError(err.message);
    }
  }, [rest, page]);

  useEffect(() => { load(); }, [load]);

  const submitCount = async (e) => {
    e.preventDefault();
    if (!countForm.sku_code || countForm.counted_qty === "") { setError("SKU code and counted quantity are required."); return; }
    setError(""); setSuccess("");
    try {
      await rpc("record_daily_count", { p_sku: countForm.sku_code, p_counted_qty: Number(countForm.counted_qty) });
      setSuccess(`Count logged for ${countForm.sku_code}.`);
      setCountForm({ sku_code: "", counted_qty: "" });
      setPage(0);
      load();
    } catch (err) {
      setError(err.message.includes("does not exist") ? "Run schema_patch_2.sql in Supabase first to enable daily counts." : err.message);
    }
  };

  return (
    <div>
      <h2 className="text-base font-semibold text-slate-900 mb-4">Daily summary</h2>
      <Banner error={error} success={success} onClear={() => { setError(""); setSuccess(""); }} />
      <form onSubmit={submitCount} className={`${card} max-w-md mb-5`}>
        <p className="text-xs text-slate-500 mb-3">Enter today's physical count for a SKU. Open/close stock and the variance are calculated automatically from live system stock.</p>
        <Field label="SKU code"><SkuSearchInput rest={rest} value={countForm.sku_code} onChange={(v) => setCountForm({ ...countForm, sku_code: v })} onSelect={(r) => setCountForm({ ...countForm, sku_code: r.sku_code })} /></Field>
        <Field label="Physically counted quantity"><input className={inputCls} type="number" min="0" value={countForm.counted_qty} onChange={(e) => setCountForm({ ...countForm, counted_qty: e.target.value })} /></Field>
        <button className={btnPrimary} type="submit">Log count</button>
      </form>

      <div className={card}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 border-b border-slate-200">
              <th className="py-1.5 font-medium">SKU</th>
              <th className="py-1.5 font-medium">Date</th>
              <th className="py-1.5 font-medium text-right">Open</th>
              <th className="py-1.5 font-medium text-right">Close</th>
              <th className="py-1.5 font-medium text-right">Counted</th>
              <th className="py-1.5 font-medium text-right">Difference</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={6} className="py-3 text-slate-400">No counts logged yet.</td></tr>}
            {rows.map((r) => (
              <tr key={`${r.sku_code}-${r.count_date}`} className="border-b border-slate-100 last:border-0">
                <td className="py-1.5 font-mono">{r.sku_code}</td>
                <td className="py-1.5 text-slate-500 text-xs">{r.count_date}</td>
                <td className="py-1.5 text-right">{r.open_stock}</td>
                <td className="py-1.5 text-right">{r.close_stock}</td>
                <td className="py-1.5 text-right">{r.counted_qty}</td>
                <td className={`py-1.5 text-right font-medium ${r.difference === 0 ? "text-emerald-700" : "text-red-600"}`}>{r.difference}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pager page={page} setPage={setPage} hasMore={hasMore} />
      </div>
    </div>
  );
}

// Parses either:
//  (a) the legacy "SKU Master List" export: columns include SKU CODE + COMBINED LOCATIONS
//      (a comma-separated list of location codes, repeats = extra units at that location)
//  (b) a flat format: columns sku_code, location_code, quantity (one row per sku+location)
function parseInventoryRows(rows) {
  if (!rows.length) return [];
  const headerKeys = Object.keys(rows[0]).map((k) => k.trim().toUpperCase());
  // Aggregate globally across the WHOLE file, not just within one row —
  // the same SKU can legitimately appear on multiple rows (or the same
  // SKU+location combination can repeat), and Postgres refuses to update
  // the same conflict target twice within a single batch insert.
  const tally = new Map(); // key `${sku}|${location}` -> summed quantity

  const bump = (sku, location, qty) => {
    if (!sku || !location) return;
    const key = `${sku}|${location}`;
    tally.set(key, (tally.get(key) || 0) + qty);
  };

  if (headerKeys.includes("SKU CODE") && headerKeys.includes("COMBINED LOCATIONS")) {
    for (const row of rows) {
      const sku = String(row["SKU CODE"] ?? "").trim();
      const combined = row["COMBINED LOCATIONS"];
      if (!sku || !combined) continue;
      String(combined).split(",").map((s) => s.trim()).filter(Boolean).forEach((loc) => bump(sku, loc, 1));
    }
  } else {
    // flat format - find columns case-insensitively
    const findKey = (target) => Object.keys(rows[0]).find((k) => k.trim().toLowerCase() === target);
    const skuKey = findKey("sku_code") || findKey("sku code");
    const locKey = findKey("location_code") || findKey("location");
    const qtyKey = findKey("quantity") || findKey("qty");
    if (!skuKey || !locKey) return [];
    for (const row of rows) {
      const sku = String(row[skuKey] ?? "").trim();
      const loc = String(row[locKey] ?? "").trim();
      if (!sku || !loc) continue;
      bump(sku, loc, Number(row[qtyKey] ?? 1) || 1);
    }
  }

  return [...tally.entries()].map(([key, quantity]) => {
    const [sku_code, location_code] = key.split("|");
    return { sku_code, location_code, quantity };
  });
}

function BulkUpload({ rest }) {
  const [fileName, setFileName] = useState("");
  const [parsed, setParsed] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [progress, setProgress] = useState(null); // {phase, done, total}
  const [busy, setBusy] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(""); setSuccess(""); setParsed([]);
    setFileName(file.name);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheetName = wb.SheetNames.find((n) => n.toLowerCase().includes("master")) || wb.SheetNames[0];
      const sheet = wb.Sheets[sheetName];
      // Find the real header row (skip title rows that are common in exported sheets)
      const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
      let headerRowIdx = raw.findIndex((r) => r.some((c) => String(c ?? "").toUpperCase().includes("SKU")));
      if (headerRowIdx === -1) headerRowIdx = 0;
      const rows = XLSX.utils.sheet_to_json(sheet, { range: headerRowIdx, defval: null });
      const result = parseInventoryRows(rows);
      if (result.length === 0) setError("Couldn't find recognizable columns. Expected 'SKU CODE' + 'COMBINED LOCATIONS', or 'sku_code' + 'location_code' (+ optional 'quantity').");
      setParsed(result);
    } catch (err) {
      setError("Couldn't read that file: " + err.message);
    }
  };

  // Sends one array of objects per request with an upsert Prefer header —
  // this is a real bulk insert (one round trip per batch), not one call per row.
  const bulkUpsert = async (table, records, onConflict, batchSize) => {
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      await rest(`${table}?on_conflict=${onConflict}`, {
        method: "POST",
        body: JSON.stringify(batch),
        prefer: "resolution=merge-duplicates,return=minimal",
      });
      setProgress((p) => ({ ...p, done: Math.min(i + batchSize, records.length) }));
    }
  };

  const runImport = async () => {
    setBusy(true); setError(""); setSuccess("");
    try {
      const uniqueSkuList = [...new Set(parsed.map((r) => r.sku_code))].map((sku_code) => ({ sku_code }));
      const uniqueLocList = [...new Set(parsed.map((r) => r.location_code))].map((location_code) => ({ location_code }));

      setProgress({ phase: `Uploading ${uniqueSkuList.length} unique SKUs`, done: 0, total: uniqueSkuList.length });
      await bulkUpsert("skus", uniqueSkuList, "sku_code", 2000);

      setProgress({ phase: `Uploading ${uniqueLocList.length} unique locations`, done: 0, total: uniqueLocList.length });
      await bulkUpsert("locations", uniqueLocList, "location_code", 2000);

      setProgress({ phase: `Uploading ${parsed.length} stock levels`, done: 0, total: parsed.length });
      await bulkUpsert("sku_stock", parsed, "sku_code,location_code", 1000);

      setSuccess(`Imported ${uniqueSkuList.length} SKUs across ${parsed.length} SKU/location rows.`);
      setParsed([]); setFileName(""); setProgress(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const uniqueSkus = new Set(parsed.map((r) => r.sku_code)).size;

  return (
    <div>
      <h2 className="text-base font-semibold text-slate-900 mb-4">Bulk upload SKUs</h2>
      <Banner error={error} success={success} onClear={() => { setError(""); setSuccess(""); }} />
      <div className={`${card} max-w-lg`}>
        <p className="text-xs text-slate-500 mb-3">
          Upload your SKU Master List export (.xlsx or .csv) directly — the "COMBINED LOCATIONS" column is understood automatically.
          Built for large files (150,000+ SKUs) using real batch inserts, not one row at a time.
          Existing SKUs are updated; new ones are created. Safe to re-run any time to sync your latest count.
        </p>
        <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} className="text-sm mb-4" />
        {parsed.length > 0 && (
          <div className="bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm mb-4">
            Found <strong>{uniqueSkus}</strong> unique SKUs across <strong>{parsed.length}</strong> SKU/location rows in {fileName}.
          </div>
        )}
        {progress && (
          <div className="mb-4">
            <div className="text-xs text-slate-600 mb-1">{progress.phase}</div>
            <div className="w-full bg-slate-200 rounded-full h-2 mb-1">
              <div className="bg-blue-700 h-2 rounded-full transition-all" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
            </div>
            <div className="text-xs text-slate-500">{progress.done} / {progress.total}</div>
          </div>
        )}
        <button disabled={parsed.length === 0 || busy} onClick={runImport} className={btnPrimary}>
          {busy ? "Importing..." : `Import ${parsed.length || ""} rows`}
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const { rest, rpc } = useSupabase(session?.access_token);
  const [page, setPage] = useState("overview");

  if (!session) return <LoginScreen onLogin={setSession} />;

  const nav = [
    { id: "overview", label: "Stock overview", icon: LayoutDashboard },
    { id: "dashboard", label: "SKU lookup / add", icon: Search },
    { id: "replenishment", label: "Replenishment", icon: ClipboardList },
    { id: "inbound", label: "Inbound", icon: ArrowDownToLine },
    { id: "ledger", label: "Ledger", icon: ListTree },
    { id: "summary", label: "Summary", icon: ClipboardCheck },
    { id: "bulk", label: "Bulk upload", icon: UploadCloud },
  ];

  return (
    <div className="min-h-[600px] bg-slate-50 flex">
      <div className="w-52 bg-white border-r border-slate-200 flex flex-col shrink-0">
        <div className="flex items-center gap-2 px-4 py-4 border-b border-slate-200">
          <Package className="w-5 h-5 text-blue-700" />
          <span className="font-semibold text-slate-900 text-sm">Inventory</span>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {nav.map((n) => (
            <button key={n.id} onClick={() => setPage(n.id)} className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium ${page === n.id ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50"}`}>
              <n.icon className="w-4 h-4" /> {n.label}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-slate-200">
          <div className="text-xs text-slate-500 truncate mb-2">{session.user?.email}</div>
          <button onClick={() => setSession(null)} className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-slate-600 hover:bg-slate-50">
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      </div>
      <div className="flex-1 p-6 overflow-auto">
        {page === "overview" && <StockOverview rest={rest} />}
        {page === "dashboard" && <Dashboard rest={rest} />}
        {page === "replenishment" && <Replenishment rest={rest} rpc={rpc} />}
        {page === "inbound" && <Inbound rest={rest} />}
        {page === "ledger" && <Ledger rest={rest} />}
        {page === "summary" && <Summary rest={rest} rpc={rpc} />}
        {page === "bulk" && <BulkUpload rest={rest} />}
      </div>
    </div>
  );
}
