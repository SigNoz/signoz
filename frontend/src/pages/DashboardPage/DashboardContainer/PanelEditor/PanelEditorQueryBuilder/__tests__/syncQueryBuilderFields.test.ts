import { QueryBuilderField } from 'components/QueryBuilderV2/queryBuilderFields.types';
import type { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import type { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';

import type { SyncedQueryBuilderField } from '../../../Panels/types/panelCapabilities';
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
