import './LeftContainer.styles.scss';

import { ENTITY_VERSION_V5 } from 'constants/app';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useGetQueryRange } from 'hooks/queryBuilder/useGetQueryRange';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { memo, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';

import { WidgetGraphProps } from '../types';
import ExplorerColumnsRenderer from './ExplorerColumnsRenderer';
import QuerySection from './QuerySection';
import { QueryContainer } from './styles';
import WidgetGraph from './WidgetGraph';

function LeftContainer({
	selectedGraph,
	selectedLogFields,
	setSelectedLogFields,
	selectedTracesFields,
	setSelectedTracesFields,
	selectedWidget,
	requestData,
	setRequestData,
	isLoadingPanelData,
	setQueryResponse,
	enableDrillDown = false,
}: WidgetGraphProps): JSX.Element {
	const { stagedQuery } = useQueryBuilder();

	const { selectedTime: globalSelectedInterval, minTime, maxTime } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);
	const queryResponse = useGetQueryRange(requestData, ENTITY_VERSION_V5, {
		enabled: !!stagedQuery,
		queryKey: [
			REACT_QUERY_KEY.GET_QUERY_RANGE,
			globalSelectedInterval,
			requestData,
			minTime,
			maxTime,
		],
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
				<QuerySection selectedGraph={selectedGraph} queryResponse={queryResponse} />
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
