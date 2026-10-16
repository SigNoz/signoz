import type { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import type { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';

import {
	QueryBuilderField,
	type SyncedQueryBuilderField,
} from '../queryBuilderFields.types';
import {
	snapshotQueries,
	syncQueryBuilderFields,
} from '../syncQueryBuilderFields';

const key = (name: string): BaseAutocompleteData =>
	({ key: name }) as BaseAutocompleteData;

function query(
	queryName: string,
	{
		groupBy = [],
		limit = null,
		dataSource = 'traces',
	}: { groupBy?: string[]; limit?: number | null; dataSource?: string } = {},
): IBuilderQuery {
	return {
		queryName,
		groupBy: groupBy.map(key),
		limit,
		dataSource,
	} as IBuilderQuery;
}

const GROUP_BY: SyncedQueryBuilderField[] = [QueryBuilderField.GroupBy];

describe('syncQueryBuilderFields', () => {
	it('copies an edited field to the other queries', () => {
		const previous = snapshotQueries([query('A'), query('B')]);

		expect(
			syncQueryBuilderFields(
				[query('A', { groupBy: ['service.name'] }), query('B')],
				previous,
				GROUP_BY,
			),
		).toStrictEqual([
			{ index: 1, query: query('B', { groupBy: ['service.name'] }) },
		]);
	});

	it('gives a new query the existing values', () => {
		const previous = snapshotQueries([query('A', { groupBy: ['service.name'] })]);

		expect(
			syncQueryBuilderFields(
				[query('A', { groupBy: ['service.name'] }), query('B')],
				previous,
				GROUP_BY,
			),
		).toStrictEqual([
			{ index: 1, query: query('B', { groupBy: ['service.name'] }) },
		]);
	});

	it("gives a query switched to another signal the others' values, not its reset ones", () => {
		const previous = snapshotQueries([
			query('A', { groupBy: ['service.name'] }),
			query('B', { groupBy: ['service.name'], dataSource: 'metrics' }),
		]);

		expect(
			syncQueryBuilderFields(
				[query('A', { groupBy: ['service.name'] }), query('B')],
				previous,
				GROUP_BY,
			),
		).toStrictEqual([
			{ index: 1, query: query('B', { groupBy: ['service.name'] }) },
		]);
	});

	it('leaves values that already differ until one is edited', () => {
		const queries = [query('A', { groupBy: ['host.name'] }), query('B')];

		expect(
			syncQueryBuilderFields(queries, snapshotQueries(queries), GROUP_BY),
		).toStrictEqual([]);
	});

	it('gives a new query the first value without touching differing ones', () => {
		const saved = [
			query('A', { groupBy: ['service.name'] }),
			query('B', { groupBy: ['host.name'] }),
		];

		expect(
			syncQueryBuilderFields(
				[...saved, query('C')],
				snapshotQueries(saved),
				GROUP_BY,
			),
		).toStrictEqual([
			{ index: 2, query: query('C', { groupBy: ['service.name'] }) },
		]);
	});

	it('copies an edit to every query even when one was added', () => {
		const saved = [
			query('A', { groupBy: ['service.name'] }),
			query('B', { groupBy: ['host.name'] }),
		];

		expect(
			syncQueryBuilderFields(
				[query('A', { groupBy: ['k8s.pod.name'] }), saved[1], query('C')],
				snapshotQueries(saved),
				GROUP_BY,
			),
		).toStrictEqual([
			{ index: 1, query: query('B', { groupBy: ['k8s.pod.name'] }) },
			{ index: 2, query: query('C', { groupBy: ['k8s.pod.name'] }) },
		]);
	});

	it('syncs each field from its own source', () => {
		const previous = snapshotQueries([query('A'), query('B')]);

		expect(
			syncQueryBuilderFields(
				[query('A', { groupBy: ['service.name'] }), query('B', { limit: 50 })],
				previous,
				[QueryBuilderField.GroupBy, QueryBuilderField.Limit],
			),
		).toStrictEqual([
			{ index: 0, query: query('A', { groupBy: ['service.name'], limit: 50 }) },
			{ index: 1, query: query('B', { groupBy: ['service.name'], limit: 50 }) },
		]);
	});

	it('leaves fields it is not asked to sync', () => {
		const previous = snapshotQueries([query('A'), query('B')]);

		expect(
			syncQueryBuilderFields(
				[query('A', { limit: 50 }), query('B')],
				previous,
				GROUP_BY,
			),
		).toStrictEqual([]);
	});
});
