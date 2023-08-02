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
	allowDelete,
	allowClone,
	allowEdit,
	isQueryEnabled,
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
				widget,
				maxTime,
				minTime,
				globalSelectedInterval,
				variables,
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

	if (queryResponse.isRefetching) {
		return <Spinner height="20vh" tip="Loading..." />;
	}

	if (queryResponse.isError && !isEmptyLayout) {
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
						allowClone={allowClone}
						allowDelete={allowDelete}
						allowEdit={allowEdit}
					/>
				)}
			</span>
		);
	}

	if (queryResponse.status === 'loading' || queryResponse.status === 'idle') {
		return (
			<span ref={graphRef}>
				{!isEmpty(widget) && prevChartDataSetRef?.labels ? (
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
						allowClone={allowClone}
						allowDelete={allowDelete}
						allowEdit={allowEdit}
						onClickHandler={onClickHandler}
					/>
				) : (
					<Spinner height="20vh" tip="Loading..." />
				)}
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
					allowClone={allowClone}
					allowDelete={allowDelete}
					allowEdit={allowEdit}
				/>
			)}

			{isEmptyLayout && <EmptyWidget />}
		</span>
	);
}

GridCardGraph.defaultProps = {
	onDragSelect: undefined,
	onClickHandler: undefined,
	allowDelete: true,
	allowClone: true,
	allowEdit: true,
	isQueryEnabled: true,
};

export default memo(GridCardGraph);
