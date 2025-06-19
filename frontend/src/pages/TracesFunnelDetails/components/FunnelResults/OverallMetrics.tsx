import { useFunnelMetrics } from 'hooks/TracesFunnels/useFunnelMetrics';
import { useParams } from 'react-router-dom';

import FunnelMetricsTable from './FunnelMetricsTable';

function OverallMetrics(): JSX.Element {
	const { funnelId } = useParams<{ funnelId: string }>();
	const { isLoading, metricsData, conversionRate, isError } = useFunnelMetrics({
		funnelId,
	});

	return (
		<FunnelMetricsTable
			title="Overall Funnel Metrics"
			subtitle={{
				label: 'Conversion rate',
				value: `${conversionRate.toFixed(2)}%`,
			}}
			isLoading={isLoading}
			isError={isError}
			data={metricsData}
		/>
	);
}

export default OverallMetrics;
