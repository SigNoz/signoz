import GridGraphLayout from 'container/GridGraphLayout';
import AddTags from 'container/NewDashboard/AddTags';
import NameOfTheDashboard from 'container/NewDashboard/NameOfTheDashboard';
import React from 'react';

const NewDashboard = (): JSX.Element => {
	return (
		<div>
			<NameOfTheDashboard />
			<AddTags />
			<GridGraphLayout />
		</div>
	);
};

export default NewDashboard;
