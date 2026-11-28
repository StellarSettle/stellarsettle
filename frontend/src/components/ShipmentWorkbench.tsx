import { useState } from "react";
import type { Wallet } from "../lib/stellar";
import { ShipmentRoleList } from "./ShipmentRoleList";
import { SupplierProfile } from "./SupplierProfile";
import { MilestoneTemplateManager } from "./MilestoneTemplateManager";
import { PartyTransferPanel } from "./PartyTransferPanel";
import { EmptyShipments } from "./EmptyShipments";
import { SkeletonShipmentDetail } from "./SkeletonShipmentDetail";
import { useToast } from "../lib/useToast";

export interface TransactionLifecycleCallbacks {
  onSubmitted: () => void;
  onConfirmed: (ledger: number) => void;
  onFailed: (error: unknown) => void;
}

function extractErrorCode(error: unknown): string {
  if (error && typeof error === "object") {
    const maybe = error as { code?: unknown; errorCode?: unknown; message?: unknown };
    if (typeof maybe.code === "string" || typeof maybe.code === "number") {
      return String(maybe.code);
    }
    if (typeof maybe.errorCode === "string" || typeof maybe.errorCode === "number") {
      return String(maybe.errorCode);
    }
    if (typeof maybe.message === "string" && maybe.message.length > 0) {
      return maybe.message;
    }
  }
  if (typeof error === "string" && error.length > 0) {
    return error;
  }
  return "UNKNOWN";
}

export function ShipmentWorkbench({ wallet }: { wallet: Wallet | null }) {
  const { showToast } = useToast();
  const [shipments, setShipments] = useState<unknown[]>([]);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  const transactionCallbacks: TransactionLifecycleCallbacks = {
    onSubmitted: () => {
      showToast("Transaction submitted");
    },
    onConfirmed: (ledger: number) => {
      showToast(`Confirmed in ledger ${ledger}`);
    },
    onFailed: (error: unknown) => {
      showToast(`Transaction failed (error code: ${extractErrorCode(error)})`);
    },
  };

  const hasShipments = shipments.length > 0;

  return (
    <div className="shipment-workbench" style={{ display: "grid", gap: 16, marginTop: 16 }}>
      {isLoadingDetail ? (
        <SkeletonShipmentDetail />
      ) : hasShipments ? (
        <ShipmentRoleList
          wallet={wallet}
          shipments={shipments}
          transactionCallbacks={transactionCallbacks}
        />
      ) : (
        <EmptyShipments onCreateFirstShipment={() => setShipments([])} />
      )}
      <MilestoneTemplateManager wallet={wallet} transactionCallbacks={transactionCallbacks} />
      <SupplierProfile wallet={wallet} transactionCallbacks={transactionCallbacks} />
      <PartyTransferPanel wallet={wallet} transactionCallbacks={transactionCallbacks} />
    </div>
  );
}