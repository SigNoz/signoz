import Graph from 'components/Graph';
import { GRAPH_TYPES } from 'container/NewDashboard/ComponentsSlider';
import React from 'react';

const GridGraphComponent = ({
	GRAPH_TYPES,
}: GridGraphComponentProps): JSX.Element | null => {
	// send the request to get the data from the server
	if (GRAPH_TYPES === 'TIME_SERIES') {
		// return <Graph type="line" />;
	}

	if (GRAPH_TYPES === 'VALUE') {
		return <div>asd</div>;
	}

	return null;
};

export interface GridGraphComponentProps {
	GRAPH_TYPES: GRAPH_TYPES;
}

export default GridGraphComponent;
