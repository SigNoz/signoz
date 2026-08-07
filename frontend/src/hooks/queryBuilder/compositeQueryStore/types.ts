import { PANEL_TYPES } from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { CompositeQueryStoreMode } from 'types/common/queryBuilder';

export interface CommitCompositeQueryOptions {
	searchParams?: Record<string, unknown>;
	redirectingUrl?: (typeof ROUTES)[keyof typeof ROUTES];
	shouldNotStringify?: boolean;
	newTab?: boolean;
}

/**
 * Storage strategy for the staged composite query. The provider edits
 * `currentQuery` in React state; on stage/run the normalized query is
 * committed to a store. The `url` store persists it in the
 * `compositeQuery` URL param (shareable, survives reloads); the `memory`
 * store keeps it in React state (clean URLs, host-controlled lifetime).
 */
export interface CompositeQueryStore {
	mode: CompositeQueryStoreMode;
	/** Parsed + migrated committed query, or null when none is committed. */
	query: Query | null;
	/** Panel type associated with the committed query, when known. */
	panelType: PANEL_TYPES | null;
	/**
	 * Persists an already-normalized query (see normalizeCompositeQuery).
	 * Options are url-mode navigation concerns; the memory store ignores them.
	 */
	commit: (query: Query, options?: CommitCompositeQueryOptions) => void;
}
