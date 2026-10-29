import {
	logsCountQuery,
	metricsQuery,
	PanelKind,
	SINGLE_PANEL_ID,
	singlePanelDashboard,
	test as editorTest,
} from '../../drivers/panel-editor';
import {
	expect,
	reduceToLabel,
	SUM_METRIC,
	withMetricTypes,
	withQueryBuilder,
} from '../../drivers/query-builder';

const test = withMetricTypes(withQueryBuilder(editorTest));

const QUERIES = {
	logs: () => logsCountQuery(),
	traces: () => logsCountQuery({ signal: 'traces' }),
	metrics: () => metricsQuery(),
};

const ALL = ['group_by', 'having', 'order_by', 'limit', 'legend_format'];
const NO_HAVING = ['group_by', 'order_by', 'limit', 'legend_format'];
const METRICS = ['having', 'order_by', 'limit', 'legend_format'];

/**
 * Add-on toggles each panel kind offers per signal. Metrics group by lives in
 * the aggregation row, so it is never a toggle there.
 */
const ADD_ONS: Record<
	keyof typeof QUERIES,
	Partial<Record<string, string[]>>
> = {
	logs: {
		[PanelKind.TimeSeries]: ALL,
		[PanelKind.BarChart]: ALL,
		[PanelKind.Table]: ALL,
		[PanelKind.PieChart]: ALL,
		[PanelKind.Number]: ['legend_format'],
		[PanelKind.Heatmap]: NO_HAVING,
	},
	traces: {
		[PanelKind.TimeSeries]: ALL,
		[PanelKind.BarChart]: ALL,
		[PanelKind.Table]: ALL,
		[PanelKind.PieChart]: ALL,
		[PanelKind.Number]: ['legend_format'],
		[PanelKind.Heatmap]: NO_HAVING,
	},
	metrics: {
		[PanelKind.TimeSeries]: METRICS,
		[PanelKind.BarChart]: METRICS,
		[PanelKind.Table]: [...METRICS, 'reduce_to'],
		[PanelKind.PieChart]: [...METRICS, 'reduce_to'],
		[PanelKind.Number]: ['legend_format', 'reduce_to'],
		[PanelKind.Heatmap]: ['order_by', 'limit', 'legend_format', 'bucket_options'],
	},
};

test.describe('Query builder — panel editor', () => {
	for (const [signal, kinds] of Object.entries(ADD_ONS)) {
		for (const [kind, expected] of Object.entries(kinds)) {
			test(`TC-27 ${signal} on ${kind.replace('signoz/', '')} offers its add-ons`, async ({
				dashboards,
				qb,
			}) => {
				await dashboards.seedAndEdit(
					singlePanelDashboard({
						kind: kind as PanelKind,
						query: QUERIES[signal as keyof typeof QUERIES](),
					}),
					SINGLE_PANEL_ID,
				);

				await expect(qb.query('A').addOns.toggles()).toHaveCount(
					expected?.length ?? 0,
				);
				const toggles = await qb
					.query('A')
					.addOns.toggles()
					.evaluateAll((nodes) =>
						nodes.map((node) =>
							(node.getAttribute('data-testid') ?? '').replace('query-add-on-', ''),
						),
					);
				expect(toggles).toEqual(expected);
			});
		}
	}

	test('TC-27 a limit hidden by a kind switch reopens with its value', async ({
		dashboards,
		editor,
		qb,
	}) => {
		await dashboards.seedAndEdit(
			singlePanelDashboard({ query: logsCountQuery() }),
			SINGLE_PANEL_ID,
		);
		const addOns = qb.query('A').addOns;
		await addOns.open('limit');
		await addOns.limit().fill('7');

		await editor.switchType(PanelKind.Number);
		await expect(addOns.content('limit')).toHaveCount(0);
		await editor.switchType(PanelKind.TimeSeries);

		await expect(addOns.limit()).toHaveValue('7');
		expect(qb.spec(await qb.run(), 'A').limit).toBe(7);
	});

	test('TC-26 reduce-to follows the metric type and keeps a choice within it', async ({
		dashboards,
		metricTypes,
		qb,
	}) => {
		await dashboards.seedAndEdit(
			singlePanelDashboard({ kind: PanelKind.Table, query: metricsQuery() }),
			SINGLE_PANEL_ID,
		);
		const query = qb.query('A');
		await expect(query.addOns.reduceTo.value()).toHaveText(reduceToLabel('Sum'));

		await query.addOns.reduceTo.set('Max');
		await query.metric.select('signoz_latency_count');
		await expect(query.addOns.reduceTo.value()).toHaveText(reduceToLabel('Max'));

		await query.metric.select(metricTypes.gauge);
		await expect(query.addOns.reduceTo.value()).toHaveText(
			reduceToLabel('Average'),
		);

		await query.metric.select(SUM_METRIC);
		await expect(query.addOns.reduceTo.value()).toHaveText(reduceToLabel('Sum'));
		expect(qb.spec(await qb.run(), 'A').aggregations?.[0]).toMatchObject({
			metricName: SUM_METRIC,
			reduceTo: 'sum',
		});
	});
});
