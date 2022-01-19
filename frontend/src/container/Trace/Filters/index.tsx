import React from 'react';

import Panel from './Panel';

const Filters = (): JSX.Element => {
	return (
		<>
			<Panel name="duration" />
			<Panel name="status" />
			<Panel name="serviceName" />
			<Panel name="component" />
			<Panel name="httpCode" />
			<Panel name="httpHost" />
			<Panel name="httpMethod" />
			<Panel name="httpRoute" />
			<Panel name="httpUrl" />
			<Panel name="operation" />
		</>
	);
};

export default Filters;
