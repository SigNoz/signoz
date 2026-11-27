import {
	metricsGaugeAggregateOperatorOptions,
	metricsSumAggregateOperatorOptions,
	metricsUnknownTimeAggregateOperatorOptions,
} from 'constants/queryBuilderOperators';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { DataSource } from 'types/common/queryBuilder';

import { getMetricsOperatorsByAttributeType } from '../getMetricsOperatorsByAttributeType';

describe('getMetricsOperatorsByAttributeType', () => {
	it('offers every Gauge and Sum time-aggregation operator for a metric of unknown type', () => {
		const options = getMetricsOperatorsByAttributeType({
			dataSource: DataSource.METRICS,
			panelType: PANEL_TYPES.TIME_SERIES,
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			aggregateAttributeType: '' as any,
		});

		const values = options.map((option) => option.value);
		const expectedValues = [
			...metricsGaugeAggregateOperatorOptions,
			...metricsSumAggregateOperatorOptions,
		].map((option) => option.value);

		expectedValues.forEach((value) => {
			expect(values).toContain(value);
		});
	});

	it('matches metricsUnknownTimeAggregateOperatorOptions for an unknown type', () => {
		const options = getMetricsOperatorsByAttributeType({
			dataSource: DataSource.METRICS,
			panelType: PANEL_TYPES.TIME_SERIES,
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			aggregateAttributeType: '' as any,
		});

		expect(options).toBe(metricsUnknownTimeAggregateOperatorOptions);
	});
});
