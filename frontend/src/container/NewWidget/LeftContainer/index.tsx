import GridGraphComponent from 'container/GridGraphComponent';
import React from 'react';

import { NewWidgetProps } from '../index';
import QuerySection from './QuerySection';

const LeftContainer = ({ selectedGraph }: NewWidgetProps): JSX.Element => {
	return (
		<>
			<GridGraphComponent
				data={{
					datasets: [],
					labels: ['asd'],
				}}
				GRAPH_TYPES={selectedGraph}
			/>
			<QuerySection />
		</>
	);
};

export default LeftContainer;
