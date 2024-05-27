import { TraceFilterEnum } from 'types/reducer/trace';

import Panel from './Panel';

export const AllTraceFilterEnum: TraceFilterEnum[] = [
	'duration',
	'status',
	'serviceName',
	'operation',
	'rpcMethod',
	'responseStatusCode',
	'httpHost',
	'httpMethod',
	'httpRoute',
	'httpUrl',
	'traceID',
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
