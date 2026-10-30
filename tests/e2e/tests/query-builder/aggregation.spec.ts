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

	test('TC-30 a trace operator replaces per-query aggregation until removed', async ({
		qb,
	}) => {
		await qb.openExplorer(EXPLORER.traces, { view: 'graph' });
		await (await qb.addQuery('B')).filter.type("http.status_code = '500'");
		await qb.query('B').filter.press('Escape');

		await qb.traceOperator.add();
		await qb.traceOperator.editor.type('A => B');
		await qb.traceOperator.editor.press('Escape');
		for (const name of ['A', 'B']) {
			await expect(qb.query(name).aggregation.root()).toHaveCount(0);
			await expect(qb.query(name).addOns.toggles()).toHaveCount(0);
		}
		const fired = await qb.run();
		const operator = fired
			.flatMap((body) => body.compositeQuery.queries)
			.find((query) => query.type === 'builder_trace_operator');
		expect(operator?.spec).toMatchObject({ expression: 'A => B' });

		await qb.traceOperator.remove();
		await expect(qb.query('A').aggregation.root()).toBeVisible();
		await qb.rerunUntil(
			() =>
				qb
					.sent()
					.at(-1)
					?.compositeQuery.queries.some(
						(query) => query.type === 'builder_trace_operator',
					),
			false,
		);
	});

	test('TC-30 the logs explorer offers no trace matching', async ({ qb }) => {
		await qb.openExplorer(EXPLORER.logs, { view: 'graph' });

		await expect(qb.query('A').root()).toBeVisible();
		await expect(qb.traceOperator.addButton()).toHaveCount(0);
	});
});
