import { QueryBuilderField } from 'components/QueryBuilderV2/queryBuilderFields.types';
import { isEqual } from 'lodash-es';
import type { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';

import type { SyncedQueryBuilderField } from '../../Panels/types/panelCapabilities';

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
 * The query each field should be copied from: the one whose value just
 * changed, or any settled query when one was added or switched signal. A
 * signal switch reloads that query's own state, so it is never the source.
 */
function findSource(
	property: keyof IBuilderQuery,
	settled: IBuilderQuery[],
	hasNewcomer: boolean,
	previous: Map<string, IBuilderQuery>,
): IBuilderQuery | undefined {
	const changed = settled.find(
		(query) =>
			!isEqual(previous.get(query.queryName)?.[property], query[property]),
	);
	return changed ?? (hasNewcomer ? settled[0] : undefined);
}

/** The queries that need rewriting so every synced field matches its source. */
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
			source: findSource(property, settled, hasNewcomer, previous),
		}));

	return queries.flatMap((query, index) => {
		const patch = sources.reduce<Partial<IBuilderQuery>>(
			(acc, { property, source }) =>
				source && !isEqual(query[property], source[property])
					? { ...acc, [property]: source[property] }
					: acc,
			{},
		);
		return Object.keys(patch).length > 0
			? [{ index, query: { ...query, ...patch } }]
			: [];
	});
}
