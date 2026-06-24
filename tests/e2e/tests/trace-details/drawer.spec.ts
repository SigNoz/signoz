import { test, expect } from '../../fixtures/auth';
import {
	gotoTraceUntilLoaded,
	loadLargeTrace,
	seedTracesViaSeeder,
} from '../../helpers/trace-details';

// One shared trace for the whole file, seeded once. Unique ids per run keep this
// isolated from other parallel specs; the global teardown clears the traces signal.
const trace = loadLargeTrace();

test.describe('Trace details — span details drawer', () => {
	test.beforeAll(async ({ browser }) => {
		// Seed once. The seeder needs no auth, so a plain page is fine here
		// (beforeAll can't use the test-scoped authedPage fixture).
		const page = await browser.newPage();
		await seedTracesViaSeeder(page, trace.spans);
		await page.close();
	});

	test.beforeEach(async ({ authedPage: page }) => {
		// open the trace, reloading until the waterfall renders (seed→query lag)
		await gotoTraceUntilLoaded(
			page,
			`/trace/${trace.traceId}`,
			`cell-0-${trace.landmarks.root}`,
		);
	});

	test('TC-01 clicking a span selects it and opens the drawer', async ({
		authedPage: page,
	}) => {
		const errorSpan = trace.landmarks.errors[0];
		await page.getByTestId(`cell-0-${errorSpan}`).click();

		// selection is reflected in the URL...
		await expect(page).toHaveURL(new RegExp(`spanId=${errorSpan}`));
		// ...and the drawer is open (the Overview tab only exists in the drawer)
		await expect(page.getByRole('tab', { name: /overview/i })).toBeVisible();
	});

	test('TC-02 drawer shows the selected span’s attributes', async ({
		authedPage: page,
	}) => {
		// Click the DB span; its attribute value should appear in the overview
		// (attribute values render only in the drawer, not the waterfall rows).
		await page.getByTestId(`cell-0-${trace.landmarks.db}`).click();

		await expect(page.getByRole('tab', { name: /overview/i })).toBeVisible();
		await expect(page.getByText('redis', { exact: false })).toBeVisible();
	});

	test('TC-03 dock-mode switching toggles the drawer between floating and docked', async ({
		authedPage: page,
	}) => {
		await page.getByTestId(`cell-0-${trace.landmarks.root}`).click();
		await expect(page.getByRole('tab', { name: /overview/i })).toBeVisible();

		// Default is docked-right → not a floating panel (no drag handle).
		await expect(page.locator('.floating-panel__drag-handle')).toHaveCount(0);

		// Switch to floating (dialog) → the drag handle appears.
		await page.getByTestId('dock-mode-dialog').click();
		await expect(page.locator('.floating-panel__drag-handle')).toBeVisible();

		// Switch to docked-bottom → floating handle gone again.
		await page.getByTestId('dock-mode-docked').click();
		await expect(page.locator('.floating-panel__drag-handle')).toHaveCount(0);
	});

	test('TC-04 the floating drawer can be dragged', async ({
		authedPage: page,
	}) => {
		await page.getByTestId(`cell-0-${trace.landmarks.root}`).click();
		await page.getByTestId('dock-mode-dialog').click();

		const handle = page.locator('.floating-panel__drag-handle');
		await expect(handle).toBeVisible();

		const zero = { x: 0, y: 0, width: 0, height: 0 };
		const before = (await handle.boundingBox()) ?? zero;
		// Drag from the left of the header (title area) to avoid the action buttons.
		const startX = before.x + 30;
		const startY = before.y + before.height / 2;
		await page.mouse.move(startX, startY);
		await page.mouse.down();
		await page.mouse.move(startX - 120, startY + 80, { steps: 8 });
		await page.mouse.up();

		await expect
			.poll(async () => Math.round(((await handle.boundingBox()) ?? before).x))
			.toBeLessThan(Math.round(before.x));
	});

	test('TC-05 a dock-mode change persists and is restored on reload', async ({
		authedPage: page,
	}) => {
		// §0 prefs-boot, UI-first: switch to floating via the dock-mode UI (which
		// persists the variant), then reload and confirm it's restored — the drawer
		// boots floating, not the docked-right default.
		await page.getByTestId(`cell-0-${trace.landmarks.root}`).click();
		await page.getByTestId('dock-mode-dialog').click();
		await expect(page.locator('.floating-panel__drag-handle')).toBeVisible();

		await page.reload();
		await page.getByTestId(`cell-0-${trace.landmarks.root}`).click();

		await expect(page.locator('.floating-panel__drag-handle')).toBeVisible();
	});
});
