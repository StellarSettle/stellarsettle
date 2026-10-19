import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, Gavel, LoaderCircle, RefreshCw, ShieldCheck, WalletCards, X } from "lucide-react";
import { getArbiterDisputes, resolveDispute, type DisputeEntry, type Wallet } from "../lib/stellar";

type Props = {
  wallet: Wallet | null;
  onConnect: () => void;
  onError: (message: string) => void;
  onNotice: (message: string) => void;
};

const keyOf = (entry: DisputeEntry) => `${entry.shipment_id}:${entry.milestone_index}`;

export function ArbiterPage({ wallet, onConnect, onError, onNotice }: Props) {
  const { t } = useTranslation();
  const [disputes, setDisputes] = useState<DisputeEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [resolving, setResolving] = useState("");

  const load = useCallback(async () => {
    if (!wallet) return;
    setLoading(true);
    try {
      setDisputes(await getArbiterDisputes(wallet.address));
    } catch (cause) {
      onError(cause instanceof Error ? cause.message : t("arbiter.loadError"));
    } finally {
      setLoading(false);
    }
  }, [wallet, onError, t]);

  useEffect(() => {
    setDisputes([]);
    void load();
  }, [wallet]);

  async function resolve(entry: DisputeEntry, approve: boolean) {
    if (!wallet) return;
    const key = keyOf(entry);
    setResolving(key);
    try {
      const hash = await resolveDispute(wallet, entry.shipment_id, entry.milestone_index, approve);
      setDisputes((current) => current.filter((item) => keyOf(item) !== key));
      onNotice(t("arbiter.resolved", { shipment: entry.shipment_id, hash: hash.slice(0, 12) }));
    } catch (cause) {
      onError(cause instanceof Error ? cause.message : t("arbiter.resolveError"));
    } finally {
      setResolving("");
    }
  }

  const heading = <section className="page-heading"><div><div className="eyebrow"><span className="eyebrow-rule" />{t("arbiter.eyebrow")}</div><h1>{t("arbiter.title")}</h1><p>{t("arbiter.subtitle")}</p></div></section>;

  if (!wallet) return <>{heading}<div className="inline-callout"><WalletCards size={16} /><span>{t("arbiter.connectFirst")}</span><button onClick={onConnect}>{t("wallet.calloutButton")}</button></div></>;

  return <>
    {heading}
    <section className="panel">
      <div className="panel-heading">
        <div><div className="section-kicker">{t("arbiter.queueKicker")}</div><h2>{t("arbiter.queueTitle")}</h2></div>
        <button className="icon-button refresh-button" title={t("arbiter.refresh")} onClick={() => void load()}>{loading ? <LoaderCircle className="spin" size={16} /> : <RefreshCw size={16} />}</button>
      </div>
      {disputes.length ? <div className="event-list">{disputes.map((entry) => {
        const key = keyOf(entry);
        return <article className="event-row" key={key}>
          <span className="event-mark"><Gavel size={15} /></span>
          <span className="event-copy"><strong>{entry.shipment_id}</strong><small>{t("arbiter.milestone", { index: entry.milestone_index + 1 })}</small></span>
          <span className="top-actions">
            <button className="primary-button" disabled={resolving !== ""} onClick={() => resolve(entry, true)}>{resolving === key ? <LoaderCircle className="spin" size={15} /> : <Check size={15} />}{t("arbiter.approve")}</button>
            <button className="filter-button" disabled={resolving !== ""} onClick={() => resolve(entry, false)}><X size={14} />{t("arbiter.reject")}</button>
          </span>
        </article>;
      })}</div> : !loading && <div className="empty-events"><span className="empty-icon subtle-icon"><ShieldCheck size={21} /></span><strong>{t("arbiter.emptyTitle")}</strong><span>{t("arbiter.emptyBody")}</span></div>}
    </section>
  </>;
}
