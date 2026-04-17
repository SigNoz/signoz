import { memo, useCallback, useEffect, useMemo } from 'react';
import { useQueryClient } from 'react-query';
import { ENTITY_VERSION_V5 } from 'constants/app';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useGetQueryRange } from 'hooks/queryBuilder/useGetQueryRange';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useGlobalTimeStore } from 'store/globalTime';
import { getAutoRefreshQueryKey } from 'store/globalTime/utils';

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
	selectedDashboard,
	isNewPanel = false,
}: WidgetGraphProps): JSX.Element {
	const { stagedQuery } = useQueryBuilder();
	const queryClient = useQueryClient();
	const selectedTime = useGlobalTimeStore((s) => s.selectedTime);

	const queryRangeKey = useMemo(
		() =>
			getAutoRefreshQueryKey(
				selectedTime,
				REACT_QUERY_KEY.GET_QUERY_RANGE,
				requestData,
			),
		[selectedTime, requestData],
	);
	const handleCancelQuery = useCallback(() => {
		queryClient.cancelQueries([REACT_QUERY_KEY.AUTO_REFRESH_QUERY]);
	}, [queryClient]);

	const queryResponse = useGetQueryRange(requestData, ENTITY_VERSION_V5, {
		enabled: !!stagedQuery,
		queryKey: queryRangeKey,
		keepPreviousData: true,
	});

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
			/>
			<QueryContainer className="query-section-left-container">
				<QuerySection
					selectedGraph={selectedGraph}
					isLoadingQueries={queryResponse.isFetching}
					handleCancelQuery={handleCancelQuery}
					selectedWidget={selectedWidget}
					dashboardVersion={ENTITY_VERSION_V5}
					dashboardId={selectedDashboard?.id}
					dashboardName={selectedDashboard?.data.title}
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
