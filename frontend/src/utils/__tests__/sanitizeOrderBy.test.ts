/* eslint-disable sonarjs/no-duplicate-string */
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import {
	IBuilderQuery,
	OrderByPayload,
} from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';
import { getParsedAggregationOptionsForOrderBy } from 'utils/aggregationConverter';
import { sanitizeOrderByForExplorer } from 'utils/sanitizeOrderBy';

jest.mock('utils/aggregationConverter', () => ({
	getParsedAggregationOptionsForOrderBy: jest.fn(),
}));

const buildQuery = (overrides: Partial<IBuilderQuery> = {}): IBuilderQuery => ({
	queryName: 'A',
	dataSource: DataSource.TRACES,
	aggregateOperator: '',
	aggregateAttribute: undefined,
	aggregations: [],
	timeAggregation: '',
	spaceAggregation: '',
	temporality: '',
	functions: [],
	filter: { expression: '' } as any,
	filters: { items: [], op: 'AND' } as any,
	groupBy: [],
	expression: '',
	disabled: false,
	having: [] as any,
	limit: null,
	stepInterval: 60 as any,
	orderBy: [],
	legend: '',
	...overrides,
});

describe('sanitizeOrderByForExplorer', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('keeps only orderBy items that are present in groupBy keys or aggregation keys (including alias)', () => {
		(getParsedAggregationOptionsForOrderBy as jest.Mock).mockReturnValue([
			{
				key: 'count()',
				dataType: DataTypes.Float64,
				isColumn: false,
				type: '',
				isJSON: false,
			},
			{
				key: 'avg(duration)',
				dataType: DataTypes.Float64,
				isColumn: false,
				type: '',
				isJSON: false,
			},
			{
				key: 'latency',
				dataType: DataTypes.Float64,
				isColumn: false,
				type: '',
				isJSON: false,
			},
		]);

		const orderBy: OrderByPayload[] = [
			{ columnName: 'service.name', order: 'asc' },
			{ columnName: 'count()', order: 'desc' },
			{ columnName: 'avg(duration)', order: 'asc' },
			{ columnName: 'latency', order: 'asc' }, // alias
			{ columnName: 'not-allowed', order: 'desc' }, // invalid orderBy
			{ columnName: 'timestamp', order: 'desc' }, // invalid orderBy
		];

		const query = buildQuery({
			groupBy: [
				{
					key: 'service.name',
					dataType: DataTypes.String,
					isColumn: true,
					type: 'resource',
					isJSON: false,
				},
			] as any,
			orderBy,
		});

		const result = sanitizeOrderByForExplorer(query);

		expect(result).toEqual([
			{ columnName: 'service.name', order: 'asc' },
			{ columnName: 'count()', order: 'desc' },
			{ columnName: 'avg(duration)', order: 'asc' },
			{ columnName: 'latency', order: 'asc' },
		]);
	});

	it('returns empty when none of the orderBy items are allowed', () => {
		(getParsedAggregationOptionsForOrderBy as jest.Mock).mockReturnValue([
			{
				key: 'count()',
				dataType: DataTypes.Float64,
				isColumn: false,
				type: '',
				isJSON: false,
			},
		]);

		const query = buildQuery({
			groupBy: [],
			orderBy: [
				{ columnName: 'foo', order: 'asc' },
				{ columnName: 'bar', order: 'desc' },
			],
		});

		const result = sanitizeOrderByForExplorer(query);
		expect(result).toEqual([]);
	});

	it('handles missing orderBy by returning an empty array', () => {
		(getParsedAggregationOptionsForOrderBy as jest.Mock).mockReturnValue([]);

		const query = buildQuery({ orderBy: [] });
		const result = sanitizeOrderByForExplorer(query);
		expect(result).toEqual([]);
	});
});
