import { isEqual } from 'lodash-es';
import type { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';

import {
	QueryBuilderField,
	type SyncedQueryBuilderField,
} from './queryBuilderFields.types';

const QUERY_PROPERTY = {
	[QueryBuilderField.GroupBy]: 'groupBy',
	[QueryBuilderField.OrderBy]: 'orderBy',
	[QueryBuilderField.Having]: 'having',
	[QueryBuilderField.Limit]: 'limit',
	[QueryBuilderField.StepInterval]: 'stepInterval',
	[QueryBuilderField.ReduceTo]: 'reduceTo',
} as const satisfies Record<SyncedQueryBuilderField, keyof IBuilderQuery>;

export function snapshotQueries(
	queries: IBuilderQuery[],
): Map<string, IBuilderQuery> {
	return new Map(queries.map((query) => [query.queryName, query]));
}

/**
 * The query each field should be copied from: the one whose value just changed
 * (to all), else a settled one (to newcomers only) when a query was added or
 * switched signal. A signal switch reloads that query's own state, so it is
 * never the source.
 */
function findSource(
	property: keyof IBuilderQuery,
	settled: IBuilderQuery[],
	hasNewcomer: boolean,
	previous: Map<string, IBuilderQuery>,
): { source: IBuilderQuery; newcomersOnly: boolean } | undefined {
	const changed = settled.find(
		(query) =>
			!isEqual(previous.get(query.queryName)?.[property], query[property]),
	);
	if (changed) {
		return { source: changed, newcomersOnly: false };
	}
	return hasNewcomer && settled.length > 0
		? { source: settled[0], newcomersOnly: true }
		: undefined;
}

export function syncQueryBuilderFields(
	queries: IBuilderQuery[],
	previous: Map<string, IBuilderQuery>,
	fields: SyncedQueryBuilderField[],
): { index: number; query: IBuilderQuery }[] {
	const settled = queries.filter((query) => {
		const before = previous.get(query.queryName);
		return (
			before?.dataSource === query.dataSource && before.source === query.source
		);
	});
	const hasNewcomer = settled.length < queries.length;
	const sources = fields
		.map((field) => QUERY_PROPERTY[field])
		.map((property) => ({
			property,
			found: findSource(property, settled, hasNewcomer, previous),
		}));

	return queries.flatMap((query, index) => {
		const isSettled = settled.includes(query);
		const patch = sources.reduce<Partial<IBuilderQuery>>(
			(acc, { property, found }) =>
				found &&
				!(found.newcomersOnly && isSettled) &&
				!isEqual(query[property], found.source[property])
					? { ...acc, [property]: found.source[property] }
					: acc,
			{},
		);
		return Object.keys(patch).length > 0
			? [{ index, query: { ...query, ...patch } }]
			: [];
	});
}
