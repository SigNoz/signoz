import Graph from 'components/Graph';
import { GRAPH_TYPES } from 'container/NewDashboard/ComponentsSlider';
import React from 'react';

const GridGraphComponent = ({
	GRAPH_TYPES,
	data,
}: GridGraphComponentProps): JSX.Element | null => {
	// send the request to get the data from the server
	if (GRAPH_TYPES === 'Time Series' && data !== undefined) {
		console.log(data, 'asd');
		return <Graph type="line" data={data} />;
	}

	if (GRAPH_TYPES === 'Value') {
		return <div>asd</div>;
	}

	return null;
};

interface GridGraphComponentProps {
	GRAPH_TYPES: GRAPH_TYPES;
	data?: Chart.ChartData;
}

export default GridGraphComponent;
