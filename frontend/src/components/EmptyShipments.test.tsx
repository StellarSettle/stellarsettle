import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import EmptyShipments from './EmptyShipments';

describe('EmptyShipments', () => {
  it('renders the empty-state explanatory text', () => {
    render(<EmptyShipments onCreate={vi.fn()} />);

    expect(
      screen.getByText(/you have no shipments/i)
    ).toBeInTheDocument();
  });

  it('renders the create your first shipment call-to-action', () => {
    render(<EmptyShipments onCreate={vi.fn()} />);

    expect(
      screen.getByRole('button', { name: /create your first shipment/i })
    ).toBeInTheDocument();
  });

  it('invokes the onCreate callback when the CTA is clicked', () => {
    const onCreate = vi.fn();
    render(<EmptyShipments onCreate={onCreate} />);

    fireEvent.click(
      screen.getByRole('button', { name: /create your first shipment/i })
    );

    expect(onCreate).toHaveBeenCalledTimes(1);
  });
});