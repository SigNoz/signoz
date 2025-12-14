import { act, renderHook } from '@testing-library/react';
import { ENTITY_VERSION_V4, ENTITY_VERSION_V5 } from 'constants/app';
import { ATTRIBUTE_TYPES } from 'constants/queryBuilder';
import {
	BaseAutocompleteData,
	DataTypes,
} from 'types/api/queryBuilder/queryAutocompleteResponse';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource, MetricAggregateOperator } from 'types/common/queryBuilder';

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
		reduceTo: 'avg',
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
							spaceAggregation: '',
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
							spaceAggregation: '',
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
							spaceAggregation: '',
						},
					],
				}),
			);
		});
	});
});
