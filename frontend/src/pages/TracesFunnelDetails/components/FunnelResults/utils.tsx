import { getYAxisFormattedValue } from 'components/Graph/yAxisConfig';
import { Link } from 'react-router-dom';

export const topTracesTableColumns = [
	{
		title: 'TRACE ID',
		dataIndex: 'trace_id',
		key: 'trace_id',
		render: (traceId: string): JSX.Element => (
			<Link to={`/trace/${traceId}`} className="trace-id-cell">
				{traceId}
			</Link>
		),
	},
	{
		title: 'STEP TRANSITION DURATION',
		dataIndex: 'duration_ms',
		key: 'duration_ms',
		render: (value: string): string => getYAxisFormattedValue(`${value}`, 'ms'),
	},
];
