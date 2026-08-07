import { Query } from 'types/api/queryBuilder/queryBuilderData';

import { migrateCompositeQuery } from './migrateCompositeQuery';

/**
 * Parses a raw `compositeQuery` URL param value into a Query, migrating
 * old-format queries to the new format. Returns null when the value is
 * missing or unparseable.
 */
export const parseCompositeQueryParam = (
	compositeQuery: string | null,
): Query | null => {
	if (!compositeQuery) {
		return null;
	}

	try {
		// MDN reference - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/decodeURIComponent#decoding_query_parameters_from_a_url
		// MDN reference to support + characters using encoding - https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams#preserving_plus_signs add later
		const parsedCompositeQuery: Query = JSON.parse(
			decodeURIComponent(compositeQuery.replace(/\+/g, ' ')),
		);

		return migrateCompositeQuery(parsedCompositeQuery);
	} catch (e) {
		return null;
	}
};

/**
 * Serializes a Query into the URL-safe string stored in the
 * `compositeQuery` URL param. Inverse of parseCompositeQueryParam.
 */
export const serializeCompositeQueryParam = (query: Query): string =>
	encodeURIComponent(JSON.stringify(query));
