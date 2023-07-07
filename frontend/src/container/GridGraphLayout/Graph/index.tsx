import { ChartData } from 'chart.js';
import Spinner from 'components/Spinner';
import { useGetQueryRange } from 'hooks/queryBuilder/useGetQueryRange';
import { useStepInterval } from 'hooks/queryBuilder/useStepInterval';
import usePreviousValue from 'hooks/usePreviousValue';
import { getDashboardVariables } from 'lib/dashbaordVariables/getDashboardVariables';
import getChartData from 'lib/getChartData';
import isEmpty from 'lodash-es/isEmpty';
import { Dispatch, memo, SetStateAction, useMemo, useState } from 'react';
import { Layout } from 'react-grid-layout';
import { useInView } from 'react-intersection-observer';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { Widgets } from 'types/api/dashboard/getAll';
import DashboardReducer from 'types/reducer/dashboards';
import { GlobalReducer } from 'types/reducer/globalTime';

import { LayoutProps } from '..';
import EmptyWidget from '../EmptyWidget';
import WidgetGraphComponent from './WidgetGraphComponent';

function GridCardGraph({
	widget,
	name,
	yAxisUnit,
	layout = [],
	setLayout,
	onDragSelect,
}: GridCardGraphProps): JSX.Element {
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
	const [selectedDashboard] = dashboards;
	const selectedData = selectedDashboard?.data;
	const { variables } = selectedData;

	const updatedQuery = useStepInterval(widget?.query);

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
			enabled: isGraphVisible,
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
					/>
				)}
			</span>
		);
	}

	if (prevChartDataSetRef?.labels === undefined && queryResponse.isLoading) {
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
				/>
			)}

			{isEmptyLayout && <EmptyWidget />}
		</span>
	);
}

interface GridCardGraphProps {
	widget: Widgets;
	name: string;
	yAxisUnit: string | undefined;
	// eslint-disable-next-line react/require-default-props
	layout?: Layout[];
	// eslint-disable-next-line react/require-default-props
	setLayout?: Dispatch<SetStateAction<LayoutProps[]>>;
	onDragSelect?: (start: number, end: number) => void;
}

GridCardGraph.defaultProps = {
	onDragSelect: undefined,
};

export default memo(GridCardGraph);
