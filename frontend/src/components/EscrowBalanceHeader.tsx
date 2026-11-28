import { amount } from "../lib/format";

type Props = {
  loading: boolean;
  balance: string | null;
  totalAmount?: string;
};

export function EscrowBalanceHeader({ loading, balance, totalAmount }: Props) {
  return (
    <div className="escrow-balance-header">
      <span>LOCKED ESCROW</span>
      <strong>
        {loading ? "--" : balance === null ? "--" : `${amount(balance)}`}
        {totalAmount && !loading && balance !== null ? (
          <small> of {amount(totalAmount)}</small>
        ) : null}
      </strong>
    </div>
  );
}