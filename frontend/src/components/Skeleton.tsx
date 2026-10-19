type BlockProps = { width?: string; height?: number; className?: string };

export function SkeletonBlock({ width = "100%", height = 12, className = "" }: BlockProps) {
  return <span className={`skeleton ${className}`} style={{ width, height }} aria-hidden="true" />;
}

export function MetricSkeleton() {
  return (
    <article className="metric" aria-hidden="true" data-testid="metric-skeleton">
      <div className="metric-top"><SkeletonBlock width="45%" height={10} /><SkeletonBlock width="27px" height={27} /></div>
      <div className="metric-value"><SkeletonBlock width="65%" height={24} /></div>
      <div className="metric-foot"><SkeletonBlock width="55%" height={10} /></div>
    </article>
  );
}

export function ShipmentDetailSkeleton() {
  return (
    <div className="shipment-detail" role="status" aria-label="Loading shipment" data-testid="shipment-skeleton">
      <div className="detail-topline">
        <div className="shipment-ref"><SkeletonBlock width="36px" height={36} /><span><SkeletonBlock width="140px" height={14} /><SkeletonBlock width="110px" height={10} /></span></div>
        <SkeletonBlock width="80px" height={22} />
      </div>
      <div className="detail-grid">
        {Array.from({ length: 4 }, (_, index) => <div key={index}><SkeletonBlock width="60%" height={9} /><SkeletonBlock width="75%" height={18} /></div>)}
      </div>
      <div className="detail-footer"><SkeletonBlock width="55%" height={12} /><SkeletonBlock width="90px" height={12} /></div>
    </div>
  );
}

export function EventListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="event-list" role="status" aria-label="Loading events" data-testid="events-skeleton">
      {Array.from({ length: rows }, (_, index) => (
        <article className="event-row" key={index}>
          <SkeletonBlock width="30px" height={30} className="event-mark" />
          <span className="event-copy"><SkeletonBlock width="60%" height={12} /><SkeletonBlock width="40%" height={10} /></span>
          <SkeletonBlock width="48px" height={10} />
        </article>
      ))}
    </div>
  );
}
