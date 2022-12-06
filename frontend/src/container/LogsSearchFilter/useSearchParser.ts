import history from 'lib/history';
import { parseQuery, reverseParser } from 'lib/logql';
import { useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import {
	SET_SEARCH_QUERY_PARSED_PAYLOAD,
	SET_SEARCH_QUERY_STRING,
} from 'types/actions/logs';
import { ILogsReducer } from 'types/reducer/logs';

export function useSearchParser(): {
	queryString: string;
	parsedQuery: unknown;
	updateParsedQuery: (arg0: unknown) => void;
	updateQueryString: (arg0: unknown) => void;
} {
	const dispatch = useDispatch();
	const {
		searchFilter: { parsedQuery, queryString },
	} = useSelector<AppState, ILogsReducer>((store) => store.logs);

	const updateQueryString = useCallback(
		(updatedQueryString) => {
			if (updatedQueryString) {
				history.push({
					pathname: history.location.pathname,
					search: updatedQueryString ? `?q=${updatedQueryString}` : '',
				});
			}

			dispatch({
				type: SET_SEARCH_QUERY_STRING,
				payload: updatedQueryString,
			});
			const parsedQueryFromString = parseQuery(updatedQueryString);

			dispatch({
				type: SET_SEARCH_QUERY_PARSED_PAYLOAD,
				payload: parsedQueryFromString,
			});
		},
		[dispatch],
	);

	useEffect(() => {
		if (queryString !== null) updateQueryString(queryString);
	}, [queryString, updateQueryString]);

	const updateParsedQuery = useCallback(
		(updatedParsedPayload) => {
			dispatch({
				type: SET_SEARCH_QUERY_PARSED_PAYLOAD,
				payload: updatedParsedPayload,
			});
			const reversedParsedQuery = reverseParser(updatedParsedPayload);

			dispatch({
				type: SET_SEARCH_QUERY_STRING,
				payload: reversedParsedQuery,
			});
		},
		[dispatch],
	);

	return {
		queryString,
		parsedQuery,
		updateParsedQuery,
		updateQueryString,
	};
}
