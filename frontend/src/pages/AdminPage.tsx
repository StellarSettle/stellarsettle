import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { LoaderCircle, Pause, Play, ShieldCheck, WalletCards } from "lucide-react";
import {
  configuredAdminAddress,
  getFeeConfig,
  hasRole,
  isPaused,
  roles,
  setFeeConfig,
  setPaused,
  setRole,
  type FeeConfig,
  type Role,
  type Wallet,
} from "../lib/stellar";

type Props = {
  wallet: Wallet | null;
  onConnect: () => void;
  onError: (message: string) => void;
  onNotice: (message: string) => void;
};

type Access = { admin: boolean; pauser: boolean; feeManager: boolean };

function short(address: string) {
  return `${address.slice(0, 5)}...${address.slice(-5)}`;
}

export function AdminPage({ wallet, onConnect, onError, onNotice }: Props) {
  const { t } = useTranslation();
  const [access, setAccess] = useState<Access | null>(null);
  const [paused, setPausedState] = useState<boolean | null>(null);
  const [fee, setFee] = useState<FeeConfig | null>(null);
  const [busy, setBusy] = useState("");
  const [role, setRoleChoice] = useState<Role>("Pauser");
  const [target, setTarget] = useState("");
  const [roleStatus, setRoleStatus] = useState("");
  const [feeBps, setFeeBps] = useState("");
  const [treasury, setTreasury] = useState("");

  useEffect(() => {
    setAccess(null);
    if (!wallet) return;
    let cancelled = false;
    const address = wallet.address;
    Promise.all([
      hasRole(address, "Pauser", address).catch(() => false),
      hasRole(address, "FeeManager", address).catch(() => false),
    ]).then(([pauser, feeManager]) => {
      if (!cancelled) setAccess({ admin: !!configuredAdminAddress && configuredAdminAddress === address, pauser, feeManager });
    });
    isPaused(address).then((value) => !cancelled && setPausedState(value)).catch(() => undefined);
    getFeeConfig(address).then((value) => !cancelled && setFee(value)).catch(() => undefined);
    return () => { cancelled = true; };
  }, [wallet]);

  async function run(key: string, action: () => Promise<string>, success: (hash: string) => string) {
    setBusy(key);
    try {
      onNotice(success((await action()).slice(0, 12)));
    } catch (cause) {
      onError(cause instanceof Error ? cause.message : t("admin.error"));
    } finally {
      setBusy("");
    }
  }

  async function togglePause() {
    if (!wallet || paused === null) return;
    const next = !paused;
    await run("pause", () => setPaused(wallet, next), (hash) => t(next ? "admin.pausedNotice" : "admin.unpausedNotice", { hash }));
    setPausedState(await isPaused(wallet.address).catch(() => paused));
  }

  async function checkRole() {
    if (!wallet || !target.trim()) return;
    const held = await hasRole(wallet.address, role, target.trim()).catch(() => false);
    setRoleStatus(t(held ? "admin.hasRole" : "admin.lacksRole", { address: short(target.trim()), role }));
  }

  async function changeRole(grant: boolean) {
    if (!wallet || !target.trim()) return;
    const address = target.trim();
    await run(grant ? "grant" : "revoke", () => setRole(wallet, role, address, grant), () => t(grant ? "admin.granted" : "admin.revoked", { role, address: short(address) }));
    await checkRole();
  }

  async function saveFee(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!wallet) return;
    const bps = Number(feeBps);
    await run("fee", () => setFeeConfig(wallet, bps, treasury.trim()), (hash) => t("admin.feeSaved", { hash }));
    setFee(await getFeeConfig(wallet.address).catch(() => fee));
  }

  const heading = <section className="page-heading"><div><div className="eyebrow"><span className="eyebrow-rule" />{t("admin.eyebrow")}</div><h1>{t("admin.title")}</h1><p>{t("admin.subtitle")}</p></div></section>;

  if (!wallet) return <>{heading}<div className="inline-callout"><WalletCards size={16} /><span>{t("admin.connectFirst")}</span><button onClick={onConnect}>{t("wallet.calloutButton")}</button></div></>;
  if (!access) return <>{heading}<div className="inline-callout"><LoaderCircle className="spin" size={16} /><span>{t("admin.checking")}</span></div></>;
  if (!access.admin && !access.pauser && !access.feeManager) return <>{heading}<div className="inline-callout" role="alert"><ShieldCheck size={16} /><span>{t("admin.denied")}</span></div></>;

  return <>
    {heading}
    <div className="content-grid">
      {(access.admin || access.pauser) && <section className="panel">
        <div className="panel-heading"><div><div className="section-kicker">{t("admin.pauseKicker")}</div><h2>{t("admin.pauseTitle")}</h2></div>
          <span className={`status-pill ${paused ? "disputed" : "active"}`}><span />{paused === null ? "—" : paused ? t("admin.paused") : t("admin.active")}</span></div>
        <button className="primary-button" disabled={busy !== "" || paused === null} onClick={togglePause}>
          {busy === "pause" ? <LoaderCircle className="spin" size={15} /> : paused ? <Play size={15} /> : <Pause size={15} />}{paused ? t("admin.unpause") : t("admin.pause")}
        </button>
      </section>}

      {(access.admin || access.feeManager) && <section className="panel">
        <div className="panel-heading"><div><div className="section-kicker">{t("admin.feeKicker")}</div><h2>{t("admin.feeTitle")}</h2></div></div>
        <p className="muted">{fee ? t("admin.current", { bps: fee.fee_bps, treasury: short(fee.treasury) }) : t("admin.noFee")}</p>
        <form className="metadata-form" onSubmit={saveFee}>
          <input aria-label={t("admin.feeBps")} placeholder={t("admin.feeBps")} type="number" min={0} max={1000} value={feeBps} onChange={(event) => setFeeBps(event.target.value)} required />
          <input aria-label={t("admin.treasury")} placeholder={t("admin.treasury")} value={treasury} onChange={(event) => setTreasury(event.target.value)} required />
          <button className="primary-button" disabled={busy !== ""}>{busy === "fee" && <LoaderCircle className="spin" size={15} />}{t("admin.saveFee")}</button>
        </form>
      </section>}
    </div>

    {access.admin && <section className="panel">
      <div className="panel-heading"><div><div className="section-kicker">{t("admin.rolesKicker")}</div><h2>{t("admin.rolesTitle")}</h2></div></div>
      <form className="metadata-form" onSubmit={(event) => { event.preventDefault(); void checkRole(); }}>
        <select aria-label={t("admin.role")} value={role} onChange={(event) => { setRoleChoice(event.target.value as Role); setRoleStatus(""); }}>
          {roles.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <input aria-label={t("admin.address")} placeholder={t("admin.addressPlaceholder")} value={target} onChange={(event) => { setTarget(event.target.value); setRoleStatus(""); }} required />
        <button className="filter-button" disabled={busy !== ""}>{t("admin.check")}</button>
        <button type="button" className="primary-button" disabled={busy !== "" || !target.trim()} onClick={() => changeRole(true)}>{busy === "grant" && <LoaderCircle className="spin" size={15} />}{t("admin.grant")}</button>
        <button type="button" className="primary-button" disabled={busy !== "" || !target.trim()} onClick={() => changeRole(false)}>{busy === "revoke" && <LoaderCircle className="spin" size={15} />}{t("admin.revoke")}</button>
      </form>
      {roleStatus && <p className="muted" role="status">{roleStatus}</p>}
    </section>}
  </>;
}
