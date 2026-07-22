import { useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { QueryParams } from 'constants/query';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { useGetCompositeQueryParam } from 'hooks/queryBuilder/useGetCompositeQueryParam';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import useUrlQuery from 'hooks/useUrlQuery';
import { serializeCompositeQueryParam } from 'lib/compositeQuery/compositeQuerySerialization';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

import { CommitCompositeQueryOptions, CompositeQueryStore } from './types';

/**
 * CompositeQueryStore backed by the `compositeQuery` URL param — the
 * default, shareable storage for the staged query.
 */
export const useUrlCompositeQueryStore = (): CompositeQueryStore => {
	const urlQuery = useUrlQuery();
	const location = useLocation();
	const query = useGetCompositeQueryParam();

	const { safeNavigate } = useSafeNavigate({
		preventSameUrlNavigation: false,
	});

	const panelType = urlQuery.get(QueryParams.panelTypes) as PANEL_TYPES | null;

	const commit = useCallback(
		(committedQuery: Query, options?: CommitCompositeQueryOptions): void => {
			const { searchParams, redirectingUrl, shouldNotStringify, newTab } =
				options || {};

			const pagination = urlQuery.get(QueryParams.pagination);

			if (pagination) {
				const parsedPagination = JSON.parse(pagination);

				urlQuery.set(
					QueryParams.pagination,
					JSON.stringify({
						limit: parsedPagination.limit,
						offset: 0,
					}),
				);
			}

			urlQuery.set(
				QueryParams.compositeQuery,
				serializeCompositeQueryParam(committedQuery),
			);

			if (searchParams) {
				Object.keys(searchParams).forEach((param) =>
					urlQuery.set(
						param,
						shouldNotStringify
							? (searchParams[param] as string)
							: JSON.stringify(searchParams[param]),
					),
				);
			}
			// Remove Hidden Filters from URL query parameters on query change
			urlQuery.delete(QueryParams.activeLogId);

			const generatedUrl = redirectingUrl
				? `${redirectingUrl}?${urlQuery}`
				: `${location.pathname}?${urlQuery}`;

			safeNavigate(generatedUrl, { newTab });
		},
		[location.pathname, safeNavigate, urlQuery],
	);

	return useMemo(
		() => ({ mode: 'url', query, panelType, commit }),
		[query, panelType, commit],
	);
};
