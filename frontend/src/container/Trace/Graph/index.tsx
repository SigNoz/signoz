import React from 'react';

import Graph from 'components/Graph';
import { Chart } from 'chart.js';

const TraceGraph = () => {
	const data: Chart['data'] = { datasets: [], labels: [] };

	return (
		<>
			{
				<Graph
					{...{
						data: data,
						name: 'asd',
						type: 'line',
					}}
				/>
			}
		</>
	);
};

export default TraceGraph;
