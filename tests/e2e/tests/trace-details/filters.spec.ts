import { test, expect } from '../../fixtures/auth';
import {
	gotoTraceUntilLoaded,
	loadLargeTrace,
	seedTracesViaSeeder,
} from '../../helpers/trace-details';

// §4 filters — scoped to the highlight-errors switch (the other filter controls,
// query input + category toggles + result nav, are covered by unit tests).
// Toggling it ANDs `has_error = true` into the filter and runs it, so error spans
// match (highlighted) and everything else dims. Each row exposes its filter state
// via data-span-state (the styles.* classes are hashed at build time).
//
// Asserted by state presence, not by specific span ids: running the filter
// auto-selects the first match and scrolls the (virtualized) waterfall to it, so
// which rows are in the DOM shifts. Flamegraph dim is canvas — waterfall only.
const trace = loadLargeTrace();

test.describe('Trace details — highlight errors', () => {
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

	test('TC-01 toggling highlight-errors highlights matches and dims the rest', async ({
		authedPage: page,
	}) => {
		// Before: no filter active → no row is highlighted or dimmed.
		await expect(page.locator('[data-span-state="highlighted"]')).toHaveCount(0);
		await expect(page.locator('[data-span-state="dimmed"]')).toHaveCount(0);

		// Toggle the switch inside the highlight-errors control.
		await page.getByTestId('highlight-errors-toggle').getByRole('switch').click();

		// After: matching (error) rows are highlighted and non-matching rows dim.
		await expect(
			page.locator('[data-span-state="highlighted"]').first(),
		).toBeVisible();
		await expect(
			page.locator('[data-span-state="dimmed"]').first(),
		).toBeVisible();
	});
});
