import { QueryParams } from 'constants/query';
import { getMinMax } from 'container/TopNav/AutoRefresh/config';
import useUrlQuery from 'hooks/useUrlQuery';
import history from 'lib/history';
import { parseQuery } from 'lib/logql';
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
	updateQueryString: (arg0: string) => void;
} {
	const dispatch = useDispatch<Dispatch<AppActions>>();
	const {
		searchFilter: { parsedQuery, queryString },
		order,
	} = useSelector<AppState, ILogsReducer>((store) => store.logs);

	const urlQuery = useUrlQuery();
	const parsedFilters = urlQuery.get('q');

	const { minTime, maxTime, selectedTime } = useSelector<
		AppState,
		GlobalReducer
	>((store) => store.globalTime);

	const updateQueryString = useCallback(
		(updatedQueryString: string) => {
			history.replace({
				pathname: history.location.pathname,
				search: `?${QueryParams.q}=${updatedQueryString}&${QueryParams.order}=${order}`,
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
		[dispatch, parsedQuery, selectedTime, queryString],
	);

	useEffect(() => {
		updateQueryString(parsedFilters || '');
	}, [parsedFilters, updateQueryString]);

	return {
		queryString,
		parsedQuery,
		updateQueryString,
	};
}
