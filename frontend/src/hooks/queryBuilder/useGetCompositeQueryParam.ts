import { QueryParams } from 'constants/query';
import useUrlQuery from 'hooks/useUrlQuery';
import { useMemo } from 'react';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

export const useGetCompositeQueryParam = (): Query | null => {
	const urlQuery = useUrlQuery();

	return useMemo(() => {
		const compositeQuery = urlQuery.get(QueryParams.compositeQuery);
		let parsedCompositeQuery: Query | null = null;

		try {
			if (!compositeQuery) return null;

			// MDN reference - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/decodeURIComponent#decoding_query_parameters_from_a_url
			// MDN reference to support + characters using encoding - https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams#preserving_plus_signs add later
			parsedCompositeQuery = JSON.parse(
				decodeURIComponent(compositeQuery.replace(/\+/g, ' ')),
			);
		} catch (e) {
			parsedCompositeQuery = null;
		}

		return parsedCompositeQuery;
	}, [urlQuery]);
};
