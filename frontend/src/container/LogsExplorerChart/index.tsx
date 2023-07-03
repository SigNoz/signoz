import Graph from 'components/Graph';
import Spinner from 'components/Spinner';
import { getExplorerChartData } from 'lib/explorer/getExplorerChartData';
import { memo, useMemo } from 'react';

import { LogsExplorerChartProps } from './LogsExplorerChart.interfaces';
import { CardStyled } from './LogsExplorerChart.styled';

function LogsExplorerChart({
	data,
	isLoading,
}: LogsExplorerChartProps): JSX.Element {
	const graphData = useMemo(() => getExplorerChartData(data), [data]);

	return (
		<CardStyled>
			{isLoading ? (
				<Spinner size="default" height="100%" />
			) : (
				<Graph
					name="logsExplorerChart"
					data={graphData}
					type="bar"
					containerHeight="100%"
					animate
				/>
			)}
		</CardStyled>
	);
}

export default memo(LogsExplorerChart);
