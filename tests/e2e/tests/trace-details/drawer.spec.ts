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
	test.beforeAll(async ({ playwright }) => {
		// Seed once via a disposable request context — no auth needed (direct
		// seeder call), and cheaper than spinning up a full browser page.
		const request = await playwright.request.newContext();
		await seedTracesViaSeeder(request, trace.spans);
		await request.dispose();
	});

	test.beforeEach(async ({ authedPage: page }) => {
		// open the trace, reloading until the waterfall renders (seed→query lag)
		await gotoTraceUntilLoaded(
			page,
			`/trace/${trace.traceId}`,
			`cell-0-${trace.landmarks.root}`,
		);
	});

	test('TC-01 the floating drawer can be dragged', async ({
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

	test('TC-02 a dock-mode change persists and is restored on reload', async ({
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
