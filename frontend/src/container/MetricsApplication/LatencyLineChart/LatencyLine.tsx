import { ChartData, ChartOptions } from 'chart.js';
import Graph from 'components/Graph';
import React from 'react';

import { GraphContainer } from '../styles';

const LatencyChart = ({
	data,
	onClickhandler,
}: LatencyChartProps): JSX.Element => {
	return (
		<GraphContainer>
			<Graph
				onClickHandler={onClickhandler}
				xAxisType="timeseries"
				type="line"
				data={data}
			/>
		</GraphContainer>
	);
};

interface LatencyChartProps {
	data: ChartData;
	onClickhandler: ChartOptions['onClick'];
}

export default LatencyChart;
