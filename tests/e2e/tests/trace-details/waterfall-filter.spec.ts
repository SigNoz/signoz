import {
	expect,
	loadLargeTrace,
	seedTracesViaSeeder,
	test,
} from '../../drivers/traces';

const trace = loadLargeTrace();
const rootRow = `cell-0-${trace.landmarks.root}`;
const errorIds = new Set(trace.landmarks.errors);

// The filter lists matches in timestamp order.
const authSpans = trace.spans
	.filter((span) => span.resources?.['service.name'] === 'auth-service')
	.sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp))
	.map((span) => span.span_id);

test.describe('Trace details, waterfall filter', () => {
	test.beforeAll(async ({ playwright }) => {
		const request = await playwright.request.newContext();
		await seedTracesViaSeeder(request, trace.spans);
		await request.dispose();
	});

	test('TC-01 highlight errors marks exactly the error spans', async ({
		traces,
	}) => {
		const filter = traces.waterfallFilter;
		await traces.goto(`/trace/${trace.traceId}`, rootRow);

		await filter.highlightErrors(true);

		await expect
			.poll(async () => (await filter.resultCount()).total)
			.toBe(errorIds.size);
		// The first match is selected, so it reads `selected` rather than
		// `highlighted`.
		expect(errorIds.has(filter.selectedSpanId() ?? '')).toBe(true);

		const states = await filter.rowStates();
		const selected = filter.selectedSpanId();
		const expected = Object.fromEntries(
			Object.keys(states).map((spanId) => [
				spanId,
				spanId === selected
					? 'selected'
					: errorIds.has(spanId)
						? 'highlighted'
						: 'dimmed',
			]),
		);
		expect(states).toEqual(expected);
	});

	test('TC-02 a typed filter navigates matches with next and prev', async ({
		traces,
	}) => {
		expect(authSpans).toHaveLength(2);
		const filter = traces.waterfallFilter;
		await traces.goto(`/trace/${trace.traceId}`, rootRow);

		await filter.apply("service.name = 'auth-service'");
		await expect(filter.count()).toHaveText('1 / 2');
		await expect.poll(() => filter.selectedSpanId()).toBe(authSpans[0]);

		await filter.next();
		await expect(filter.count()).toHaveText('2 / 2');
		await expect.poll(() => filter.selectedSpanId()).toBe(authSpans[1]);

		await filter.prev();
		await expect(filter.count()).toHaveText('1 / 2');
		await expect.poll(() => filter.selectedSpanId()).toBe(authSpans[0]);
	});

	test('TC-03 a filter with no match says so and clearing restores the rows', async ({
		traces,
	}) => {
		const filter = traces.waterfallFilter;
		await traces.goto(`/trace/${trace.traceId}`, rootRow);

		await filter.apply("name = 'does-not-exist'");
		await expect(filter.noResults()).toHaveText('No results found');

		await filter.clear();
		await expect(filter.noResults()).toHaveCount(0);
		const states = Object.values(await filter.rowStates());
		expect(states.length).toBeGreaterThan(0);
		expect(states).not.toContain('dimmed');
	});
});
