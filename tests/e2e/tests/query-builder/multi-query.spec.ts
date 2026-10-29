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

const CLONED_FILTER = "operation = '/ads/get'";

test.describe('Query builder — multiple queries', () => {
	test('TC-28 a deleted name is reused by the next added query', async ({
		dashboards,
		qb,
	}) => {
		await dashboards.seedAndEdit(
			singlePanelDashboard({ query: metricsQuery() }),
			SINGLE_PANEL_ID,
		);
		for (const name of ['B', 'C']) {
			await (await qb.addQuery(name)).metric.select(OTHER_SUM_METRIC);
		}
		expect(await qb.queryNames()).toEqual(['A', 'B', 'C']);

		await qb.query('B').delete();
		expect(await qb.queryNames()).toEqual(['A', 'C']);
		const reAdded = await qb.addQuery('B');
		expect(await qb.queryNames()).toEqual(['A', 'C', 'B']);
		await reAdded.metric.select(SUM_METRIC);
		await expect(reAdded.metric.input()).toHaveValue(SUM_METRIC);
		await expect(qb.query('C').metric.input()).toHaveValue(OTHER_SUM_METRIC);
	});

	test('TC-28 a clone and a hidden query reach the request', async ({
		dashboards,
		qb,
	}) => {
		await dashboards.seedAndEdit(
			singlePanelDashboard({ query: metricsQuery({ filter: CLONED_FILTER }) }),
			SINGLE_PANEL_ID,
		);
		await (await qb.addQuery('B')).metric.select(OTHER_SUM_METRIC);

		await qb.query('A').clone();
		await expect
			.poll(() => qb.query('C').filter.expression())
			.toBe(CLONED_FILTER);
		await qb.query('B').toggleVisibility();
		await qb.runButton().click();

		await expect.poll(() => qb.latest('B')?.disabled).toBe(true);
		expect(qb.latest('C')).toMatchObject({
			filter: { expression: CLONED_FILTER },
			aggregations: [expect.objectContaining({ metricName: SUM_METRIC })],
		});
	});

	test('TC-28 the last remaining query offers no delete', async ({
		dashboards,
		qb,
	}) => {
		await dashboards.seedAndEdit(
			singlePanelDashboard({ query: metricsQuery() }),
			SINGLE_PANEL_ID,
		);
		await (await qb.addQuery('B')).metric.select(OTHER_SUM_METRIC);

		await qb.query('B').delete();
		await qb.query('A').actions().click();

		await expect(qb.query('A').menuItem('clone')).toBeVisible();
		await expect(qb.query('A').menuItem('delete')).toHaveCount(0);
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
		await qb.runButton().click();
		await expect
			.poll(() => qb.latest('F1'))
			.toMatchObject({ expression: 'A / B', legend: 'ratio' });

		await formula.delete();
		await qb.rerunUntil(
			() =>
				qb
					.sent()
					.at(-1)
					?.compositeQuery.queries.map((q) => q.spec.name),
			['A', 'B'],
		);
	});
});
