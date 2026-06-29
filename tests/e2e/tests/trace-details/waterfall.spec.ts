import type { Page } from '@playwright/test';

import { test, expect } from '../../fixtures/auth';
import { newAdminContext } from '../../helpers/auth';
import {
	changeColourByViaMenu,
	gotoTraceUntilLoaded,
	loadLargeTrace,
	seedTracesViaSeeder,
	setColorByPreference,
} from '../../helpers/trace-details';

const trace = loadLargeTrace();

// Reads the --span-color CSS variable off a span's waterfall bar (cell-1 side).
// The bar recolors by the colour-by field via an inline CSS var — no canvas, so
// it's directly DOM-assertable.
async function waterfallSpanColor(
	page: Page,
	spanId: string,
): Promise<string | null> {
	const style =
		(await page
			.getByTestId(`cell-1-${spanId}`)
			.locator('[style*="--span-color"]')
			.first()
			.getAttribute('style')) ?? '';
	const match = style.match(/--span-color:\s*([^;]+)/);
	return match ? match[1].trim() : null;
}

test.describe('Trace details — waterfall', () => {
	test.beforeAll(async ({ playwright }) => {
		const request = await playwright.request.newContext();
		await seedTracesViaSeeder(request, trace.spans);
		await request.dispose();
	});

	test.afterAll(async ({ browser }) => {
		// TC-04 changes colour-by — a per-user pref. Reset it so it doesn't leak to
		// other specs (afterAll can't use the test-scoped authedPage fixture).
		const ctx = await newAdminContext(browser);
		const page = await ctx.newPage();
		await setColorByPreference(page, '');
		await ctx.close();
	});

	test('TC-01 deep-link ?spanId auto-selects the span and opens the drawer', async ({
		authedPage: page,
	}) => {
		// Open the trace pre-pointed at a specific span via the URL, reloading
		// until the waterfall renders (seed→query lag).
		const errorSpan = trace.landmarks.errors[0];
		await gotoTraceUntilLoaded(
			page,
			`/trace/${trace.traceId}?spanId=${errorSpan}`,
			`cell-0-${errorSpan}`,
		);

		// the deep-linked span's row renders...
		await expect(page.getByTestId(`cell-0-${errorSpan}`)).toBeVisible();
		// ...and it auto-selects → the drawer is open (Overview tab is drawer-only)
		await expect(page.getByRole('tab', { name: /overview/i })).toBeVisible();
	});

	test('TC-02 collapsing a span hides its descendants; expanding restores them', async ({
		authedPage: page,
	}) => {
		await gotoTraceUntilLoaded(
			page,
			`/trace/${trace.traceId}`,
			`cell-0-${trace.landmarks.root}`,
		);

		// A descendant (the db span, ~level 2) is visible by default — frontend
		// mode expands all parents on load.
		const descendant = `cell-0-${trace.landmarks.db}`;
		await expect(page.getByTestId(descendant)).toBeVisible();

		// Collapse the root: its subtree hides, the root row itself stays.
		await page.getByTestId(`cell-collapse-${trace.landmarks.root}`).click();
		await expect(
			page.getByTestId(`cell-0-${trace.landmarks.root}`),
		).toBeVisible();
		await expect(page.getByTestId(descendant)).toBeHidden();

		// Expand again: the descendant comes back.
		await page.getByTestId(`cell-collapse-${trace.landmarks.root}`).click();
		await expect(page.getByTestId(descendant)).toBeVisible();
	});

	test('TC-03 deep-linking a deeply-nested span auto-expands ancestors and scrolls it into view', async ({
		authedPage: page,
	}) => {
		// deepLeaf sits ~34 levels down; rendering its row at all proves every
		// ancestor auto-expanded and the waterfall scrolled it into view.
		const deep = trace.landmarks.deepLeaf;
		await gotoTraceUntilLoaded(
			page,
			`/trace/${trace.traceId}?spanId=${deep}`,
			`cell-0-${deep}`,
		);

		await expect(page.getByTestId(`cell-0-${deep}`)).toBeVisible();
		await expect(page).toHaveURL(new RegExp(`spanId=${deep}`));
	});

	test('TC-04 changing colour-by recolors the span bars', async ({
		authedPage: page,
	}) => {
		await gotoTraceUntilLoaded(
			page,
			`/trace/${trace.traceId}`,
			`cell-0-${trace.landmarks.root}`,
		);

		// colour-by persists per-user, so set an explicit baseline rather than
		// assuming the default. Root's color under service.name:
		await changeColourByViaMenu(page, 'service.name');
		const colorByService = await waterfallSpanColor(page, trace.landmarks.root);
		expect(colorByService).not.toBeNull();

		// Switch to host.name → the bar's --span-color CSS var updates.
		await changeColourByViaMenu(page, 'host.name');
		await expect
			.poll(() => waterfallSpanColor(page, trace.landmarks.root))
			.not.toBe(colorByService);
	});
});
