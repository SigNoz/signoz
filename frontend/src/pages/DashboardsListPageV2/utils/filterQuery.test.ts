import {
	areFilterStatesEqual,
	combineQueries,
	DEFAULT_FILTER_STATE,
	filterStateToQuery,
	isFilterStateEmpty,
} from './filterQuery';
import type { DashboardFilterState } from '../types';

const state = (patch: Partial<DashboardFilterState>): DashboardFilterState => ({
	...DEFAULT_FILTER_STATE,
	...patch,
});

describe('filterStateToQuery', () => {
	it('passes the raw search through, wrapped in parentheses', () => {
		expect(filterStateToQuery(state({ search: 'name contains "prod"' }))).toBe(
			'(name contains "prod")',
		);
	});

	it('emits an equality clause for a single creator', () => {
		expect(filterStateToQuery(state({ createdBy: ['a@b.com'] }))).toBe(
			"created_by = 'a@b.com'",
		);
	});

	it('emits an IN clause for multiple creators', () => {
		expect(filterStateToQuery(state({ createdBy: ['a@b.com', 'c@d.com'] }))).toBe(
			"created_by IN ['a@b.com', 'c@d.com']",
		);
	});

	it('emits an exact equality clause per selected tag', () => {
		expect(
			filterStateToQuery(
				state({
					tags: [
						{ key: 'env', value: 'prod' },
						{ key: 'team', value: 'core' },
					],
				}),
			),
		).toBe("env = 'prod' AND team = 'core'");
	});

	it('ANDs raw search with the structured chips', () => {
		expect(
			filterStateToQuery(
				state({
					search: 'name contains "x"',
					createdBy: ['a@b.com'],
					tags: [{ key: 'env', value: 'prod' }],
				}),
			),
		).toBe("(name contains \"x\") AND created_by = 'a@b.com' AND env = 'prod'");
	});

	it('returns an empty string for the default state', () => {
		expect(filterStateToQuery(DEFAULT_FILTER_STATE)).toBe('');
	});
});

describe('isFilterStateEmpty', () => {
	it('is true for the default state', () => {
		expect(isFilterStateEmpty(DEFAULT_FILTER_STATE)).toBe(true);
	});

	it('is false when any tag is selected', () => {
		expect(
			isFilterStateEmpty(state({ tags: [{ key: 'env', value: 'prod' }] })),
		).toBe(false);
	});
});

describe('areFilterStatesEqual', () => {
	it('ignores tag ordering', () => {
		const a = state({
			tags: [
				{ key: 'env', value: 'prod' },
				{ key: 'team', value: 'core' },
			],
		});
		const b = state({
			tags: [
				{ key: 'team', value: 'core' },
				{ key: 'env', value: 'prod' },
			],
		});
		expect(areFilterStatesEqual(a, b)).toBe(true);
	});

	it('distinguishes differing tag selections', () => {
		expect(
			areFilterStatesEqual(
				state({ tags: [{ key: 'env', value: 'prod' }] }),
				state({ tags: [{ key: 'env', value: 'dev' }] }),
			),
		).toBe(false);
	});
});

describe('combineQueries', () => {
	it('drops empty fragments and ANDs the rest', () => {
		expect(combineQueries('locked = true', '', undefined, 'name = "x"')).toBe(
			'locked = true AND name = "x"',
		);
	});
});
