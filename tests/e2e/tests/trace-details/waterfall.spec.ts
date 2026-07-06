import { test, expect } from '../../fixtures/auth';
import {
	gotoTraceUntilLoaded,
	loadLargeTrace,
	seedTracesViaSeeder,
} from '../../helpers/trace-details';

const trace = loadLargeTrace();

test.describe('Trace details — waterfall', () => {
	test.beforeAll(async ({ playwright }) => {
		const request = await playwright.request.newContext();
		await seedTracesViaSeeder(request, trace.spans);
		await request.dispose();
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

	test('TC-02 deep-linking a deeply-nested span auto-expands ancestors and scrolls it into view', async ({
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
});
