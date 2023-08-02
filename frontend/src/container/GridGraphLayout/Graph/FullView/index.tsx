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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';

import { toggleGraphsVisibilityInChart } from '../utils';
import { PANEL_TYPES_VS_FULL_VIEW_TABLE } from './contants';
import GraphManager from './GraphManager';
import { GraphContainer, TimeContainer } from './styles';
import { FullViewProps } from './types';
import { getIsGraphLegendToggleAvailable } from './utils';

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
}: FullViewProps): JSX.Element {
	const { selectedTime: globalSelectedTime } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);

	const getSelectedTime = useCallback(
		() =>
			timeItems.find((e) => e.enum === (widget?.timePreferance || 'GLOBAL_TIME')),
		[widget],
	);

	const canModifyChart = useChartMutable({
		panelType: widget.panelTypes,
		panelTypeAndGraphManagerVisibility: PANEL_TYPES_VS_FULL_VIEW_TABLE,
	});

	const lineChartRef = useRef<ToggleGraphProps>();

	useEffect(() => {
		if (graphsVisibilityStates && canModifyChart && lineChartRef.current) {
			toggleGraphsVisibilityInChart({
				graphsVisibilityStates,
				lineChartRef,
			});
		}
	}, [graphsVisibilityStates, canModifyChart]);

	const [selectedTime, setSelectedTime] = useState<timePreferance>({
		name: getSelectedTime()?.name || '',
		enum: widget?.timePreferance || 'GLOBAL_TIME',
	});

	const queryKey = useMemo(
		() =>
			`FullViewGetMetricsQueryRange-${selectedTime.enum}-${globalSelectedTime}-${widget.id}`,
		[selectedTime, globalSelectedTime, widget],
	);

	const updatedQuery = useStepInterval(widget?.query);

	const response = useGetQueryRange(
		{
			selectedTime: selectedTime.enum,
			graphType: widget.panelTypes,
			query: updatedQuery,
			globalSelectedInterval: globalSelectedTime,
			variables: getDashboardVariables(),
		},
		{
			queryKey,
			enabled: !isDependedDataLoaded,
		},
	);

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

	const isGraphLegendToggleAvailable = getIsGraphLegendToggleAvailable(
		widget.panelTypes,
	);

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

			<GraphContainer isGraphLegendToggleAvailable={isGraphLegendToggleAvailable}>
				<GridPanelSwitch
					panelType={widget.panelTypes}
					data={chartDataSet}
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
					data={chartDataSet}
					name={name}
					yAxisUnit={yAxisUnit}
					onToggleModelHandler={onToggleModelHandler}
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
