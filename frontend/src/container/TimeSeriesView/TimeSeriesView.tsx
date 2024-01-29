import './TimeSeriesView.styles.scss';

import Uplot from 'components/Uplot';
import EmptyLogsSearch from 'container/EmptyLogsSearch/EmptyLogsSearch';
import LogsError from 'container/LogsError/LogsError';
import { LogsLoading } from 'container/LogsLoading/LogsLoading';
import NoLogs from 'container/NoLogs/NoLogs';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { getUPlotChartOptions } from 'lib/uPlotLib/getUplotChartOptions';
import { getUPlotChartData } from 'lib/uPlotLib/utils/getUplotChartData';
import { isEmpty } from 'lodash-es';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { SuccessResponse } from 'types/api';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import { GlobalReducer } from 'types/reducer/globalTime';
import { getTimeRange } from 'utils/getTimeRange';

import { Container } from './styles';

function TimeSeriesView({
	data,
	isLoading,
	isError,
	yAxisUnit,
	isFilterApplied,
}: TimeSeriesViewProps): JSX.Element {
	const graphRef = useRef<HTMLDivElement>(null);

	const chartData = useMemo(() => getUPlotChartData(data?.payload), [
		data?.payload,
	]);

	const isDarkMode = useIsDarkMode();

	const width = graphRef.current?.clientWidth
		? graphRef.current.clientWidth
		: 700;

	const height = graphRef.current?.clientWidth
		? graphRef.current.clientHeight
		: 300;

	const [minTimeScale, setMinTimeScale] = useState<number>();
	const [maxTimeScale, setMaxTimeScale] = useState<number>();

	const { minTime, maxTime, selectedTime: globalSelectedInterval } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);

	useEffect((): void => {
		const { startTime, endTime } = getTimeRange();

		setMinTimeScale(startTime);
		setMaxTimeScale(endTime);
	}, [maxTime, minTime, globalSelectedInterval, data]);

	const chartOptions = getUPlotChartOptions({
		yAxisUnit: yAxisUnit || '',
		apiResponse: data?.payload,
		dimensions: {
			width,
			height,
		},
		isDarkMode,
		minTimeScale,
		maxTimeScale,
		softMax: null,
		softMin: null,
	});

	return (
		<Container>
			{isError && <LogsError />}
			{}
			<div
				className="graph-container"
				style={{ height: '100%', width: '100%' }}
				ref={graphRef}
			>
				{isLoading && <LogsLoading />}

				{chartData &&
					chartData[0] &&
					chartData[0]?.length === 0 &&
					!isLoading &&
					!isError &&
					isFilterApplied && <EmptyLogsSearch />}

				{chartData &&
					chartData[0] &&
					chartData[0]?.length === 0 &&
					!isLoading &&
					!isError &&
					!isFilterApplied && <NoLogs />}

				{!isLoading &&
					!isError &&
					chartData &&
					!isEmpty(chartData?.[0]) &&
					chartOptions && <Uplot data={chartData} options={chartOptions} />}
			</div>
		</Container>
	);
}

interface TimeSeriesViewProps {
	data?: SuccessResponse<MetricRangePayloadProps>;
	yAxisUnit?: string;
	isLoading: boolean;
	isError: boolean;
	isFilterApplied: boolean;
}

TimeSeriesView.defaultProps = {
	data: undefined,
	yAxisUnit: 'short',
};

export default TimeSeriesView;
