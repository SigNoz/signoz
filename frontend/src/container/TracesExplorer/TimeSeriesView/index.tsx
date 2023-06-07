import Graph from 'components/Graph';
import Spinner from 'components/Spinner';
import getChartDataV3 from 'lib/getChartDataV3';
import { useMemo } from 'react';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

import { Container, ErrorText } from './styles';
import { useGetTracesExplorerQueryRange } from './useGetTracesExplorerQueryRange';

function TimeSeriesView({ query }: TimeSeriesViewProps): JSX.Element {
	const { data, isLoading, isError } = useGetTracesExplorerQueryRange({ query });
	const chartData = useMemo(
		() => getChartDataV3(data?.payload?.data?.result || [], query),
		[data, query],
	);

	if (isError) {
		return (
			<Container>
				<ErrorText>{data?.error || 'Something went wrong'}</ErrorText>
			</Container>
		);
	}

	if (isLoading) {
		return (
			<Container>
				<Spinner height="45vh" size="small" tip="Loading..." />
			</Container>
		);
	}

	return (
		<Container>
			<Graph
				animate={false}
				data={chartData}
				name="tracesExplorerGraph"
				type="line"
			/>
		</Container>
	);
}

interface TimeSeriesViewProps {
	query: Query;
}

export default TimeSeriesView;
