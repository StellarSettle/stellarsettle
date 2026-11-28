import React from 'react';
import { SkeletonBlock } from './Skeleton';

export interface SkeletonShipmentDetailProps {
  className?: string;
}

/**
 * Skeleton loader that mirrors the layout of the loaded shipment detail page.
 * All elements are non-interactive and hidden from assistive technology,
 * with a single status wrapper announcing the loading state.
 */
const SkeletonShipmentDetail: React.FC<SkeletonShipmentDetailProps> = ({ className }) => {
  return (
    <div
      className={className}
      data-testid="skeleton-shipment-detail"
      role="status"
      aria-label="Loading shipment detail"
    >
      <div aria-hidden="true">
        {/* Header / topline */}
        <div className="skeleton-shipment-detail__header">
          <SkeletonBlock width="40%" height="2rem" />
          <div className="skeleton-shipment-detail__topline">
            <SkeletonBlock width="6rem" height="1rem" />
            <SkeletonBlock width="8rem" height="1rem" />
            <SkeletonBlock width="5rem" height="1rem" />
          </div>
        </div>

        {/* Metadata grid */}
        <div className="skeleton-shipment-detail__metadata">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="skeleton-shipment-detail__metadata-item">
              <SkeletonBlock width="50%" height="0.75rem" />
              <SkeletonBlock width="80%" height="1rem" />
            </div>
          ))}
        </div>

        {/* Milestone / event sections */}
        <div className="skeleton-shipment-detail__sections">
          {Array.from({ length: 2 }).map((_, sectionIndex) => (
            <div key={sectionIndex} className="skeleton-shipment-detail__section">
              <SkeletonBlock width="30%" height="1.25rem" />
              <div className="skeleton-shipment-detail__section-items">
                {Array.from({ length: 3 }).map((_, itemIndex) => (
                  <div key={itemIndex} className="skeleton-shipment-detail__section-item">
                    <SkeletonBlock width="1.5rem" height="1.5rem" />
                    <div className="skeleton-shipment-detail__section-item-body">
                      <SkeletonBlock width="60%" height="1rem" />
                      <SkeletonBlock width="40%" height="0.75rem" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SkeletonShipmentDetail;