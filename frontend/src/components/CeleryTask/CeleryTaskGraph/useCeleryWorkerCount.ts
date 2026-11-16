import { useMemo } from 'react';
import { useQuery, UseQueryResult } from 'react-query';
// eslint-disable-next-line no-restricted-imports
import { useSelector } from 'react-redux';
import { queryRangeV5 } from 'api/generated/services/querier';
import type { QueryRangeV5200 } from 'api/generated/services/sigNoz.schemas';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { getScalarResults } from 'pages/DashboardPage/DashboardContainer/queryV5/v5ResponseData';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';

import { getCeleryWorkerCountRequest } from './CeleryTaskGraphUtils';

export function useCeleryWorkerCount(): UseQueryResult<number, Error> {
	const { minTime, maxTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const request = useMemo(
		() => getCeleryWorkerCountRequest(minTime, maxTime),
		[minTime, maxTime],
	);

	return useQuery<QueryRangeV5200, Error, number>({
		queryKey: [REACT_QUERY_KEY.GET_CELERY_WORKER_COUNT, request],
		queryFn: ({ signal }) => queryRangeV5(request, signal),
		select: (response) =>
			(getScalarResults(response)[0]?.data ?? []).filter(([worker]) => worker)
				.length,
	});
}
