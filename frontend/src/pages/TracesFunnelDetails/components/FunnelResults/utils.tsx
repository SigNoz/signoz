import { AppLink } from 'lib/router/AppLink';
import { getYAxisFormattedValue } from 'components/Graph/yAxisConfig';

export const topTracesTableColumns = [
	{
		title: 'TRACE ID',
		dataIndex: 'trace_id',
		key: 'trace_id',
		render: (traceId: string): JSX.Element => (
			<AppLink
				to={`/trace/${traceId}`}
				className="trace-id-cell"
				target="_blank"
				rel="noopener noreferrer"
			>
				{traceId}
			</AppLink>
		),
	},
	{
		title: 'STEP TRANSITION DURATION',
		dataIndex: 'duration_ms',
		key: 'duration_ms',
		render: (value: string): string => getYAxisFormattedValue(`${value}`, 'ms'),
	},
];
