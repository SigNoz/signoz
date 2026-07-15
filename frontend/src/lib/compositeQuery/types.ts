import { Query } from 'types/api/queryBuilder/queryBuilderData';

export const COMPOSITE_QUERY_KEY = 'compositeQuery';

/**
 * A serialization tier. `encode` returns URLSearchParams (default key =
 * `compositeQuery`). `matches` checks if params belong to this adapter.
 * `decode` receives URLSearchParams and returns Query or null if missing/invalid.
 */
export interface CompositeQueryAdapter {
	readonly name: string;
	encode(query: Query): URLSearchParams;
	matches(params: URLSearchParams): boolean;
	decode(params: URLSearchParams): Query | null;
}
