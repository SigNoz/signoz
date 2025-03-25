import { useMemo } from 'react';

import FunnelTable from './FunnelTable';

interface TopSlowestTracesProps {
	loading?: boolean;
	data?: Array<{
		traceId: string;
		p99Latency: number;
		errorRate: number;
		percentageOfTotal: number;
		opsPerSec: number;
		duration: number;
	}>;
}

function TopSlowestTraces({
	loading = false,
	data = [],
}: TopSlowestTracesProps): JSX.Element {
	const columns = useMemo(
		() => [
			{
				title: 'TRACE ID',
				dataIndex: 'traceId',
				key: 'traceId',
				render: (text: string): JSX.Element => (
					<span className="trace-id-cell">{text}</span>
				),
			},
			{
				title: 'P99 LATENCY',
				dataIndex: 'p99Latency',
				key: 'p99Latency',
				render: (value: number): string => value.toFixed(2),
			},
			{
				title: 'ERROR RATE',
				dataIndex: 'errorRate',
				key: 'errorRate',
				render: (value: number): string => value.toFixed(2),
			},
			{
				title: 'OPS/SEC.',
				dataIndex: 'opsPerSec',
				key: 'opsPerSec',
				render: (value: number): string => value.toFixed(2),
			},
		],
		[],
	);

	return (
		<FunnelTable
			title="Slowest 5 traces"
			tooltip="A list of the slowest traces in the funnel"
			columns={columns}
			data={data}
			loading={loading}
		/>
	);
}

TopSlowestTraces.defaultProps = {
	loading: false,
	data: [],
};

export default TopSlowestTraces;
