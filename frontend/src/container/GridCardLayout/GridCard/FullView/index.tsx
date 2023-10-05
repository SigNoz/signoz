import { Button } from 'antd';
import { ToggleGraphProps } from 'components/Graph/types';
import Spinner from 'components/Spinner';
import TimePreference from 'components/TimePreferenceDropDown';
import GridPanelSwitch from 'container/GridPanelSwitch';
import {
	timeItems,
	timePreferance,
} from 'container/NewWidget/RightContainer/timeItems';
import { useGetQueryRange } from 'hooks/queryBuilder/useGetQueryRange';
import { useStepInterval } from 'hooks/queryBuilder/useStepInterval';
import { useChartMutable } from 'hooks/useChartMutable';
import { getDashboardVariables } from 'lib/dashbaordVariables/getDashboardVariables';
import getChartData from 'lib/getChartData';
import { useDashboard } from 'providers/Dashboard/Dashboard';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';

import { PANEL_TYPES_VS_FULL_VIEW_TABLE } from './contants';
import GraphManager from './GraphManager';
import { GraphContainer, TimeContainer } from './styles';
import { FullViewProps } from './types';

function FullView({
	widget,
	fullViewOptions = true,
	onClickHandler,
	name,
	yAxisUnit,
	onDragSelect,
	isDependedDataLoaded = false,
	graphsVisibilityStates,
	onToggleModelHandler,
	setGraphsVisibilityStates,
	parentChartRef,
}: FullViewProps): JSX.Element {
	const { selectedTime: globalSelectedTime } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);

	const { selectedDashboard } = useDashboard();

	const getSelectedTime = useCallback(
		() =>
			timeItems.find((e) => e.enum === (widget?.timePreferance || 'GLOBAL_TIME')),
		[widget],
	);

	const lineChartRef = useRef<ToggleGraphProps>();

	const [selectedTime, setSelectedTime] = useState<timePreferance>({
		name: getSelectedTime()?.name || '',
		enum: widget?.timePreferance || 'GLOBAL_TIME',
	});

	const updatedQuery = useStepInterval(widget?.query);

	const response = useGetQueryRange(
		{
			selectedTime: selectedTime.enum,
			graphType: widget.panelTypes,
			query: updatedQuery,
			globalSelectedInterval: globalSelectedTime,
			variables: getDashboardVariables(selectedDashboard?.data.variables),
		},
		{
			queryKey: `FullViewGetMetricsQueryRange-${selectedTime.enum}-${globalSelectedTime}-${widget.id}`,
			enabled: !isDependedDataLoaded,
		},
	);

	const canModifyChart = useChartMutable({
		panelType: widget.panelTypes,
		panelTypeAndGraphManagerVisibility: PANEL_TYPES_VS_FULL_VIEW_TABLE,
	});

	const chartDataSet = useMemo(
		() =>
			getChartData({
				queryData: [
					{
						queryData: response?.data?.payload?.data?.result || [],
					},
				],
			}),
		[response],
	);

	useEffect(() => {
		if (!response.isFetching && lineChartRef.current) {
			graphsVisibilityStates?.forEach((e, i) => {
				lineChartRef?.current?.toggleGraph(i, e);
				parentChartRef?.current?.toggleGraph(i, e);
			});
		}
	}, [graphsVisibilityStates, parentChartRef, response.isFetching]);

	if (response.isFetching) {
		return <Spinner height="100%" size="large" tip="Loading..." />;
	}

	return (
		<>
			{fullViewOptions && (
				<TimeContainer $panelType={widget.panelTypes}>
					<TimePreference
						selectedTime={selectedTime}
						setSelectedTime={setSelectedTime}
					/>
					<Button
						onClick={(): void => {
							response.refetch();
						}}
						type="primary"
					>
						Refresh
					</Button>
				</TimeContainer>
			)}

			<GraphContainer isGraphLegendToggleAvailable={canModifyChart}>
				<GridPanelSwitch
					panelType={widget.panelTypes}
					data={chartDataSet.data}
					isStacked={widget.isStacked}
					opacity={widget.opacity}
					title={widget.title}
					onClickHandler={onClickHandler}
					name={name}
					yAxisUnit={yAxisUnit}
					onDragSelect={onDragSelect}
					panelData={response.data?.payload.data.newResult.data.result || []}
					query={widget.query}
					ref={lineChartRef}
				/>
			</GraphContainer>

			{canModifyChart && (
				<GraphManager
					data={chartDataSet.data}
					name={name}
					yAxisUnit={yAxisUnit}
					onToggleModelHandler={onToggleModelHandler}
					setGraphsVisibilityStates={setGraphsVisibilityStates}
					graphsVisibilityStates={graphsVisibilityStates}
					lineChartRef={lineChartRef}
					parentChartRef={parentChartRef}
				/>
			)}
		</>
	);
}

FullView.defaultProps = {
	fullViewOptions: undefined,
	onClickHandler: undefined,
	yAxisUnit: undefined,
	onDragSelect: undefined,
	isDependedDataLoaded: undefined,
};

FullView.displayName = 'FullView';

export default FullView;
