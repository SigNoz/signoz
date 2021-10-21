import React from 'react';

import Description from './DescriptionOfDashboard';
import GridGraphs from './GridGraphs';

const NewDashboard = (): JSX.Element => {
	return (
		<>
			<Description />
			<GridGraphs />
		</>
	);
};

export default NewDashboard;
