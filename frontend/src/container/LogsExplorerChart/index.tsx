import Graph from 'components/Graph';
import Spinner from 'components/Spinner';
import getChartData, { GetChartDataProps } from 'lib/getChartData';
import { colors } from 'lib/getRandomColor';
import { memo, useMemo } from 'react';

import { LogsExplorerChartProps } from './LogsExplorerChart.interfaces';
import { CardStyled } from './LogsExplorerChart.styled';

function LogsExplorerChart({
	data,
	isLoading,
}: LogsExplorerChartProps): JSX.Element {
	const handleCreateDatasets: Required<GetChartDataProps>['createDataset'] = (
		element,
		index,
		allLabels,
	) => ({
		label: allLabels[index],
		data: element,
		backgroundColor: colors[index % colors.length] || 'red',
		borderColor: colors[index % colors.length] || 'red',
	});

	const graphData = useMemo(
		() =>
			getChartData({
				queryData: [
					{
						queryData: data,
					},
				],
				createDataset: handleCreateDatasets,
			}),
		[data],
	);

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
