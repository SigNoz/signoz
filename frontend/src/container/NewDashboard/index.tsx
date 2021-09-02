import React from 'react';

import Description from './DescriptionOfDashboard';
import GridGraphs from './GridGraphs';

const NewDashboard = (): JSX.Element => {
	return (
		<div>
			<Description />
			<GridGraphs />
		</div>
	);
};

export default NewDashboard;
