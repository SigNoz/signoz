import {
	expect,
	EXPLORER,
	type MetricTypes,
	OTHER_SUM_METRIC,
	SUM_METRIC,
	test as base,
	withMetricTypes,
} from '../../drivers/query-builder';

const test = withMetricTypes(base);

const MOMENT_AGGREGATIONS = ['Sum', 'Avg', 'Min', 'Max'];

interface TypeDefaults {
	metric: (types: MetricTypes) => string;
	time?: string;
	space: string;
	spaceOptions: string[];
}

const DEFAULTS: Record<string, TypeDefaults> = {
	sum: {
		metric: () => SUM_METRIC,
		time: 'Rate',
		space: 'Sum',
		spaceOptions: MOMENT_AGGREGATIONS,
	},
	gauge: {
		metric: (types) => types.gauge,
		time: 'Avg',
		space: 'Avg',
		spaceOptions: MOMENT_AGGREGATIONS,
	},
	histogram: {
		metric: (types) => types.histogram,
		space: 'P90',
		spaceOptions: ['P50', 'P75', 'P90', 'P95', 'P99'],
	},
};

test.describe('Query builder — metric aggregations', () => {
	for (const [type, expected] of Object.entries(DEFAULTS)) {
		test(`TC-19 a ${type} metric gets its type's default aggregations`, async ({
			metricTypes,
			qb,
		}) => {
			const metricName = expected.metric(metricTypes);
			await qb.openExplorer(EXPLORER.metrics);
			const metric = qb.query('A').metric;

			await metric.select(metricName);

			await expect(metric.spaceAggregation()).toHaveText(expected.space);
			expect(await metric.spaceOptions()).toEqual(expected.spaceOptions);
			const fired = await qb.run();
			expect(qb.spec(fired, 'A').aggregations?.[0]).toMatchObject({
				metricName,
				spaceAggregation: expected.space.toLowerCase(),
				...(expected.time && { timeAggregation: expected.time.toLowerCase() }),
			});
		});
	}

	test('TC-19 a histogram has no time aggregation control', async ({
		metricTypes,
		qb,
	}) => {
		await qb.openExplorer(EXPLORER.metrics);

		await qb.query('A').metric.select(metricTypes.histogram);

		await expect(qb.query('A').metric.spaceAggregation()).toHaveText('P90');
		await expect(qb.query('A').metric.timeAggregation()).toHaveCount(0);
	});

	test('TC-20 aggregations reset only when the metric type changes', async ({
		metricTypes,
		qb,
	}) => {
		await qb.openExplorer(EXPLORER.metrics);
		const metric = qb.query('A').metric;

		await metric.select(SUM_METRIC);
		await metric.setTimeAggregation('Increase');
		await metric.setSpaceAggregation('Max');

		await metric.select(OTHER_SUM_METRIC);
		await expect(metric.timeAggregation()).toHaveText('Increase');
		await expect(metric.spaceAggregation()).toHaveText('Max');

		await metric.select(metricTypes.gauge);
		await expect(metric.timeAggregation()).toHaveText('Avg');
		await expect(metric.spaceAggregation()).toHaveText('Avg');

		await metric.select(SUM_METRIC);
		await expect(metric.timeAggregation()).toHaveText('Rate');
		await expect(metric.spaceAggregation()).toHaveText('Sum');
		const fired = await qb.run();
		expect(qb.spec(fired, 'A').aggregations?.[0]).toMatchObject({
			metricName: SUM_METRIC,
			timeAggregation: 'rate',
			spaceAggregation: 'sum',
		});
	});
});
