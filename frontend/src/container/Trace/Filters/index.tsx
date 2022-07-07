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
	'rpcMethod',
	'responseStatusCode',
	'httpMethod',
	'httpRoute',
	'httpUrl',
];

function Filters(): JSX.Element {
	return (
		<>
			{AllTraceFilterEnum.map((panelName) => (
				<Panel key={panelName} name={panelName} />
			))}
		</>
	);
}

export default Filters;
