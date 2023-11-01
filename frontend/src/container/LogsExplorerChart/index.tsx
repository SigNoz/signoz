import Graph from 'components/Graph';
import Spinner from 'components/Spinner';
import { themeColors } from 'constants/theme';
import getChartData, { GetChartDataProps } from 'lib/getChartData';
import { colors } from 'lib/getRandomColor';
import { memo, useCallback, useMemo } from 'react';

import { LogsExplorerChartProps } from './LogsExplorerChart.interfaces';
import { CardStyled } from './LogsExplorerChart.styled';

function LogsExplorerChart({
	data,
	isLoading,
	isLabelEnabled = true,
	className,
}: LogsExplorerChartProps): JSX.Element {
	const handleCreateDatasets: Required<GetChartDataProps>['createDataset'] = useCallback(
		(element, index, allLabels) => ({
			data: element,
			backgroundColor: colors[index % colors.length] || themeColors.red,
			borderColor: colors[index % colors.length] || themeColors.red,
			...(isLabelEnabled
				? {
						label: allLabels[index],
				  }
				: {}),
		}),
		[isLabelEnabled],
	);

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
		[data, handleCreateDatasets],
	);

	return (
		<CardStyled className={className}>
			{isLoading ? (
				<Spinner size="default" height="100%" />
			) : (
				<Graph
					name="logsExplorerChart"
					data={graphData.data}
					type="bar"
					containerHeight="100%"
					animate
				/>
			)}
		</CardStyled>
	);
}

export default memo(LogsExplorerChart);
