import './LeftContainer.styles.scss';

import { DEFAULT_ENTITY_VERSION } from 'constants/app';
import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useGetQueryRange } from 'hooks/queryBuilder/useGetQueryRange';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { getDashboardVariables } from 'lib/dashbaordVariables/getDashboardVariables';
import { GetQueryResultsProps } from 'lib/dashboard/getQueryResults';
import { useDashboard } from 'providers/Dashboard/Dashboard';
import { memo, useEffect, useState } from 'react';
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
	selectedLogFields,
	setSelectedLogFields,
	selectedTracesFields,
	setSelectedTracesFields,
	selectedWidget,
	selectedTime,
}: WidgetGraphProps): JSX.Element {
	const { stagedQuery, redirectWithQueryBuilderData } = useQueryBuilder();
	const { selectedDashboard } = useDashboard();

	const { selectedTime: globalSelectedInterval } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);

	const [requestData, setRequestData] = useState<GetQueryResultsProps>(() => {
		if (selectedWidget && selectedGraph !== PANEL_TYPES.LIST) {
			return {
				selectedTime: selectedWidget?.timePreferance,
				graphType: getGraphType(selectedGraph || selectedWidget.panelTypes),
				query: stagedQuery || initialQueriesMap.metrics,
				globalSelectedInterval,
				variables: getDashboardVariables(selectedDashboard?.data.variables),
			};
		}
		const updatedQuery = { ...(stagedQuery || initialQueriesMap.metrics) };
		updatedQuery.builder.queryData[0].pageSize = 10;
		redirectWithQueryBuilderData(updatedQuery);
		return {
			query: updatedQuery,
			graphType: PANEL_TYPES.LIST,
			selectedTime: selectedTime.enum || 'GLOBAL_TIME',
			globalSelectedInterval,
			tableParams: {
				pagination: {
					offset: 0,
					limit: updatedQuery.builder.queryData[0].limit || 0,
				},
			},
		};
	});

	useEffect(() => {
		if (stagedQuery) {
			setRequestData((prev) => ({
				...prev,
				selectedTime: selectedTime.enum || prev.selectedTime,
				globalSelectedInterval,
				graphType: getGraphType(selectedGraph || selectedWidget.panelTypes),
				query: stagedQuery,
			}));
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [stagedQuery, selectedTime, globalSelectedInterval]);

	const queryResponse = useGetQueryRange(
		requestData,
		selectedDashboard?.data?.version || DEFAULT_ENTITY_VERSION,
		{
			enabled: !!stagedQuery,
			retry: false,
			queryKey: [
				REACT_QUERY_KEY.GET_QUERY_RANGE,
				globalSelectedInterval,
				requestData,
			],
		},
	);

	return (
		<>
			<WidgetGraph
				selectedGraph={selectedGraph}
				queryResponse={queryResponse}
				setRequestData={setRequestData}
				selectedWidget={selectedWidget}
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
