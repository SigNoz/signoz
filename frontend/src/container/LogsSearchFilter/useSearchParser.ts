import { getMinMax } from 'container/TopNav/AutoRefresh/config';
import history from 'lib/history';
import { parseQuery, reverseParser } from 'lib/logql';
import { ILogQLParsedQueryItem } from 'lib/logql/types';
import isEqual from 'lodash-es/isEqual';
import { useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Dispatch } from 'redux';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import {
	SET_SEARCH_QUERY_PARSED_PAYLOAD,
	SET_SEARCH_QUERY_STRING,
} from 'types/actions/logs';
import { GlobalReducer } from 'types/reducer/globalTime';
import { ILogsReducer } from 'types/reducer/logs';

import { getGlobalTime } from './utils';

export function useSearchParser(): {
	queryString: string;
	parsedQuery: unknown;
	updateParsedQuery: (arg0: ILogQLParsedQueryItem[]) => void;
	updateQueryString: (arg0: string) => void;
} {
	const dispatch = useDispatch<Dispatch<AppActions>>();
	const {
		searchFilter: { parsedQuery, queryString },
	} = useSelector<AppState, ILogsReducer>((store) => store.logs);
	const { minTime, maxTime, selectedTime } = useSelector<
		AppState,
		GlobalReducer
	>((store) => store.globalTime);

	const updateQueryString = useCallback(
		(updatedQueryString: string) => {
			history.replace({
				pathname: history.location.pathname,
				search: `?q=${updatedQueryString}`,
			});

			const globalTime = getMinMax(selectedTime, minTime, maxTime);

			dispatch({
				type: SET_SEARCH_QUERY_STRING,
				payload: {
					searchQueryString: updatedQueryString,
					globalTime: getGlobalTime(selectedTime, globalTime),
				},
			});

			const parsedQueryFromString = parseQuery(updatedQueryString);
			if (!isEqual(parsedQuery, parsedQueryFromString)) {
				dispatch({
					type: SET_SEARCH_QUERY_PARSED_PAYLOAD,
					payload: parsedQueryFromString,
				});
			}
		},
		// need to hide this warning as we don't want to update the query string on every change
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[dispatch, parsedQuery],
	);

	useEffect(() => {
		updateQueryString(queryString);
	}, [queryString, updateQueryString]);

	const updateParsedQuery = useCallback(
		(updatedParsedPayload: ILogQLParsedQueryItem[]) => {
			dispatch({
				type: SET_SEARCH_QUERY_PARSED_PAYLOAD,
				payload: updatedParsedPayload,
			});
			const reversedParsedQuery = reverseParser(updatedParsedPayload);
			if (
				!isEqual(queryString, reversedParsedQuery) ||
				(queryString === '' && reversedParsedQuery === '')
			) {
				dispatch({
					type: SET_SEARCH_QUERY_STRING,
					payload: {
						searchQueryString: reversedParsedQuery,
					},
				});
			}
		},
		[dispatch, queryString],
	);

	return {
		queryString,
		parsedQuery,
		updateParsedQuery,
		updateQueryString,
	};
}
