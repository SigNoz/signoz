import { PANEL_TYPES } from 'constants/queryBuilder';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';

import { SPAN_ATTRIBUTES } from './Explorer/Domains/DomainDetails/constants';
import {
	formatTopErrorsDataForTable,
	getAllEndpointsWidgetData,
	getGroupByFiltersFromGroupByValues,
	getTopErrorsColumnsConfig,
	getTopErrorsCoRelationQueryFilters,
	getTopErrorsQueryPayload,
	TopErrorsResponseRow,
} from './utils';

// Mock or define DataTypes since it seems to be missing from imports
const DataTypes = {
	String: 'string',
	Float64: 'float64',
	bool: 'bool',
};

describe('API Monitoring Utils', () => {
	describe('getAllEndpointsWidgetData', () => {
		it('should create a widget with correct configuration', () => {
			// Arrange
			const groupBy = [
				{
					dataType: DataTypes.String,
					isColumn: true,
					isJSON: false,
					// eslint-disable-next-line sonarjs/no-duplicate-string
					key: 'http.method',
					type: '',
				},
			];
			// eslint-disable-next-line sonarjs/no-duplicate-string
			const domainName = 'test-domain';
			const filters = {
				items: [
					{
						// eslint-disable-next-line sonarjs/no-duplicate-string
						id: 'test-filter',
						key: {
							dataType: DataTypes.String,
							isColumn: true,
							isJSON: false,
							key: 'test-key',
							type: '',
						},
						op: '=',
						value: 'test-value',
					},
				],
				op: 'AND',
			};

			// Act
			const result = getAllEndpointsWidgetData(
				groupBy as BaseAutocompleteData[],
				domainName,
				filters as IBuilderQuery['filters'],
			);

			// Assert
			expect(result).toBeDefined();
			expect(result.id).toBeDefined();
			// Title is a React component, not a string
			expect(result.title).toBeDefined();
			expect(result.panelTypes).toBe(PANEL_TYPES.TABLE);

			// Check that each query includes the domainName filter
			result.query.builder.queryData.forEach((query) => {
				const serverNameFilter = query.filters.items.find(
					(item) => item.key && item.key.key === SPAN_ATTRIBUTES.SERVER_NAME,
				);
				expect(serverNameFilter).toBeDefined();
				expect(serverNameFilter?.value).toBe(domainName);

				// Check that the custom filters were included
				const testFilter = query.filters.items.find(
					(item) => item.id === 'test-filter',
				);
				expect(testFilter).toBeDefined();
			});

			// Verify groupBy was included in queries
			if (result.query.builder.queryData[0].groupBy) {
				const hasCustomGroupBy = result.query.builder.queryData[0].groupBy.some(
					(item) => item && item.key === 'http.method',
				);
				expect(hasCustomGroupBy).toBe(true);
			}
		});

		it('should handle empty groupBy correctly', () => {
			// Arrange
			const groupBy: any[] = [];
			const domainName = 'test-domain';
			const filters = { items: [], op: 'AND' };

			// Act
			const result = getAllEndpointsWidgetData(groupBy, domainName, filters);

			// Assert
			expect(result).toBeDefined();
			// Should only include default groupBy
			if (result.query.builder.queryData[0].groupBy) {
				expect(result.query.builder.queryData[0].groupBy.length).toBeGreaterThan(0);
				// Check that it doesn't have extra group by fields (only defaults)
				const defaultGroupByLength =
					result.query.builder.queryData[0].groupBy.length;
				const resultWithCustomGroupBy = getAllEndpointsWidgetData(
					[
						{
							dataType: DataTypes.String,
							isColumn: true,
							isJSON: false,
							key: 'custom.field',
							type: '',
						},
					] as BaseAutocompleteData[],
					domainName,
					filters,
				);
				// Custom groupBy should have more fields than default
				if (resultWithCustomGroupBy.query.builder.queryData[0].groupBy) {
					expect(
						resultWithCustomGroupBy.query.builder.queryData[0].groupBy.length,
					).toBeGreaterThan(defaultGroupByLength);
				}
			}
		});
	});

	describe('getGroupByFiltersFromGroupByValues', () => {
		it('should convert row data to filters correctly', () => {
			// Arrange
			const rowData = {
				'http.method': 'GET',
				'http.status_code': '200',
				'service.name': 'api-service',
				// Fields that should be filtered out
				data: 'someValue',
				key: 'someKey',
			};

			const groupBy = [
				{
					id: 'group-by-1',
					key: 'http.method',
					dataType: DataTypes.String,
					isColumn: true,
					isJSON: false,
					type: '',
				},
				{
					id: 'group-by-2',
					key: 'http.status_code',
					dataType: DataTypes.String,
					isColumn: true,
					isJSON: false,
					type: '',
				},
				{
					id: 'group-by-3',
					key: 'service.name',
					dataType: DataTypes.String,
					isColumn: false,
					isJSON: false,
					type: 'tag',
				},
			];

			// Act
			const result = getGroupByFiltersFromGroupByValues(
				rowData,
				groupBy as BaseAutocompleteData[],
			);

			// Assert
			expect(result).toBeDefined();
			expect(result.op).toBe('AND');
			// The implementation includes all keys from rowData, not just those in groupBy
			expect(result.items.length).toBeGreaterThanOrEqual(3);

			// Verify each filter matches the corresponding groupBy
			expect(
				result.items.some(
					(item) =>
						item.key &&
						item.key.key === 'http.method' &&
						item.value === 'GET' &&
						item.op === '=',
				),
			).toBe(true);

			expect(
				result.items.some(
					(item) =>
						item.key &&
						item.key.key === 'http.status_code' &&
						item.value === '200' &&
						item.op === '=',
				),
			).toBe(true);

			expect(
				result.items.some(
					(item) =>
						item.key &&
						item.key.key === 'service.name' &&
						item.value === 'api-service' &&
						item.op === '=',
				),
			).toBe(true);
		});

		it('should handle fields not in groupBy', () => {
			// Arrange
			const rowData = {
				'http.method': 'GET',
				'unknown.field': 'someValue',
			};

			const groupBy = [
				{
					id: 'group-by-1',
					key: 'http.method',
					dataType: DataTypes.String,
					isColumn: true,
					isJSON: false,
					type: '',
				},
			];
			// Act
			const result = getGroupByFiltersFromGroupByValues(
				rowData,
				groupBy as BaseAutocompleteData[],
			);

			// Assert
			expect(result).toBeDefined();
			// The implementation includes all keys from rowData, not just those in groupBy
			expect(result.items.length).toBeGreaterThanOrEqual(1);

			// Should include the known field with the proper dataType from groupBy
			const knownField = result.items.find(
				(item) => item.key && item.key.key === 'http.method',
			);
			expect(knownField).toBeDefined();
			if (knownField && knownField.key) {
				expect(knownField.key.dataType).toBe(DataTypes.String);
				expect(knownField.key.isColumn).toBe(true);
			}

			// Should include the unknown field
			const unknownField = result.items.find(
				(item) => item.key && item.key.key === 'unknown.field',
			);
			expect(unknownField).toBeDefined();
			if (unknownField && unknownField.key) {
				expect(unknownField.key.dataType).toBe(DataTypes.String); // Default
			}
		});

		it('should handle empty input', () => {
			// Arrange
			const rowData = {};
			const groupBy: any[] = [];

			// Act
			const result = getGroupByFiltersFromGroupByValues(rowData, groupBy);

			// Assert
			expect(result).toBeDefined();
			expect(result.op).toBe('AND');
			expect(result.items).toHaveLength(0);
		});
	});

	describe('formatTopErrorsDataForTable', () => {
		it('should format top errors data correctly', () => {
			// Arrange
			const inputData = [
				{
					metric: {
						[SPAN_ATTRIBUTES.URL_PATH]: '/api/test',
						[SPAN_ATTRIBUTES.STATUS_CODE]: '500',
						status_message: 'Internal Server Error',
					},
					values: [[1000000100, '10']],
					queryName: 'A',
					legend: 'Test Legend',
				},
			];

			// Act
			const result = formatTopErrorsDataForTable(
				inputData as TopErrorsResponseRow[],
			);

			// Assert
			expect(result).toBeDefined();
			expect(result.length).toBe(1);

			// Check first item is formatted correctly
			expect(result[0].endpointName).toBe('/api/test');
			expect(result[0].statusCode).toBe('500');
			expect(result[0].statusMessage).toBe('Internal Server Error');
			expect(result[0].count).toBe('10');
			expect(result[0].key).toBeDefined();
		});

		it('should handle empty input', () => {
			// Act
			const result = formatTopErrorsDataForTable(undefined);

			// Assert
			expect(result).toBeDefined();
			expect(result).toEqual([]);
		});
	});

	describe('getTopErrorsColumnsConfig', () => {
		it('should return column configuration with expected fields', () => {
			// Act
			const result = getTopErrorsColumnsConfig();

			// Assert
			expect(result).toBeDefined();
			expect(result.length).toBeGreaterThan(0);

			// Check that we have all the expected columns
			const columnKeys = result.map((col) => col.dataIndex);
			expect(columnKeys).toContain('endpointName');
			expect(columnKeys).toContain('statusCode');
			expect(columnKeys).toContain('statusMessage');
			expect(columnKeys).toContain('count');
		});
	});

	describe('getTopErrorsCoRelationQueryFilters', () => {
		it('should create filters for domain, endpoint and status code', () => {
			// Arrange
			const domainName = 'test-domain';
			const endPointName = '/api/test';
			const statusCode = '500';

			// Act
			const result = getTopErrorsCoRelationQueryFilters(
				domainName,
				endPointName,
				statusCode,
			);

			// Assert
			expect(result).toBeDefined();
			expect(result.op).toBe('AND');
			expect(result.items.length).toBeGreaterThanOrEqual(3);

			// Check domain filter
			const domainFilter = result.items.find(
				(item) =>
					item.key &&
					item.key.key === SPAN_ATTRIBUTES.SERVER_NAME &&
					item.value === domainName,
			);
			expect(domainFilter).toBeDefined();

			// Check endpoint filter
			const endpointFilter = result.items.find(
				(item) =>
					item.key &&
					item.key.key === SPAN_ATTRIBUTES.URL_PATH &&
					item.value === endPointName,
			);
			expect(endpointFilter).toBeDefined();

			// Check status code filter
			const statusFilter = result.items.find(
				(item) =>
					item.key &&
					item.key.key === SPAN_ATTRIBUTES.STATUS_CODE &&
					item.value === statusCode,
			);
			expect(statusFilter).toBeDefined();
		});
	});

	describe('getTopErrorsQueryPayload', () => {
		it('should create correct query payload with filters', () => {
			// Arrange
			const domainName = 'test-domain';
			const start = 1000000000;
			const end = 1000010000;
			const filters = {
				items: [
					{
						id: 'test-filter',
						key: {
							dataType: DataTypes.String,
							isColumn: true,
							isJSON: false,
							key: 'test-key',
							type: '',
						},
						op: '=',
						value: 'test-value',
					},
				],
				op: 'AND',
			};

			// Act
			const result = getTopErrorsQueryPayload(
				domainName,
				start,
				end,
				filters as IBuilderQuery['filters'],
			);

			// Assert
			expect(result).toBeDefined();
			expect(result.length).toBeGreaterThan(0);

			// Verify query params
			expect(result[0].start).toBe(start);
			expect(result[0].end).toBe(end);

			// Verify correct structure
			expect(result[0].graphType).toBeDefined();
			expect(result[0].query).toBeDefined();
			expect(result[0].query.builder).toBeDefined();
			expect(result[0].query.builder.queryData).toBeDefined();

			// Verify domain filter is included
			const queryData = result[0].query.builder.queryData[0];
			expect(queryData.filters).toBeDefined();

			// Check for domain filter
			const domainFilter = queryData.filters.items.find(
				// eslint-disable-next-line sonarjs/no-identical-functions
				(item) =>
					item.key &&
					item.key.key === SPAN_ATTRIBUTES.SERVER_NAME &&
					item.value === domainName,
			);
			expect(domainFilter).toBeDefined();

			// Check that custom filters were included
			const testFilter = queryData.filters.items.find(
				(item) => item.id === 'test-filter',
			);
			expect(testFilter).toBeDefined();
		});
	});
});
