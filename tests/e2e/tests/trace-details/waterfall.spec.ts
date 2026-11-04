import {
	expect,
	loadLargeTrace,
	seedTracesViaSeeder,
	test,
} from '../../drivers/traces';

const trace = loadLargeTrace();

test.describe('Trace details — waterfall', () => {
	test.beforeAll(async ({ playwright }) => {
		const request = await playwright.request.newContext();
		await seedTracesViaSeeder(request, trace.spans);
		await request.dispose();
	});

	test('TC-01 deep-link ?spanId auto-selects the span and opens the drawer', async ({
		traces,
	}) => {
		// Open the trace pre-pointed at a specific span via the URL, reloading
		// until the waterfall renders (seed→query lag).
		const errorSpan = trace.landmarks.errors[0];
		await traces.goto(
			`/trace/${trace.traceId}?spanId=${errorSpan}`,
			`cell-0-${errorSpan}`,
		);

		// the deep-linked span's row renders...
		await expect(traces.span.row(errorSpan)).toBeVisible();
		// ...and it auto-selects → the drawer is open (Overview tab is drawer-only)
		await expect(traces.span.overviewTab()).toBeVisible();
	});

	test('TC-02 deep-linking a deeply-nested span auto-expands ancestors and scrolls it into view', async ({
		traces,
		authedPage: page,
	}) => {
		// deepLeaf sits ~34 levels down; rendering its row at all proves every
		// ancestor auto-expanded and the waterfall scrolled it into view.
		const deep = trace.landmarks.deepLeaf;
		await traces.goto(`/trace/${trace.traceId}?spanId=${deep}`, `cell-0-${deep}`);

		await expect(traces.span.row(deep)).toBeVisible();
		await expect(page).toHaveURL(new RegExp(`spanId=${deep}`));
	});
});
