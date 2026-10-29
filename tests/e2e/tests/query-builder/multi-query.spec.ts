import {
	metricsQuery,
	SINGLE_PANEL_ID,
	singlePanelDashboard,
	test as editorTest,
} from '../../drivers/panel-editor';
import {
	expect,
	OTHER_SUM_METRIC,
	SUM_METRIC,
	withQueryBuilder,
} from '../../drivers/query-builder';

// In the panel editor a new query starts as metrics with no metric picked, and
// Run does nothing until one is: each added query picks a metric first.
const test = withQueryBuilder(editorTest);

test.describe('Query builder — multiple queries', () => {
	test('TC-28 queries are named, cloned, hidden and deleted', async ({
		dashboards,
		qb,
	}) => {
		await dashboards.seedAndEdit(
			singlePanelDashboard({
				query: metricsQuery({ filter: "operation = '/ads/get'" }),
			}),
			SINGLE_PANEL_ID,
		);
		for (const name of ['B', 'C']) {
			const query = await qb.addQuery(name);
			await query.metric.select(OTHER_SUM_METRIC);
		}
		expect(await qb.queryNames()).toEqual(['A', 'B', 'C']);

		await qb.query('B').delete();
		expect(await qb.queryNames()).toEqual(['A', 'C']);
		await (await qb.addQuery('B')).metric.select(OTHER_SUM_METRIC);
		expect(await qb.queryNames()).toEqual(['A', 'C', 'B']);

		await qb.query('A').clone();
		await expect(qb.query('D').root()).toBeVisible();
		await expect
			.poll(() => qb.query('D').filter.expression())
			.toBe("operation = '/ads/get'");

		await qb.query('C').toggleVisibility();
		const fired = await qb.run();
		expect(qb.spec(fired, 'C').disabled).toBe(true);
		expect(qb.spec(fired, 'D').aggregations?.[0]).toMatchObject({
			metricName: SUM_METRIC,
		});

		for (const name of ['B', 'C', 'D']) {
			await qb.query(name).delete();
		}
		await qb.query('A').actions().click();
		await expect(
			qb.query('A').root().page().getByTestId('query-actions-item-delete-query'),
		).toHaveCount(0);
	});

	test('TC-29 a formula over two queries reaches the request', async ({
		dashboards,
		qb,
	}) => {
		await dashboards.seedAndEdit(
			singlePanelDashboard({ query: metricsQuery() }),
			SINGLE_PANEL_ID,
		);
		await (await qb.addQuery('B')).metric.select(OTHER_SUM_METRIC);

		const formula = await qb.addFormula('F1');
		await formula.expression().fill('A / B');
		await formula.legend().fill('ratio');
		const fired = await qb.run();

		const queries = fired.flatMap((body) => body.compositeQuery.queries);
		expect(queries).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					type: 'builder_formula',
					spec: expect.objectContaining({
						name: 'F1',
						expression: 'A / B',
						legend: 'ratio',
					}),
				}),
			]),
		);

		await formula.delete();
		const after = (await qb.run()).at(-1)?.compositeQuery.queries ?? [];
		expect(after.map((query) => query.type)).not.toContain('builder_formula');
		expect(after.map((query) => query.spec.name)).toEqual(['A', 'B']);
	});
});
