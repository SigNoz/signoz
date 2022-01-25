import React from 'react';

import Panel from './Panel';

const Filters = (): JSX.Element => {
	return (
		<>
			<Panel name="duration" />
			<Panel name="status" />
			<Panel name="serviceName" />
			<Panel name="operation" />
			<Panel name="component" />
			<Panel name="httpCode" />
			<Panel name="httpHost" />
			<Panel name="httpMethod" />
			<Panel name="httpRoute" />
			<Panel name="httpUrl" />
		</>
	);
};

export default Filters;
