import FunnelMetricsTable from './FunnelMetricsTable';

function OverallMetrics(): JSX.Element {
	const overallMetricsData = [
		{
			title: 'Avg. Rate',
			value: 486.76,
			unit: 'req/s',
		},
		{
			title: 'Errors',
			value: 43,
			unit: '',
		},
		{
			title: 'Avg. Duration',
			value: 34.77,
			unit: 'ms',
		},
	];

	return (
		<FunnelMetricsTable
			title="Overall Funnel Metrics"
			subtitle={{
				label: 'Conversion rate',
				value: '46%',
			}}
			data={overallMetricsData}
		/>
	);
}

export default OverallMetrics;
