import { expect, EXPLORER, test } from '../../drivers/query-builder';

// One comma-separated term per entry in the request's `aggregations`.
const EXPRESSIONS: Record<string, string[]> = {
	'a count': ['count()'],
	'a distinct count': ['count_distinct(service.name)'],
	'a percentile of a span field': ['p99(duration_nano)'],
	'two aggregations': ['count()', 'p99(duration_nano)'],
};

test.describe('Query builder — logs and traces aggregations', () => {
	for (const [label, terms] of Object.entries(EXPRESSIONS)) {
		test(`TC-17 ${label} reaches the request`, async ({ qb }) => {
			await qb.openExplorer(EXPLORER.traces, { view: 'graph' });
			const aggregation = qb.query('A').aggregation;

			await aggregation.type(terms.join(', '));
			await aggregation.press('Escape');
			const fired = await qb.run();

			expect(qb.spec(fired, 'A').aggregations?.map((a) => a.expression)).toEqual(
				terms,
			);
		});
	}

	test('TC-18 the step interval reaches the request', async ({
		authedPage: page,
		qb,
	}) => {
		await qb.openExplorer(EXPLORER.traces, { view: 'graph' });

		await qb.query('A').step().fill('120');
		await page.keyboard.press('Tab');
		const fired = await qb.run();

		expect(qb.spec(fired, 'A').stepInterval).toBe(120);
	});
});
