import { useEffect, useRef } from 'react';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import type { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';

import type { SyncedQueryBuilderField } from '../../Panels/types/panelCapabilities';
import {
	snapshotQueries,
	syncQueryBuilderFields,
} from './syncQueryBuilderFields';

const NO_FIELDS: SyncedQueryBuilderField[] = [];

/**
 * Keeps `fields` equal across builder queries: an edit to one query copies to
 * the rest, and a query added or switched to another signal takes the others'
 * values. Values that already differ when this starts are left alone until one
 * of them is edited.
 */
export function useSyncQueryBuilderFields(
	fields: SyncedQueryBuilderField[] = NO_FIELDS,
): void {
	const { currentQuery, handleSetQueryData } = useQueryBuilder();
	const queries = currentQuery.builder.queryData;
	const previousRef = useRef<Map<string, IBuilderQuery>>();
	const enabled = fields.length > 0;

	useEffect(() => {
		const previous = previousRef.current;
		previousRef.current = enabled ? snapshotQueries(queries) : undefined;
		if (!enabled || !previous || queries.length < 2) {
			return;
		}
		syncQueryBuilderFields(queries, previous, fields).forEach(
			({ index, query }) => handleSetQueryData(index, query),
		);
	}, [enabled, fields, queries, handleSetQueryData]);
}
