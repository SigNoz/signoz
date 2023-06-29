import Graph from 'components/Graph';
import Spinner from 'components/Spinner';
import getChartData from 'lib/getChartData';
import { useMemo } from 'react';
import { SuccessResponse } from 'types/api';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';

import { Container, ErrorText } from './styles';

function TimeSeriesView({
	data,
	isLoading,
	isError,
}: TimeSeriesViewProps): JSX.Element {
	const chartData = useMemo(
		() =>
			getChartData({
				queryData: [
					{
						queryData: data?.payload?.data?.result || [],
					},
				],
			}),
		[data],
	);

	return (
		<Container>
			{isLoading && <Spinner height="50vh" size="small" tip="Loading..." />}
			{isError && <ErrorText>{data?.error || 'Something went wrong'}</ErrorText>}
			{!isLoading && !isError && (
				<Graph
					animate={false}
					data={chartData}
					name="tracesExplorerGraph"
					type="line"
				/>
			)}
		</Container>
	);
}

interface TimeSeriesViewProps {
	data?: SuccessResponse<MetricRangePayloadProps>;
	isLoading: boolean;
	isError: boolean;
}

TimeSeriesView.defaultProps = {
	data: undefined,
};

export default TimeSeriesView;
