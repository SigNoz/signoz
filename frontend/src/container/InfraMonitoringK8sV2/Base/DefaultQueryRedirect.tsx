import { useEffect, useRef } from 'react';
import { initialQueriesMap } from 'constants/queryBuilder';
import { useGetCompositeQueryParam } from 'hooks/queryBuilder/useGetCompositeQueryParam';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { DataSource } from 'types/common/queryBuilder';

/**
 * Puts the default query in the URL when the page mounts without one.
 *
 * Render it before the list: React runs sibling effects in tree order, and this
 * navigation drops the nuqs writes still queued, such as the page size the list
 * writes on mount.
 */
export function DefaultQueryRedirect(): null {
	const compositeQuery = useGetCompositeQueryParam();
	const { redirectWithQueryBuilderData } = useQueryBuilder();
	const isInitialized = useRef(false);

	useEffect(() => {
		if (isInitialized.current) {
			return;
		}
		isInitialized.current = true;

		if (!compositeQuery) {
			const defaultQuery = initialQueriesMap[DataSource.METRICS];
			redirectWithQueryBuilderData({
				...defaultQuery,
				builder: {
					...defaultQuery.builder,
					queryData: defaultQuery.builder.queryData.map((query) => ({
						...query,
						filter: { expression: '' },
						filters: { items: [], op: 'AND' as const },
					})),
				},
			});
		}
	}, [compositeQuery, redirectWithQueryBuilderData]);

	return null;
}
