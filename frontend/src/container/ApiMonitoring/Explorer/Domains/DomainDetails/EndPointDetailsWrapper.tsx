import { ENTITY_VERSION_V4 } from 'constants/app';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { getEndPointZeroStateQueryPayload } from 'container/ApiMonitoring/utils';
import { GetMetricQueryRange } from 'lib/dashboard/getQueryResults';
import { useMemo } from 'react';
import { useQueries } from 'react-query';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { SuccessResponse } from 'types/api';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { GlobalReducer } from 'types/reducer/globalTime';

import EndPointDetailsZeroState from './components/EndPointDetailsZeroState';
import EndPointDetails from './EndPointDetails';

function EndPointDetailsWrapper({
	domainName,
	endPointName,
	setSelectedEndPointName,
	domainListFilters,
}: {
	domainName: string;
	endPointName: string;
	setSelectedEndPointName: (value: string) => void;
	domainListFilters: IBuilderQuery['filters'];
}): JSX.Element {
	const { maxTime, minTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const endPointZeroStateQueryPayload = useMemo(
		() =>
			getEndPointZeroStateQueryPayload(
				domainName,
				Math.floor(minTime / 1e9),
				Math.floor(maxTime / 1e9),
			),
		[domainName, minTime, maxTime],
	);

	const endPointZeroStateDataQueries = useQueries(
		endPointZeroStateQueryPayload.map((payload) => ({
			queryKey: [
				// Since only one query here
				REACT_QUERY_KEY.GET_ENDPOINT_DROPDOWN_DATA,
				payload,
				ENTITY_VERSION_V4,
			],
			queryFn: (): Promise<SuccessResponse<MetricRangePayloadProps>> =>
				GetMetricQueryRange(payload, ENTITY_VERSION_V4),
			enabled: !!payload,
		})),
	);

	const [endPointZeroStateDataQuery] = useMemo(
		() => [endPointZeroStateDataQueries[0]],
		[endPointZeroStateDataQueries],
	);

	if (endPointName === '') {
		return (
			<EndPointDetailsZeroState
				setSelectedEndPointName={setSelectedEndPointName}
				endPointDropDownDataQuery={endPointZeroStateDataQuery}
			/>
		);
	}

	return (
		<EndPointDetails
			domainName={domainName}
			endPointName={endPointName}
			setSelectedEndPointName={setSelectedEndPointName}
			domainListFilters={domainListFilters}
		/>
	);
}

export default EndPointDetailsWrapper;
