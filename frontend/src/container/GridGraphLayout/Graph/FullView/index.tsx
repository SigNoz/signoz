import { Button } from 'antd';
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
import { useCallback, useMemo, useState } from 'react';
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
	graphsVisibilityStates,
	isDependedDataLoaded = false,
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

	if (
		response.status === 'idle' ||
		response.status === 'loading' ||
		response.isFetching
	) {
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

			<GraphContainer>
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
					graphsVisibilityStates={graphsVisibilityStates}
				/>
			</GraphContainer>

			{canModifyChart && (
				<GraphManager
					data={chartDataSet}
					name={name}
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
	graphsVisibilityStates: undefined,
	graphVisibilityStateHandler: undefined,
	isDependedDataLoaded: undefined,
};

export default FullView;
