import { test, expect } from '../../fixtures/auth';
import {
	gotoTraceUntilLoaded,
	loadLargeTrace,
	seedTracesViaSeeder,
} from '../../helpers/trace-details';

// §1 header — the Analytics FloatingPanel. The action cluster (Analytics button
// + options menu) only renders once trace data is loaded, which gotoTraceUntilLoaded
// guarantees by waiting for the root waterfall row.
//
// Not covered here: subheader summary (presentational → unit test), colour-by /
// options menu / trace-id copy (unit), Noz button (feature-flagged, lives in the
// filter bar). Resize is deferred — react-rnd's resize handles have no stable hook.
const trace = loadLargeTrace();

test.describe('Trace details — header analytics panel', () => {
	test.beforeAll(async ({ playwright }) => {
		const request = await playwright.request.newContext();
		await seedTracesViaSeeder(request, trace.spans);
		await request.dispose();
	});

	test.beforeEach(async ({ authedPage: page }) => {
		await gotoTraceUntilLoaded(
			page,
			`/trace/${trace.traceId}`,
			`cell-0-${trace.landmarks.root}`,
		);
	});

	test('TC-01 the analytics panel can be dragged by its header', async ({
		authedPage: page,
	}) => {
		await page.getByRole('button', { name: 'Analytics' }).click();
		const panel = page.getByTestId('trace-analytics-panel');
		await expect(panel).toBeVisible();

		const zero = { x: 0, y: 0, width: 0, height: 0 };
		const before = (await panel.boundingBox()) ?? zero;
		const hb =
			(await page.locator('.floating-panel__drag-handle').boundingBox()) ?? zero;

		// Drag the header left + down.
		await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
		await page.mouse.down();
		await page.mouse.move(hb.x + hb.width / 2 - 120, hb.y + hb.height / 2 + 60, {
			steps: 8,
		});
		await page.mouse.up();

		// Panel shifted left.
		await expect
			.poll(async () => Math.round(((await panel.boundingBox()) ?? before).x))
			.toBeLessThan(Math.round(before.x));
	});
});
