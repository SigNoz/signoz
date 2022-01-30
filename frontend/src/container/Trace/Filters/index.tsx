import React from 'react';
import { TraceFilterEnum } from 'types/reducer/trace';

import Panel from './Panel';

const Filters = (): JSX.Element => {
	const name: TraceFilterEnum[] = [
		'duration',
		'status',
		'serviceName',
		'operation',
		'component',
		'httpCode',
		'httpHost',
		'httpMethod',
		'httpRoute',
		'httpUrl',
	];

	return (
		<>
			{name.map((panelName) => (
				<Panel key={panelName} name={panelName} />
			))}
		</>
	);
};

export default Filters;
