import { test, expect } from '@playwright/test';

/**
 * Full-stack end-to-end test (#115)
 *
 * Tests the complete flow:
 * 1. User creates a shipment via the frontend
 * 2. Backend detects the contract event
 * 3. Frontend displays the shipment with confirmed status
 *
 * Prerequisites:
 *   - Soroban sandbox running (soroban-cli)
 *   - Contract deployed to sandbox
 *   - Backend event monitor running
 *   - Frontend dev server running
 *
 * Setup script (add to package.json):
 *   "e2e:setup": "soroban contract build && soroban contract deploy ..."
 *   "e2e:run": "npm run e2e:setup && npm run e2e"
 */

test.describe('Full-Stack Shipment Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the shipments page
    await page.goto('/shipments');

    // Wait for the page to be fully loaded
    await page.waitForLoadState('networkidle');
  });

  test('Create shipment → Confirm milestone → See UI update', async ({ page }) => {
    // Step 1: Create a shipment
    const createButton = page.getByRole('button', { name: /create shipment/i });
    await expect(createButton).toBeVisible();
    await createButton.click();

    // Fill in shipment form
    await page.getByLabel(/origin/i).fill('Shanghai Port');
    await page.getByLabel(/destination/i).fill('Rotterdam Port');
    await page.getByLabel(/cargo/i).fill('Electronics');
    await page.getByLabel(/value/i).fill('50000');

    // Submit the form
    const submitButton = page.getByRole('button', { name: /submit/i });
    await submitButton.click();

    // Step 2: Wait for shipment to appear in the list
    // The backend should pick up the contract event within a few seconds
    const shipmentRow = page.getByText(/Shanghai Port.*Rotterdam Port/);
    await expect(shipmentRow).toBeVisible({ timeout: 10000 });

    // Step 3: Verify the shipment shows the created milestone
    const createdMilestone = page.getByText(/created/i).first();
    await expect(createdMilestone).toBeVisible();

    // Step 4: Trigger a milestone confirmation (simulating real-world confirmation)
    // Click on the shipment to open details
    await shipmentRow.click();

    // Confirm the first milestone
    const confirmButton = page.getByRole('button', { name: /confirm.*milestone/i }).first();
    await expect(confirmButton).toBeVisible();
    await confirmButton.click();

    // Step 5: Verify UI updates to show confirmed status
    // The backend should detect the confirmation event within a few seconds
    const confirmedStatus = page.getByText(/confirmed/i);
    await expect(confirmedStatus).toBeVisible({ timeout: 10000 });

    // Verify the milestone shows completion time
    const completionTime = page.getByText(/completed at/i);
    await expect(completionTime).toBeVisible();
  });

  test('Multiple shipments are properly displayed', async ({ page }) => {
    // Create first shipment
    const createButton = page.getByRole('button', { name: /create shipment/i });

    for (let i = 0; i < 3; i++) {
      await createButton.click();
      await page.getByLabel(/origin/i).fill(`Port A ${i}`);
      await page.getByLabel(/destination/i).fill(`Port B ${i}`);
      await page.getByLabel(/cargo/i).fill(`Cargo ${i}`);
      await page.getByLabel(/value/i).fill(`${10000 + i * 1000}`);
      await page.getByRole('button', { name: /submit/i }).click();

      // Wait for shipment to appear
      await expect(
        page.getByText(new RegExp(`Port A ${i}.*Port B ${i}`))
      ).toBeVisible({ timeout: 10000 });
    }

    // Verify all three shipments are in the list
    const rows = page.getByRole('row');
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test('Event monitor detects contract events within reasonable time', async ({ page }) => {
    // Create a shipment and measure how long until it appears in the UI
    const startTime = Date.now();

    const createButton = page.getByRole('button', { name: /create shipment/i });
    await createButton.click();
    await page.getByLabel(/origin/i).fill('Test Port A');
    await page.getByLabel(/destination/i).fill('Test Port B');
    await page.getByLabel(/cargo/i).fill('Test Cargo');
    await page.getByLabel(/value/i).fill('25000');
    await page.getByRole('button', { name: /submit/i }).click();

    // Wait for the shipment to appear with a timeout of 15 seconds
    // (Event polling + indexing + frontend refresh should be fast)
    const shipmentAppears = page.getByText(/Test Port A.*Test Port B/);
    await expect(shipmentAppears).toBeVisible({ timeout: 15000 });

    const endTime = Date.now();
    const timeToAppear = endTime - startTime;

    // Log performance metrics
    console.log(`Event appeared in UI after ${timeToAppear}ms`);

    // Event monitor should detect within 10 seconds
    // (Most of the time will be from the initial contract call, not monitoring)
    expect(timeToAppear).toBeLessThan(15000);
  });
});
