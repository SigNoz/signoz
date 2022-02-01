import React from 'react';
import { TraceFilterEnum } from 'types/reducer/trace';

import Panel from './Panel';

export const AllTraceFilterEnum: TraceFilterEnum[] = [
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

const Filters = (): JSX.Element => (
	<React.Fragment>
		{AllTraceFilterEnum.map((panelName) => (
			<Panel key={panelName} name={panelName} />
		))}
	</React.Fragment>
);

export default Filters;
