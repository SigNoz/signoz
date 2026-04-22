import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from 'react-query';
// eslint-disable-next-line no-restricted-imports
import { useSelector } from 'react-redux';
import { ENTITY_VERSION_V5 } from 'constants/app';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useGetQueryRange } from 'hooks/queryBuilder/useGetQueryRange';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';

import { WidgetGraphProps } from '../types';
import ExplorerColumnsRenderer from './ExplorerColumnsRenderer';
import QuerySection from './QuerySection';
import { QueryContainer } from './styles';
import WidgetGraph from './WidgetGraph';

import './LeftContainer.styles.scss';

function LeftContainer({
	selectedGraph,
	selectedLogFields,
	setSelectedLogFields,
	selectedTracesFields,
	setSelectedTracesFields,
	selectedWidget,
	requestData,
	isLoadingPanelData,
	setRequestData,
	setQueryResponse,
	enableDrillDown = false,
	dashboardData,
	isNewPanel = false,
}: WidgetGraphProps): JSX.Element {
	const { stagedQuery } = useQueryBuilder();
	const queryClient = useQueryClient();

	const { selectedTime: globalSelectedInterval, minTime, maxTime } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);
	const queryRangeKey = useMemo(
		() => [
			REACT_QUERY_KEY.GET_QUERY_RANGE,
			globalSelectedInterval,
			requestData,
			minTime,
			maxTime,
		],
		[globalSelectedInterval, requestData, minTime, maxTime],
	);
	const [isCancelled, setIsCancelled] = useState(false);

	const handleCancelQuery = useCallback(() => {
		queryClient.cancelQueries(queryRangeKey);
		setIsCancelled(true);
	}, [queryClient, queryRangeKey]);

	const queryResponse = useGetQueryRange(requestData, ENTITY_VERSION_V5, {
		enabled: !!stagedQuery,
		queryKey: queryRangeKey,
		keepPreviousData: true,
	});

	useEffect(() => {
		if (queryResponse.isFetching) {
			setIsCancelled(false);
		}
	}, [queryResponse.isFetching]);

	// Update parent component with query response for legend colors
	useEffect(() => {
		if (setQueryResponse) {
			setQueryResponse(queryResponse);
		}
	}, [queryResponse, setQueryResponse]);

	return (
		<>
			<WidgetGraph
				selectedGraph={selectedGraph}
				queryResponse={queryResponse}
				setRequestData={setRequestData}
				selectedWidget={selectedWidget}
				isLoadingPanelData={isLoadingPanelData}
				enableDrillDown={enableDrillDown}
				isCancelled={isCancelled}
			/>
			<QueryContainer className="query-section-left-container">
				<QuerySection
					selectedGraph={selectedGraph}
					isLoadingQueries={queryResponse.isFetching}
					handleCancelQuery={handleCancelQuery}
					selectedWidget={selectedWidget}
					dashboardVersion={ENTITY_VERSION_V5}
					dashboardId={dashboardData?.id}
					dashboardName={dashboardData?.data.title}
					isNewPanel={isNewPanel}
				/>
				{selectedGraph === PANEL_TYPES.LIST && (
					<ExplorerColumnsRenderer
						selectedLogFields={selectedLogFields}
						setSelectedLogFields={setSelectedLogFields}
						selectedTracesFields={selectedTracesFields}
						setSelectedTracesFields={setSelectedTracesFields}
					/>
				)}
			</QueryContainer>
		</>
	);
}

export default memo(LeftContainer);
