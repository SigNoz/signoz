import { QueryParams } from 'constants/query';
import ROUTES from 'constants/routes';
import history from 'lib/history';

import { TopOperationList } from './TopOperationsTable';
import { NavigateToTraceProps } from './types';

export const getErrorRate = (list: TopOperationList): number =>
	(list.errorCount / list.numCalls) * 100;

export const navigateToTrace = ({
	servicename,
	operation,
	minTime,
	maxTime,
	selectedTraceTags,
}: NavigateToTraceProps): void => {
	const urlParams = new URLSearchParams();
	urlParams.set(QueryParams.startTime, (minTime / 1000000).toString());
	urlParams.set(QueryParams.endTime, (maxTime / 1000000).toString());
	history.push(
		`${
			ROUTES.TRACE
		}?${urlParams.toString()}&selected={"serviceName":["${servicename}"],"operation":["${operation}"]}&filterToFetchData=["duration","status","serviceName","operation"]&spanAggregateCurrentPage=1&selectedTags=${selectedTraceTags}&&isFilterExclude={"serviceName":false,"operation":false}&userSelectedFilter={"status":["error","ok"],"serviceName":["${servicename}"],"operation":["${operation}"]}&spanAggregateCurrentPage=1`,
	);
};
