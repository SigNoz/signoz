import { act, renderHook } from '@testing-library/react';
import { ENTITY_VERSION_V4 } from 'constants/app';
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
	});
});
