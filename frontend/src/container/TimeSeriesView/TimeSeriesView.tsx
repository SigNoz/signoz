import Spinner from 'components/Spinner';
import Uplot from 'components/Uplot';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { getUPlotChartOptions } from 'lib/uPlotLib/getUplotChartOptions';
import { getUPlotChartData } from 'lib/uPlotLib/utils/getUplotChartData';
import { useMemo, useRef } from 'react';
import { SuccessResponse } from 'types/api';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';

import { Container, ErrorText } from './styles';

function TimeSeriesView({
	data,
	isLoading,
	isError,
	yAxisUnit,
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

	const chartOptions = getUPlotChartOptions({
		yAxisUnit: yAxisUnit || '',
		apiResponse: data?.payload,
		dimensions: {
			width,
			height,
		},
		isDarkMode,
	});

	return (
		<Container>
			{isLoading && <Spinner height="50vh" size="small" tip="Loading..." />}
			{isError && <ErrorText>{data?.error || 'Something went wrong'}</ErrorText>}
			<div
				className="graph-container"
				style={{ height: '100%', width: '100%' }}
				ref={graphRef}
			>
				{!isLoading && !isError && chartData && chartOptions && (
					<Uplot data={chartData} options={chartOptions} />
				)}
			</div>
		</Container>
	);
}

interface TimeSeriesViewProps {
	data?: SuccessResponse<MetricRangePayloadProps>;
	yAxisUnit?: string;
	isLoading: boolean;
	isError: boolean;
}

TimeSeriesView.defaultProps = {
	data: undefined,
	yAxisUnit: 'short',
};

export default TimeSeriesView;
