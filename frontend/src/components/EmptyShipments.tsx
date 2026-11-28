import React from 'react';
import { PackageOpen } from 'lucide-react';

export interface EmptyShipmentsProps {
  /**
   * Callback invoked when the user clicks the "Create your first shipment"
   * call-to-action button. Typically opens or navigates to the
   * CreateShipmentForm.
   */
  onCreate?: () => void;
}

/**
 * Empty state shown in the shipment list when the connected user has no
 * shipments yet. Provides an illustration, explanatory copy, and a
 * call-to-action to create the first shipment.
 */
const EmptyShipments: React.FC<EmptyShipmentsProps> = ({ onCreate }) => {
  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="empty-shipments"
      className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
        <PackageOpen
          className="h-8 w-8 text-gray-400"
          aria-hidden="true"
          data-testid="empty-shipments-icon"
        />
      </div>

      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-gray-900">
          No shipments yet
        </h2>
        <p className="max-w-sm text-sm text-gray-500">
          You don&apos;t have any shipments. Create your first shipment to get
          started and track its progress here.
        </p>
      </div>

      <button
        type="button"
        onClick={onCreate}
        data-testid="empty-shipments-create-button"
        className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
      >
        Create your first shipment
      </button>
    </div>
  );
};

export default EmptyShipments;