import { act, renderHook } from '@testing-library/react';
import { ENTITY_VERSION_V4, ENTITY_VERSION_V5 } from 'constants/app';
import { ATTRIBUTE_TYPES } from 'constants/queryBuilder';
import {
	BaseAutocompleteData,
	DataTypes,
} from 'types/api/queryBuilder/queryAutocompleteResponse';
import { IBuilderQuery, Query } from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';
import {
	DataSource,
	MetricAggregateOperator,
	ReduceOperators,
} from 'types/common/queryBuilder';

import { useQueryBuilder } from '../useQueryBuilder';
import { useQueryOperations } from '../useQueryBuilderOperations';

// Mock the useQueryBuilder hook
jest.mock('../useQueryBuilder', () => ({
	useQueryBuilder: jest.fn(),
}));

describe('useQueryBuilderOperations - Empty Aggregate Attribute Type', () => {
	const mockHandleSetQueryData = jest.fn();
	const mockHandleSetFormulaData = jest.fn();
	const mockRemoveQueryBuilderEntityByIndex = jest.fn();
	const mockSetLastUsedQuery = jest.fn();
	const mockRedirectWithQueryBuilderData = jest.fn();

	const defaultMockQuery: IBuilderQuery = {
		dataSource: DataSource.METRICS,
		aggregateOperator: MetricAggregateOperator.AVG,
		aggregateAttribute: {
			key: 'test_metric',
			dataType: DataTypes.Float64,
			type: ATTRIBUTE_TYPES.GAUGE,
		} as BaseAutocompleteData,
		timeAggregation: MetricAggregateOperator.AVG,
		spaceAggregation: '',
		aggregations: [
			{
				timeAggregation: MetricAggregateOperator.AVG,
				metricName: 'test_metric',
				temporality: '',
				spaceAggregation: '',
			},
		],
		having: [],
		limit: null,
		queryName: 'test_query',
		functions: [],
		filters: {
			items: [],
			op: 'AND',
		},
		groupBy: [],
		orderBy: [],
		stepInterval: 60,
		expression: '',
		disabled: false,
		reduceTo: ReduceOperators.AVG,
		legend: '',
	};

	const setupMockQueryBuilder = (): void => {
		(useQueryBuilder as jest.Mock).mockReturnValue({
			handleSetQueryData: mockHandleSetQueryData,
			handleSetFormulaData: mockHandleSetFormulaData,
			removeQueryBuilderEntityByIndex: mockRemoveQueryBuilderEntityByIndex,
			setLastUsedQuery: mockSetLastUsedQuery,
			redirectWithQueryBuilderData: mockRedirectWithQueryBuilderData,
			panelType: 'time_series',
			currentQuery: {
				builder: {
					queryData: [defaultMockQuery, defaultMockQuery],
				},
			},
		});
	};

	const renderHookWithProps = (
		props = {},
	): { current: ReturnType<typeof useQueryOperations> } => {
		const { result } = renderHook(() =>
			useQueryOperations({
				query: defaultMockQuery,
				index: 0,
				entityVersion: ENTITY_VERSION_V4,
				...props,
			}),
		);
		return result;
	};

	beforeEach(() => {
		jest.clearAllMocks();
		setupMockQueryBuilder();
	});

	describe('handleChangeAggregatorAttribute', () => {
		it('should set AVG operators when type is empty but key is present - unkown metric', () => {
			const result = renderHookWithProps();
			const newAttribute: BaseAutocompleteData = {
				key: 'new_metric',
				dataType: DataTypes.Float64,
				type: '',
			};

			act(() => {
				result.current.handleChangeAggregatorAttribute(newAttribute);
			});

			expect(mockHandleSetQueryData).toHaveBeenCalledWith(
				0,
				expect.objectContaining({
					aggregateAttribute: newAttribute,
					aggregateOperator: MetricAggregateOperator.AVG,
					timeAggregation: MetricAggregateOperator.AVG,
					spaceAggregation: MetricAggregateOperator.AVG,
				}),
			);
		});

		it('should set COUNT/RATE/SUM operators when both type and key are empty', () => {
			const result = renderHookWithProps();
			const newAttribute: BaseAutocompleteData = {
				key: '',
				dataType: DataTypes.Float64,
				type: '',
			};

			act(() => {
				result.current.handleChangeAggregatorAttribute(newAttribute);
			});

			expect(mockHandleSetQueryData).toHaveBeenCalledWith(
				0,
				expect.objectContaining({
					aggregateAttribute: newAttribute,
					aggregateOperator: MetricAggregateOperator.COUNT,
					timeAggregation: MetricAggregateOperator.RATE,
					spaceAggregation: MetricAggregateOperator.SUM,
				}),
			);
		});

		it('should preserve aggregation operators when metric type remains the same (GAUGE to GAUGE)', () => {
			const result = renderHookWithProps({ entityVersion: ENTITY_VERSION_V5 });
			const newAttribute: BaseAutocompleteData = {
				key: 'new_gauge_metric',
				dataType: DataTypes.Float64,
				type: ATTRIBUTE_TYPES.GAUGE,
			};

			act(() => {
				result.current.handleChangeAggregatorAttribute(newAttribute);
			});

			expect(mockHandleSetQueryData).toHaveBeenCalledWith(
				0,
				expect.objectContaining({
					aggregateAttribute: newAttribute,
					aggregations: [
						{
							timeAggregation: MetricAggregateOperator.AVG,
							metricName: 'new_gauge_metric',
							temporality: '',
							spaceAggregation: '',
						},
					],
				}),
			);
		});

		it('should reset aggregation operators when metric type changes (GAUGE to SUM) with v5 from start', () => {
			const result = renderHookWithProps({ entityVersion: ENTITY_VERSION_V5 });
			const newAttribute: BaseAutocompleteData = {
				key: 'new_sum_metric',
				dataType: DataTypes.Float64,
				type: ATTRIBUTE_TYPES.SUM,
			};

			act(() => {
				result.current.handleChangeAggregatorAttribute(newAttribute);
			});

			expect(mockHandleSetQueryData).toHaveBeenCalledWith(
				0,
				expect.objectContaining({
					aggregations: [
						{
							timeAggregation: MetricAggregateOperator.RATE,
							metricName: 'new_sum_metric',
							temporality: '',
							spaceAggregation: MetricAggregateOperator.SUM,
							reduceTo: ReduceOperators.SUM,
						},
					],
				}),
			);
		});

		it('should preserve aggregation operators when metric type remains the same (SUM to SUM)', () => {
			const sumMockQuery: IBuilderQuery = {
				...defaultMockQuery,
				aggregateAttribute: undefined,
				aggregateOperator: '',
				timeAggregation: undefined,
				spaceAggregation: undefined,
				aggregations: [
					{
						timeAggregation: MetricAggregateOperator.RATE,
						metricName: 'original_sum_metric',
						temporality: '',
						spaceAggregation: MetricAggregateOperator.SUM,
						reduceTo: ReduceOperators.SUM,
					},
				],
			};

			const { result } = renderHook(() =>
				useQueryOperations({
					query: sumMockQuery,
					index: 0,
					entityVersion: ENTITY_VERSION_V5,
				}),
			);

			const newAttribute: BaseAutocompleteData = {
				key: 'new_sum_metric',
				dataType: DataTypes.Float64,
				type: ATTRIBUTE_TYPES.SUM,
			};

			act(() => {
				result.current.handleChangeAggregatorAttribute(newAttribute);
			});

			expect(mockHandleSetQueryData).toHaveBeenCalledWith(
				0,
				expect.objectContaining({
					aggregateAttribute: newAttribute,
					aggregations: [
						{
							timeAggregation: MetricAggregateOperator.RATE,
							metricName: 'new_sum_metric',
							temporality: '',
							spaceAggregation: MetricAggregateOperator.SUM,
							reduceTo: ReduceOperators.SUM,
						},
					],
				}),
			);
		});

		it('should reset operators when going from gauge -> empty -> gauge', () => {
			// Start with a gauge metric
			const gaugeQuery: IBuilderQuery = {
				...defaultMockQuery,
				aggregateAttribute: {
					key: 'original_gauge',
					dataType: DataTypes.Float64,
					type: ATTRIBUTE_TYPES.GAUGE,
				} as BaseAutocompleteData,
				aggregations: [
					{
						timeAggregation: MetricAggregateOperator.COUNT_DISTINCT,
						metricName: 'original_gauge',
						temporality: '',
						spaceAggregation: '',
						reduceTo: ReduceOperators.AVG,
					},
				],
			};
			const { result, rerender } = renderHook(
				({ query }) =>
					useQueryOperations({
						query,
						index: 0,
						entityVersion: ENTITY_VERSION_V5,
					}),
				{
					initialProps: { query: gaugeQuery },
				},
			);

			// Re-render with empty attribute
			const emptyAttribute: BaseAutocompleteData = {
				key: '',
				dataType: DataTypes.Float64,
				type: '',
			};
			const emptyQuery: IBuilderQuery = {
				...defaultMockQuery,
				aggregateAttribute: emptyAttribute,
				aggregations: [
					{
						timeAggregation: MetricAggregateOperator.COUNT,
						metricName: '',
						temporality: '',
						spaceAggregation: MetricAggregateOperator.SUM,
						reduceTo: ReduceOperators.AVG,
					},
				],
			};
			rerender({ query: emptyQuery });

			// Change to a new gauge metric
			const newGaugeAttribute: BaseAutocompleteData = {
				key: 'new_gauge',
				dataType: DataTypes.Float64,
				type: ATTRIBUTE_TYPES.GAUGE,
			};
			act(() => {
				result.current.handleChangeAggregatorAttribute(newGaugeAttribute);
			});

			expect(mockHandleSetQueryData).toHaveBeenLastCalledWith(
				0,
				expect.objectContaining({
					aggregateAttribute: newGaugeAttribute,
					aggregations: [
						{
							timeAggregation: MetricAggregateOperator.AVG,
							metricName: 'new_gauge',
							temporality: '',
							spaceAggregation: MetricAggregateOperator.AVG,
							reduceTo: ReduceOperators.AVG,
						},
					],
				}),
			);
		});
	});
});

describe('useQueryBuilderOperations - handleChangeQueryData runAfterUpdate', () => {
	const mockHandleSetQueryData = jest.fn();
	const mockHandleSetTraceOperatorData = jest.fn();
	const mockHandleRunQuery = jest.fn();

	const baseQuery: IBuilderQuery = {
		dataSource: DataSource.METRICS,
		aggregateOperator: MetricAggregateOperator.AVG,
		aggregateAttribute: {
			key: 'system.cpu.load',
			dataType: DataTypes.Float64,
			type: ATTRIBUTE_TYPES.GAUGE,
		} as BaseAutocompleteData,
		timeAggregation: MetricAggregateOperator.AVG,
		spaceAggregation: '',
		aggregations: [],
		having: [],
		limit: null,
		queryName: 'A',
		functions: [],
		filters: { items: [], op: 'AND' },
		groupBy: [],
		orderBy: [],
		stepInterval: 60,
		expression: '',
		disabled: false,
		reduceTo: ReduceOperators.AVG,
		legend: '',
	};

	const otherQuery: IBuilderQuery = { ...baseQuery, queryName: 'B' };

	const buildCurrentQuery = (): Query => ({
		queryType: EQueryType.QUERY_BUILDER,
		promql: [],
		clickhouse_sql: [],
		id: 'q-1',
		unit: '',
		builder: {
			queryData: [baseQuery, otherQuery],
			queryFormulas: [],
			queryTraceOperator: [],
		},
	});

	const setupMock = (overrides: Record<string, unknown> = {}): void => {
		(useQueryBuilder as jest.Mock).mockReturnValue({
			handleSetQueryData: mockHandleSetQueryData,
			handleSetTraceOperatorData: mockHandleSetTraceOperatorData,
			handleSetFormulaData: jest.fn(),
			removeQueryBuilderEntityByIndex: jest.fn(),
			setLastUsedQuery: jest.fn(),
			redirectWithQueryBuilderData: jest.fn(),
			handleRunQuery: mockHandleRunQuery,
			panelType: 'time_series',
			currentQuery: buildCurrentQuery(),
			...overrides,
		});
	};

	beforeEach(() => {
		jest.clearAllMocks();
		setupMock();
	});

	it('does not call handleRunQuery when options is omitted', () => {
		const { result } = renderHook(() =>
			useQueryOperations({
				query: baseQuery,
				index: 0,
				entityVersion: ENTITY_VERSION_V4,
			}),
		);

		act(() => {
			result.current.handleChangeQueryData('legend', 'cpu-load');
		});

		expect(mockHandleSetQueryData).toHaveBeenCalledWith(
			0,
			expect.objectContaining({ legend: 'cpu-load' }),
		);
		expect(mockHandleRunQuery).not.toHaveBeenCalled();
	});

	it('calls handleRunQuery with the freshly-changed query when runAfterUpdate is true', () => {
		const { result } = renderHook(() =>
			useQueryOperations({
				query: baseQuery,
				index: 0,
				entityVersion: ENTITY_VERSION_V4,
			}),
		);

		act(() => {
			result.current.handleChangeQueryData('disabled', true, {
				runAfterUpdate: true,
			});
		});

		expect(mockHandleSetQueryData).toHaveBeenCalledWith(
			0,
			expect.objectContaining({ disabled: true }),
		);
		expect(mockHandleRunQuery).toHaveBeenCalledTimes(1);
		const [override] = mockHandleRunQuery.mock.calls[0];
		// Index 0 reflects the new value...
		expect(override.builder.queryData[0]).toStrictEqual(
			expect.objectContaining({ queryName: 'A', disabled: true }),
		);
		// ...siblings stay untouched.
		expect(override.builder.queryData[1]).toStrictEqual(
			expect.objectContaining({ queryName: 'B', disabled: false }),
		);
	});

	it('applies the change at the correct index without disturbing other queries', () => {
		const { result } = renderHook(() =>
			useQueryOperations({
				query: otherQuery,
				index: 1,
				entityVersion: ENTITY_VERSION_V4,
			}),
		);

		act(() => {
			result.current.handleChangeQueryData(
				'groupBy',
				[
					{
						key: 'host.name',
						type: 'tag',
						dataType: DataTypes.String,
					} as BaseAutocompleteData,
				],
				{ runAfterUpdate: true },
			);
		});

		const [override] = mockHandleRunQuery.mock.calls[0];
		expect(override.builder.queryData[0]).toStrictEqual(
			expect.objectContaining({ queryName: 'A', groupBy: [] }),
		);
		expect(override.builder.queryData[1]).toStrictEqual(
			expect.objectContaining({
				queryName: 'B',
				groupBy: [expect.objectContaining({ key: 'host.name' })],
			}),
		);
	});

	it('keeps handleSetQueryData and handleRunQuery in sync for legend formatting', () => {
		const { result } = renderHook(() =>
			useQueryOperations({
				query: baseQuery,
				index: 0,
				entityVersion: ENTITY_VERSION_V4,
			}),
		);

		act(() => {
			result.current.handleChangeQueryData('legend', '{{service.name}}', {
				runAfterUpdate: true,
			});
		});

		const [override] = mockHandleRunQuery.mock.calls[0];
		const setCallLegend = mockHandleSetQueryData.mock.calls[0][1].legend;
		expect(override.builder.queryData[0].legend).toBe(setCallLegend);
	});

	it('does not call handleRunQuery for trace-operator queries (early return)', () => {
		const { result } = renderHook(() =>
			useQueryOperations({
				query: baseQuery,
				index: 0,
				entityVersion: ENTITY_VERSION_V4,
				isForTraceOperator: true,
			}),
		);

		act(() => {
			result.current.handleChangeQueryData('disabled', true, {
				runAfterUpdate: true,
			});
		});

		expect(mockHandleSetTraceOperatorData).toHaveBeenCalledTimes(1);
		expect(mockHandleSetQueryData).not.toHaveBeenCalled();
		expect(mockHandleRunQuery).not.toHaveBeenCalled();
	});
});
