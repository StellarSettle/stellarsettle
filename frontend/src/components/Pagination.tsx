import { ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  label: string;
};

export function Pagination({ page, pageCount, onPageChange, label }: Props) {
  if (pageCount <= 1) return null;
  return (
    <nav className="pagination" aria-label={`${label} pagination`}>
      <button type="button" className="page-button" onClick={() => onPageChange(page - 1)} disabled={page <= 1} aria-label="Previous page">
        <ChevronLeft size={14} />Prev
      </button>
      <span className="page-status" aria-live="polite">Page {page} of {pageCount}</span>
      <button type="button" className="page-button" onClick={() => onPageChange(page + 1)} disabled={page >= pageCount} aria-label="Next page">
        Next<ChevronRight size={14} />
      </button>
    </nav>
  );
}
