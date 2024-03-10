import { DEFAULT_ENTITY_VERSION } from 'constants/app';
import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useGetQueryRange } from 'hooks/queryBuilder/useGetQueryRange';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { getDashboardVariables } from 'lib/dashbaordVariables/getDashboardVariables';
import { GetQueryResultsProps } from 'lib/dashboard/getQueryResults';
import { useDashboard } from 'providers/Dashboard/Dashboard';
import { memo, useState } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';
import { getGraphType } from 'utils/getGraphType';

import { WidgetGraphProps } from '../types';
import ExplorerColumnsRenderer from './ExplorerColumnsRenderer';
import QuerySection from './QuerySection';
import { QueryContainer } from './styles';
import WidgetGraph from './WidgetGraph';

function LeftContainer({
	selectedGraph,
	yAxisUnit,
	selectedTime,
	thresholds,
	fillSpans,
	softMax,
	softMin,
	selectedLogFields,
	setSelectedLogFields,
	selectedTracesFields,
	setSelectedTracesFields,
	selectedWidget,
}: WidgetGraphProps): JSX.Element {
	const { stagedQuery } = useQueryBuilder();
	const { selectedDashboard } = useDashboard();

	const { selectedTime: globalSelectedInterval } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);

	const [requestData, setRequestData] = useState<GetQueryResultsProps>(() => {
		if (selectedWidget && selectedWidget.panelTypes !== PANEL_TYPES.LIST) {
			return {
				selectedTime: selectedWidget?.timePreferance,
				graphType: getGraphType(selectedWidget.panelTypes),
				query: stagedQuery || initialQueriesMap.metrics,
				globalSelectedInterval,
				variables: getDashboardVariables(selectedDashboard?.data.variables),
			};
		}
		const updatedQuery = { ...(stagedQuery || initialQueriesMap.metrics) };
		updatedQuery.builder.queryData[0].pageSize = 10;
		return {
			query: updatedQuery,
			graphType: PANEL_TYPES.LIST,
			selectedTime: 'GLOBAL_TIME',
			globalSelectedInterval,
			tableParams: {
				pagination: {
					offset: 0,
					limit: updatedQuery.builder.queryData[0].limit || 0,
				},
			},
		};
	});

	const queryResponse = useGetQueryRange(
		requestData,
		selectedDashboard?.data?.version || DEFAULT_ENTITY_VERSION,
		{
			enabled: !!stagedQuery,
			retry: false,
			queryKey: [
				REACT_QUERY_KEY.GET_QUERY_RANGE,
				selectedTime,
				globalSelectedInterval,
				requestData,
			],
		},
	);

	return (
		<>
			<WidgetGraph
				thresholds={thresholds}
				selectedTime={selectedTime}
				selectedGraph={selectedGraph}
				yAxisUnit={yAxisUnit}
				fillSpans={fillSpans}
				softMax={softMax}
				softMin={softMin}
				selectedLogFields={selectedLogFields}
				selectedTracesFields={selectedTracesFields}
				queryResponse={queryResponse}
				setRequestData={setRequestData}
				selectedWidget={selectedWidget}
			/>
			<QueryContainer>
				<QuerySection
					selectedGraph={selectedGraph}
					queryResponse={queryResponse}
					setRequestData={setRequestData}
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
