import { renderHook } from '@testing-library/react';
import { Temporality } from 'api/metricsExplorer/getMetricDetails';
import { MetricType } from 'api/metricsExplorer/getMetricsList';
import { initialQueriesMap } from 'constants/queryBuilder';
import * as useGetMultipleMetricsHook from 'hooks/metricsExplorer/useGetMultipleMetrics';
import { UseQueryResult } from 'react-query';
import { SuccessResponseV2 } from 'types/api';
import {
	MetricMetadata,
	MetricMetadataResponse,
} from 'types/api/metricsExplorer/v2/getMetricMetadata';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import {
	IBuilderFormula,
	IBuilderQuery,
	Query,
} from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

import {
	getMetricUnits,
	splitQueryIntoOneChartPerQuery,
	useGetMetrics,
} from '../utils';

const MOCK_QUERY_DATA_1: IBuilderQuery = {
	...initialQueriesMap[DataSource.METRICS].builder.queryData[0],
	aggregateAttribute: {
		...(initialQueriesMap[DataSource.METRICS].builder.queryData[0]
			.aggregateAttribute as BaseAutocompleteData),
		key: 'metric1',
	},
};

const MOCK_QUERY_DATA_2: IBuilderQuery = {
	...initialQueriesMap[DataSource.METRICS].builder.queryData[0],
	aggregateAttribute: {
		...(initialQueriesMap[DataSource.METRICS].builder.queryData[0]
			.aggregateAttribute as BaseAutocompleteData),
		key: 'metric2',
	},
};
const MOCK_FORMULA_DATA: IBuilderFormula = {
	expression: '1 + 1',
	disabled: false,
	queryName: 'Mock Formula',
	legend: 'Mock Legend',
};

const MOCK_QUERY_WITH_MULTIPLE_QUERY_DATA: Query = {
	...initialQueriesMap[DataSource.METRICS],
	builder: {
		...initialQueriesMap[DataSource.METRICS].builder,
		queryData: [MOCK_QUERY_DATA_1, MOCK_QUERY_DATA_2],
		queryFormulas: [MOCK_FORMULA_DATA, MOCK_FORMULA_DATA],
	},
};

describe('splitQueryIntoOneChartPerQuery', () => {
	it('should split a query with multiple queryData to multiple distinct queries, each with a single queryData', () => {
		const result = splitQueryIntoOneChartPerQuery(
			MOCK_QUERY_WITH_MULTIPLE_QUERY_DATA,
			['metric1', 'metric2'],
			[undefined, 'unit2'],
		);
		expect(result).toHaveLength(4);
		// Verify query 1 has the correct data
		expect(result[0].builder.queryData).toHaveLength(1);
		expect(result[0].builder.queryData[0]).toEqual(MOCK_QUERY_DATA_1);
		expect(result[0].builder.queryFormulas).toHaveLength(0);
		expect(result[0].unit).toBeUndefined();
		// Verify query 2 has the correct data
		expect(result[1].builder.queryData).toHaveLength(1);
		expect(result[1].builder.queryData[0]).toEqual(MOCK_QUERY_DATA_2);
		expect(result[1].builder.queryFormulas).toHaveLength(0);
		expect(result[1].unit).toBe('unit2');
		// Verify query 3 has the correct data
		expect(result[2].builder.queryFormulas).toHaveLength(1);
		expect(result[2].builder.queryFormulas[0]).toEqual(MOCK_FORMULA_DATA);
		expect(result[2].builder.queryData).toHaveLength(2); // 2 disabled queries
		expect(result[2].builder.queryData[0].disabled).toBe(true);
		expect(result[2].builder.queryData[1].disabled).toBe(true);
		expect(result[2].unit).toBeUndefined();
		// Verify query 4 has the correct data
		expect(result[3].builder.queryFormulas).toHaveLength(1);
		expect(result[3].builder.queryFormulas[0]).toEqual(MOCK_FORMULA_DATA);
		expect(result[3].builder.queryData).toHaveLength(2); // 2 disabled queries
		expect(result[3].builder.queryData[0].disabled).toBe(true);
		expect(result[3].builder.queryData[1].disabled).toBe(true);
		expect(result[3].unit).toBeUndefined();
	});
});

const MOCK_METRIC_METADATA: MetricMetadata = {
	description: 'Metric 1 description',
	unit: 'unit1',
	type: MetricType.GAUGE,
	temporality: Temporality.DELTA,
	isMonotonic: true,
};

describe('useGetMetrics', () => {
	beforeEach(() => {
		jest
			.spyOn(useGetMultipleMetricsHook, 'useGetMultipleMetrics')
			.mockReturnValue([
				({
					isLoading: false,
					isError: false,
					data: {
						httpStatusCode: 200,
						data: {
							status: 'success',
							data: MOCK_METRIC_METADATA,
						},
					},
				} as Partial<
					UseQueryResult<SuccessResponseV2<MetricMetadataResponse>, Error>
				>) as UseQueryResult<SuccessResponseV2<MetricMetadataResponse>, Error>,
			]);
	});

	it('should return the correct metrics data', () => {
		const { result } = renderHook(() => useGetMetrics(['metric1']));
		expect(result.current.metrics).toHaveLength(1);
		expect(result.current.metrics[0]).toBeDefined();
		expect(result.current.metrics[0]).toEqual(MOCK_METRIC_METADATA);
		expect(result.current.isLoading).toBe(false);
		expect(result.current.isError).toBe(false);
	});

	it('should return array of undefined values of correct length when metrics data is not yet loaded', () => {
		jest
			.spyOn(useGetMultipleMetricsHook, 'useGetMultipleMetrics')
			.mockReturnValue([
				({
					isLoading: true,
					isError: false,
				} as Partial<
					UseQueryResult<SuccessResponseV2<MetricMetadataResponse>, Error>
				>) as UseQueryResult<SuccessResponseV2<MetricMetadataResponse>, Error>,
			]);
		const { result } = renderHook(() => useGetMetrics(['metric1']));
		expect(result.current.metrics).toHaveLength(1);
		expect(result.current.metrics[0]).toBeUndefined();
	});
});

describe('getMetricUnits', () => {
	it('should return the same unit for units that are not known to the universal unit mapper', () => {
		const result = getMetricUnits([MOCK_METRIC_METADATA]);
		expect(result).toHaveLength(1);
		expect(result[0]).toEqual(MOCK_METRIC_METADATA.unit);
	});

	it('should return universal unit for units that are known to the universal unit mapper', () => {
		const result = getMetricUnits([{ ...MOCK_METRIC_METADATA, unit: 'seconds' }]);
		expect(result).toHaveLength(1);
		expect(result[0]).toBe('s');
	});
});
