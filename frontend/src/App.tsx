import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Activity,
  ArrowDownLeft,
  ArrowUpRight,
  Bell,
  Check,
  ChevronDown,
  CircleHelp,
  ExternalLink,
  FileSearch,
  Gavel,
  LayoutDashboard,
  LoaderCircle,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  WalletCards,
  X,
} from "lucide-react";
import { appNetwork, configuredContractId, connectWallet, getShipmentSummary, setShipmentMetadata, type Shipment, type Wallet } from "./lib/stellar";
import { AdminPage } from "./pages/AdminPage";
import { ArbiterPage } from "./pages/ArbiterPage";

type Escalation = {
  id: string;
  ledger: number;
  type: string;
  shipmentId: string;
  milestoneIndex: number;
  openedLedger: number;
  currentLedger: number;
};

type Route = "overview" | "admin" | "arbiter";

const backendUrl = (import.meta.env.VITE_BACKEND_URL || "http://localhost:8787").replace(/\/$/, "");

function routeFromPath(pathname: string): Route {
  if (pathname.startsWith("/admin")) return "admin";
  if (pathname.startsWith("/arbiter")) return "arbiter";
  return "overview";
}

export function shortAddress(address: string) {
  return `${address.slice(0, 5)}...${address.slice(-5)}`;
}

function amount(value?: string) {
  if (!value) return "--";
  try {
    return new Intl.NumberFormat("en-US").format(BigInt(value));
  } catch {
    return value;
  }
}

function App() {
  const { t } = useTranslation();
  const [route, setRoute] = useState<Route>(() => routeFromPath(window.location.pathname));
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [shipmentId, setShipmentId] = useState("");
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [events, setEvents] = useState<Escalation[]>([]);
  const [apiState, setApiState] = useState<"checking" | "online" | "offline">("checking");
  const [loading, setLoading] = useState(false);
  const [writing, setWriting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showMetadata, setShowMetadata] = useState(false);
  const [metadataKey, setMetadataKey] = useState("");
  const [metadataValue, setMetadataValue] = useState("");

  useEffect(() => {
    const onPop = () => setRoute(routeFromPath(window.location.pathname));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${backendUrl}/api/health`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Backend unavailable");
        setApiState("online");
      })
      .catch(() => setApiState("offline"));
    fetch(`${backendUrl}/api/events?limit=8`, { signal: controller.signal })
      .then((response) => response.ok ? response.json() as Promise<Escalation[]> : [])
      .then(setEvents)
      .catch(() => undefined);
    const stream = new EventSource(`${backendUrl}/api/stream`);
    stream.addEventListener("dispute_escalated", (message) => {
      const event = JSON.parse((message as MessageEvent<string>).data) as Escalation;
      setEvents((current) => [event, ...current.filter((item) => item.id !== event.id)].slice(0, 8));
    });
    return () => {
      controller.abort();
      stream.close();
    };
  }, []);

  function navigate(event: React.MouseEvent<HTMLAnchorElement>, next: Route, hash = "") {
    event.preventDefault();
    const path = next === "overview" ? "/" : `/${next}`;
    window.history.pushState(null, "", `${path}${hash}`);
    setRoute(next);
    setError("");
    setNotice("");
  }

  async function handleConnect() {
    setError("");
    try {
      setWallet(await connectWallet());
      setNotice(t("wallet.connected"));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("wallet.connectError"));
    }
  }

  async function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!wallet || !shipmentId.trim()) return;
    setLoading(true);
    setError("");
    setNotice("");
    try {
      setShipment(await getShipmentSummary(wallet.address, shipmentId.trim()));
    } catch (cause) {
      setShipment(null);
      setError(cause instanceof Error ? cause.message : t("lookup.error"));
    } finally {
      setLoading(false);
    }
  }

  async function handleMetadata(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!wallet || !shipment) return;
    setWriting(true);
    setError("");
    setNotice("");
    try {
      const hash = await setShipmentMetadata(wallet, shipment.id, metadataKey.trim(), metadataValue);
      setNotice(t("metadata.saved", { hash: hash.slice(0, 12) }));
      setMetadataKey("");
      setMetadataValue("");
      setShowMetadata(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("metadata.error"));
    } finally {
      setWriting(false);
    }
  }

  const status = shipment?.status ?? t("lookup.waiting");
  const crumb = route === "admin" ? t("nav.admin") : route === "arbiter" ? t("nav.arbiter") : t("nav.overview");
  const toast = (error || notice) && <div className={`toast ${error ? "toast-error" : "toast-success"}`} role="status">{error ? <X size={16} /> : <Check size={16} />}{error || notice}<button className="icon-button" onClick={() => { setError(""); setNotice(""); }} aria-label={t("dismiss")}><X size={15} /></button></div>;
  const feedback = { onError: (message: string) => { setNotice(""); setError(message); }, onNotice: (message: string) => { setError(""); setNotice(message); } };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="/" onClick={(event) => navigate(event, "overview")} aria-label={t("brand.home")}>
          <span className="brand-mark"><span /></span>
          <span className="brand-name">stellar<span>settle</span></span>
        </a>
        <div className="workspace-switch">
          <span className="workspace-avatar">S</span>
          <span><strong>{t("workspace.name")}</strong><small>{t("workspace.subtitle")}</small></span>
          <ChevronDown size={15} />
        </div>
        <div className="nav-label">{t("workspace.label")}</div>
        <nav className="primary-nav" aria-label={t("nav.primary")}>
          <a className={`nav-item ${route === "overview" ? "active" : ""}`} href="/" onClick={(event) => navigate(event, "overview")}><LayoutDashboard size={17} />{t("nav.overview")}</a>
          <a className="nav-item" href="/#shipment" onClick={(event) => navigate(event, "overview", "#shipment")}><FileSearch size={17} />{t("nav.shipments")}<span className="nav-count">{shipment ? "1" : "0"}</span></a>
          <a className="nav-item" href="/#activity" onClick={(event) => navigate(event, "overview", "#activity")}><Activity size={17} />{t("nav.disputeActivity")}{events.length > 0 && <span className="nav-count alert-count">{events.length}</span>}</a>
          <a className={`nav-item ${route === "arbiter" ? "active" : ""}`} href="/arbiter" onClick={(event) => navigate(event, "arbiter")}><Gavel size={17} />{t("nav.arbiter")}</a>
          <a className={`nav-item ${route === "admin" ? "active" : ""}`} href="/admin" onClick={(event) => navigate(event, "admin")}><Settings size={17} />{t("nav.admin")}</a>
        </nav>
        <div className="sidebar-bottom">
          <div className="network-card">
            <span className="network-dot" />
            <span><strong>{appNetwork === "testnet" ? t("network.testnet") : t("network.mainnet")}</strong><small>{t("network.configured")}</small></span>
          </div>
          <a className="nav-item help-link" href="https://developers.stellar.org/docs" target="_blank" rel="noreferrer"><CircleHelp size={17} />{t("docs")}<ExternalLink size={13} /></a>
          <div className="profile-row">
            <span className="profile-avatar">{wallet ? wallet.address.slice(1, 2) : "S"}</span>
            <span><strong>{wallet ? shortAddress(wallet.address) : t("profile.guest")}</strong><small>{wallet ? t("profile.connected") : t("profile.connectPrompt")}</small></span>
            <button className="icon-button" aria-label={t("profile.options")}><ChevronDown size={16} /></button>
          </div>
        </div>
      </aside>

      <main className="main-area" id="overview">
        <header className="topbar">
          <div className="breadcrumbs"><span>{t("workspace.crumb")}</span><span className="crumb-slash">/</span><strong>{crumb}</strong></div>
          <div className="top-actions">
            <span className={`backend-indicator ${apiState}`}><span />{t(`api.${apiState}`)}</span>
            <button className="icon-button notification-button" aria-label={t("notifications")}><Bell size={17} />{events.length > 0 && <i />}</button>
            <button className={`wallet-button ${wallet ? "connected" : ""}`} onClick={wallet ? () => setWallet(null) : handleConnect}>
              <WalletCards size={16} />{wallet ? shortAddress(wallet.address) : t("wallet.connect")}
            </button>
          </div>
        </header>

        {route === "admin" && <div className="page-content">{toast}<AdminPage wallet={wallet} onConnect={handleConnect} {...feedback} /></div>}
        {route === "arbiter" && <div className="page-content">{toast}<ArbiterPage wallet={wallet} onConnect={handleConnect} {...feedback} /></div>}
        {route === "overview" && <div className="page-content">
          <section className="page-heading">
            <div>
              <div className="eyebrow"><span className="eyebrow-rule" />{t("overview.eyebrow")}</div>
              <h1>{t("overview.title")}</h1>
              <p>{t("overview.subtitle")}</p>
            </div>
            <div className="heading-meta"><span className="live-pulse" />{t("overview.live")} <span className="meta-divider" />{appNetwork.toUpperCase()}</div>
          </section>

          <section className="metrics-grid" aria-label={t("overview.metricsLabel")}>
            <article className="metric metric-primary">
              <div className="metric-top"><span>{t("metrics.trackedShipment")}</span><span className="metric-icon green-icon"><FileSearch size={16} /></span></div>
              <div className="metric-value">{shipment ? shipment.id : "—"}</div>
              <div className="metric-foot"><span className="metric-foot-dot" />{shipment ? t("metrics.loadedFromContract") : t("metrics.searchById")}</div>
            </article>
            <article className="metric">
              <div className="metric-top"><span>{t("metrics.escrowValue")}</span><span className="metric-icon blue-icon"><ArrowDownLeft size={16} /></span></div>
              <div className="metric-value">{shipment ? amount(shipment.total_amount) : "—"}<small>{shipment ? t("metrics.baseUnits") : t("metrics.awaitingData")}</small></div>
              <div className="metric-foot">{shipment ? t("metrics.released", { amount: amount(shipment.released_amount) }) : t("metrics.connectAndLookup")}</div>
            </article>
            <article className="metric">
              <div className="metric-top"><span>{t("metrics.openDisputes")}</span><span className="metric-icon coral-icon"><ShieldCheck size={16} /></span></div>
              <div className="metric-value">{shipment ? shipment.open_disputes : "—"}</div>
              <div className="metric-foot">{shipment ? t("metrics.onTracked") : t("metrics.noShipment")}</div>
            </article>
            <article className="metric">
              <div className="metric-top"><span>{t("metrics.networkStatus")}</span><span className="metric-icon amber-icon"><Activity size={16} /></span></div>
              <div className="metric-value status-metric">{apiState === "online" ? t("metrics.operational") : apiState === "offline" ? t("metrics.disconnected") : t("metrics.checking")}</div>
              <div className="metric-foot">{t("metrics.rpc", { network: appNetwork })}</div>
            </article>
          </section>

          {toast}

          <div className="content-grid">
            <section className="panel shipment-panel" id="shipment">
              <div className="panel-heading">
                <div><div className="section-kicker">{t("lookup.kicker")}</div><h2>{t("lookup.title")}</h2></div>
                <span className="chain-badge"><span />{configuredContractId ? t("lookup.onChain") : t("lookup.contractNotSet")}</span>
              </div>
              <form className="search-form" onSubmit={handleSearch}>
                <label className="search-input-wrap"><Search size={17} /><input aria-label={t("lookup.inputLabel")} placeholder={t("lookup.placeholder")} value={shipmentId} onChange={(event) => setShipmentId(event.target.value)} /><kbd>↵</kbd></label>
                <button className="primary-button" disabled={!wallet || loading || !shipmentId.trim()}>{loading ? <LoaderCircle className="spin" size={16} /> : <Search size={16} />}{loading ? t("lookup.loading") : t("lookup.submit")}</button>
              </form>
              {!wallet && <div className="inline-callout"><WalletCards size={16} /><span>{t("wallet.callout")}</span><button onClick={handleConnect}>{t("wallet.calloutButton")}</button></div>}
              {shipment ? <div className="shipment-detail" data-testid="shipment-detail">
                <div className="detail-topline"><div className="shipment-ref"><span className="shipment-icon"><FileSearch size={18} /></span><span><strong>{shipment.id}</strong><small>{t("lookup.createdAt", { ledger: shipment.created_at.toLocaleString() })}</small></span></div><span className={`status-pill ${status.toLowerCase()}`}><span />{status}</span></div>
                <div className="detail-grid">
                  <div><span>{t("lookup.escrowTotal")}</span><strong>{amount(shipment.total_amount)} <small>{t("lookup.units")}</small></strong></div>
                  <div><span>{t("lookup.released")}</span><strong>{amount(shipment.released_amount)} <small>{t("lookup.units")}</small></strong></div>
                  <div><span>{t("lookup.milestones")}</span><strong>{shipment.milestone_count}</strong></div>
                  <div><span>{t("lookup.openDisputes")}</span><strong className={shipment.open_disputes ? "text-coral" : ""}>{shipment.open_disputes}</strong></div>
                </div>
                <div className="detail-footer"><span>{t("lookup.supplier")} <code>{shortAddress(shipment.supplier)}</code><span className="footer-sep"> · </span>{t("lookup.token")} <code>{shortAddress(shipment.token)}</code></span><button className="text-button" onClick={() => setShowMetadata((shown) => !shown)}><Plus size={15} />{t("lookup.addMetadata")}</button></div>
                {showMetadata && <form className="metadata-form" onSubmit={handleMetadata}>
                  <input aria-label={t("metadata.keyLabel")} placeholder={t("metadata.keyPlaceholder")} value={metadataKey} onChange={(event) => setMetadataKey(event.target.value)} pattern="[a-zA-Z0-9_]{1,32}" required />
                  <input aria-label={t("metadata.valueLabel")} placeholder={t("metadata.valuePlaceholder")} value={metadataValue} onChange={(event) => setMetadataValue(event.target.value)} maxLength={1000} required />
                  <button className="primary-button" disabled={writing}>{writing ? <LoaderCircle className="spin" size={15} /> : <ArrowUpRight size={15} />}{writing ? t("metadata.signing") : t("metadata.save")}</button>
                </form>}
              </div> : <div className="empty-shipment"><span className="empty-icon"><FileSearch size={23} /></span><strong>{t("lookup.emptyTitle")}</strong><span>{t("lookup.emptyBody")}</span></div>}
              <div className="panel-bottom-note"><span>{t("lookup.unitsNote")}</span><a href={`https://stellar.expert/explorer/${appNetwork}/contract/${configuredContractId || ""}`} target="_blank" rel="noreferrer">{t("lookup.viewContract")} <ExternalLink size={13} /></a></div>
            </section>

            <section className="panel activity-panel" id="activity">
              <div className="panel-heading">
                <div><div className="section-kicker">{t("activity.kicker")}</div><h2>{t("activity.title")}</h2></div>
                <button className="icon-button refresh-button" title={t("activity.refresh")} onClick={() => fetch(`${backendUrl}/api/events?limit=8`).then((response) => response.json()).then(setEvents).catch(() => setError(t("activity.refreshError")))}><RefreshCw size={16} /></button>
              </div>
              {events.length ? <div className="event-list">{events.map((event) => <article className="event-row" key={event.id}>
                <span className="event-mark"><ShieldCheck size={15} /></span>
                <span className="event-copy"><strong>{t("activity.escalated")}</strong><small>{t("activity.milestone", { shipment: event.shipmentId, index: event.milestoneIndex + 1 })}</small></span>
                <span className="event-ledger">L{event.ledger.toLocaleString()}</span>
              </article>)}</div> : <div className="empty-events"><span className="empty-icon subtle-icon"><Bell size={21} /></span><strong>{t("activity.emptyTitle")}</strong><span>{t("activity.emptyBody")}</span></div>}
              <div className="activity-footer"><span className="stream-dot" />{t("activity.listening")}<span className="stream-status">{apiState === "online" ? t("activity.connected") : t("activity.offline")}</span></div>
            </section>
          </div>

          <section className="panel table-panel">
            <div className="panel-heading table-heading">
              <div><div className="section-kicker">{t("record.kicker")}</div><h2>{t("record.title")}</h2></div>
              <button className="filter-button" onClick={() => { setShipment(null); setShipmentId(""); }}>{t("record.clear")} <X size={14} /></button>
            </div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>{t("record.shipment")}</th><th>{t("record.status")}</th><th>{t("record.escrow")}</th><th>{t("record.milestones")}</th><th>{t("record.disputes")}</th><th>{t("record.createdLedger")}</th></tr></thead>
                <tbody>{shipment ? <tr><td><span className="table-id"><span className="table-file"><FileSearch size={14} /></span>{shipment.id}</span></td><td><span className={`status-pill ${status.toLowerCase()}`}><span />{status}</span></td><td>{amount(shipment.total_amount)} <span className="muted">{t("lookup.units")}</span></td><td>{shipment.milestone_count}</td><td>{shipment.open_disputes > 0 ? <span className="dispute-count">{t("record.open", { count: shipment.open_disputes })}</span> : t("record.none")}</td><td>{shipment.created_at.toLocaleString()}</td></tr> : <tr><td colSpan={6} className="table-empty">{t("record.empty")}</td></tr>}</tbody>
              </table>
            </div>
          </section>

          <footer className="page-footer"><span>{t("footer.tagline")}</span><span><span className="footer-live" />{appNetwork} <span className="footer-sep">·</span> {t("footer.contract", { id: configuredContractId ? shortAddress(configuredContractId) : t("footer.notConfigured") })}</span></footer>
        </div>}
      </main>
    </div>
  );
}

export default App;
