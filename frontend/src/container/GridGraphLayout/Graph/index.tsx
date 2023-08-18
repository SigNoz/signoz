import { ChartData } from 'chart.js';
import Spinner from 'components/Spinner';
import { useGetQueryRange } from 'hooks/queryBuilder/useGetQueryRange';
import { useStepInterval } from 'hooks/queryBuilder/useStepInterval';
import usePreviousValue from 'hooks/usePreviousValue';
import { getDashboardVariables } from 'lib/dashbaordVariables/getDashboardVariables';
import getChartData from 'lib/getChartData';
import isEmpty from 'lodash-es/isEmpty';
import { memo, useMemo, useState } from 'react';
import { useInView } from 'react-intersection-observer';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import DashboardReducer from 'types/reducer/dashboards';
import { GlobalReducer } from 'types/reducer/globalTime';
import { getSelectedDashboardVariable } from 'utils/dashboard/selectedDashboard';

import EmptyWidget from '../EmptyWidget';
import { MenuItemKeys } from '../WidgetHeader/contants';
import { GridCardGraphProps } from './types';
import WidgetGraphComponent from './WidgetGraphComponent';

function GridCardGraph({
	widget,
	name,
	yAxisUnit,
	layout = [],
	setLayout,
	onDragSelect,
	onClickHandler,
	headerMenuList = [MenuItemKeys.View],
	isQueryEnabled,
	threshold,
}: GridCardGraphProps): JSX.Element {
	const { isAddWidget } = useSelector<AppState, DashboardReducer>(
		(state) => state.dashboards,
	);

	const { ref: graphRef, inView: isGraphVisible } = useInView({
		threshold: 0,
		triggerOnce: true,
		initialInView: false,
	});

	const [errorMessage, setErrorMessage] = useState<string | undefined>('');

	const { minTime, maxTime, selectedTime: globalSelectedInterval } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);
	const { dashboards } = useSelector<AppState, DashboardReducer>(
		(state) => state.dashboards,
	);

	const variables = getSelectedDashboardVariable(dashboards);

	const updatedQuery = useStepInterval(widget?.query);

	const isEmptyWidget = useMemo(
		() => widget?.id === 'empty' || isEmpty(widget),
		[widget],
	);

	const queryResponse = useGetQueryRange(
		{
			selectedTime: widget?.timePreferance,
			graphType: widget?.panelTypes,
			query: updatedQuery,
			globalSelectedInterval,
			variables: getDashboardVariables(),
		},
		{
			queryKey: [
				`GetMetricsQueryRange-${widget?.timePreferance}-${globalSelectedInterval}-${widget?.id}`,
				maxTime,
				minTime,
				globalSelectedInterval,
				variables,
				widget?.query,
				widget?.panelTypes,
			],
			keepPreviousData: true,
			enabled: isGraphVisible && !isEmptyWidget && isQueryEnabled && !isAddWidget,
			refetchOnMount: false,
			onError: (error) => {
				setErrorMessage(error.message);
			},
		},
	);

	const chartData = useMemo(
		() =>
			getChartData({
				queryData: [
					{
						queryData: queryResponse?.data?.payload?.data?.result || [],
					},
				],
			}),
		[queryResponse],
	);

	const prevChartDataSetRef = usePreviousValue<ChartData>(chartData);

	const isEmptyLayout = widget?.id === 'empty' || isEmpty(widget);

	if (queryResponse.isRefetching || queryResponse.isLoading) {
		return <Spinner height="20vh" tip="Loading..." />;
	}

	if ((queryResponse.isError && !isEmptyLayout) || !isQueryEnabled) {
		return (
			<span ref={graphRef}>
				{!isEmpty(widget) && prevChartDataSetRef && (
					<WidgetGraphComponent
						enableModel
						enableWidgetHeader
						widget={widget}
						queryResponse={queryResponse}
						errorMessage={errorMessage}
						data={prevChartDataSetRef}
						name={name}
						yAxisUnit={yAxisUnit}
						layout={layout}
						setLayout={setLayout}
						threshold={threshold}
						headerMenuList={headerMenuList}
					/>
				)}
			</span>
		);
	}

	if (!isEmpty(widget) && prevChartDataSetRef?.labels) {
		return (
			<span ref={graphRef}>
				<WidgetGraphComponent
					enableModel={false}
					enableWidgetHeader
					widget={widget}
					queryResponse={queryResponse}
					errorMessage={errorMessage}
					data={prevChartDataSetRef}
					name={name}
					yAxisUnit={yAxisUnit}
					layout={layout}
					setLayout={setLayout}
					threshold={threshold}
					headerMenuList={headerMenuList}
					onClickHandler={onClickHandler}
				/>
			</span>
		);
	}

	return (
		<span ref={graphRef}>
			{!isEmpty(widget) && !!queryResponse.data?.payload && (
				<WidgetGraphComponent
					enableModel={!isEmptyLayout}
					enableWidgetHeader={!isEmptyLayout}
					widget={widget}
					queryResponse={queryResponse}
					errorMessage={errorMessage}
					data={chartData}
					name={name}
					yAxisUnit={yAxisUnit}
					onDragSelect={onDragSelect}
					threshold={threshold}
					headerMenuList={headerMenuList}
					onClickHandler={onClickHandler}
				/>
			)}

			{isEmptyLayout && <EmptyWidget />}
		</span>
	);
}

GridCardGraph.defaultProps = {
	onDragSelect: undefined,
	onClickHandler: undefined,
	isQueryEnabled: true,
	threshold: undefined,
	headerMenuList: [MenuItemKeys.View],
};

export default memo(GridCardGraph);
