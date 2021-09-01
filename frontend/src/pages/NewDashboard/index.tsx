import { Col } from 'antd';
import AddTags from 'container/NewDashboard/AddTags';
import GridGraph from 'container/NewDashboard/GridGraphs';
import NameOfTheDashboard from 'container/NewDashboard/NameOfTheDashboard';
import React, { useState } from 'react';

const NewDashboard = (): JSX.Element => {
	const [isEditMode, setIsEditMode] = useState(false);

	return (
		<Col>
			<NameOfTheDashboard />
			<AddTags />
			<GridGraph />
		</Col>
	);
};

export default NewDashboard;
