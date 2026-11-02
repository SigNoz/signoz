import { QueryParams } from 'constants/query';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

/**
 * Builds an explorer URL the same way `redirectWithQueryBuilderData` does —
 * without inheriting stale query params from the current page's `urlQuery`.
 */
export function buildExplorerNavigationUrl(
	route: string,
	query: Query,
	searchParams: Record<string, unknown>,
): string {
	const params = new URLSearchParams();
	params.set(
		QueryParams.compositeQuery,
		encodeURIComponent(JSON.stringify(query)),
	);
	Object.entries(searchParams).forEach(([key, value]) => {
		params.set(key, JSON.stringify(value));
	});
	return `${route}?${params.toString()}`;
}
