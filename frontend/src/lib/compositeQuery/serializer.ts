import {
	COMPOSITE_QUERY_KEY,
	jsonAdapter,
} from 'lib/compositeQuery/adapters/json';
import type { CompositeQueryAdapter } from 'lib/compositeQuery/types';
import type { Query } from 'types/api/queryBuilder/queryBuilderData';

// Order matters for decode: most-specific (tagged) adapters first
const ADAPTERS: CompositeQueryAdapter[] = [jsonAdapter];

// Pick the adapter that owns a given URL. json's `matches` is always true, so
// it serves as the final fallback when no tagged adapter claims the params.
function adapterFor(params: URLSearchParams): CompositeQueryAdapter {
	return ADAPTERS.find((adapter) => adapter.matches(params)) ?? jsonAdapter;
}

/**
 * Encode a query to the shortest available URLSearchParams.
 */
export function serialize(query: Query): URLSearchParams {
	return ADAPTERS[0].encode(query);
}

/**
 * Decode URLSearchParams back to a Query. Total: returns null on any failure.
 */
export function deserialize(params: URLSearchParams): Query | null {
	const hasParams = params.toString().length > 0;
	if (!hasParams) {
		return null;
	}
	return adapterFor(params).decode(params);
}

/**
 * Apply all params from source into target URLSearchParams.
 */
export function applySerializedParams(
	source: URLSearchParams,
	target: URLSearchParams,
): void {
	source.forEach((value, key) => target.set(key, value));
}

/**
 * Remove every serialized-query param from target URLSearchParams. Use instead
 * of `target.delete('compositeQuery')` so a stale query is fully purged even
 * for adapters that explode a query into many content-dependent keys (e.g.
 * `query0.ds`, `query0.fl.it.0.key.key`) which can't be listed statically.
 *
 * Keys are discovered by round-trip: decode the current params with their
 * owning adapter, re-encode, then delete exactly the keys encoding produces.
 * If the params don't decode (absent/corrupt), fall back to dropping the legacy
 * single key so a stale `compositeQuery` is still cleared.
 */
export function clearSerializedParams(target: URLSearchParams): void {
	const adapter = adapterFor(target);
	try {
		const decoded = adapter.decode(target);
		if (!decoded) {
			target.delete(COMPOSITE_QUERY_KEY);
			return;
		}
		adapter.encode(decoded).forEach((_value, key) => {
			target.delete(key);
		});
	} catch {
		target.delete(COMPOSITE_QUERY_KEY);
	}
}

/**
 * Serialize a query to a plain record of all URL params it produces. Use when
 * building a query-param object manually (e.g. for `createQueryParams`), so the
 * call site carries every param the adapter emits — not just `compositeQuery`.
 * Spread it: `{ ...serializeToParams(query), startTime, endTime }`.
 */
export function serializeToParams(query: Query): Record<string, string> {
	return Object.fromEntries(serialize(query));
}
