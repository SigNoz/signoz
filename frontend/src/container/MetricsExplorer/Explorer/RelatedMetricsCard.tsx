import { Skeleton, Typography } from 'antd';
import Uplot from 'components/Uplot';

import DashboardsAndAlertsPopover from '../MetricDetails/DashboardsAndAlertsPopover';
import { RelatedMetricsCardProps } from './types';

function RelatedMetricsCard({
	metric,
	options,
	chartData,
}: RelatedMetricsCardProps): JSX.Element {
	const { queryResult } = metric;

	if (queryResult.isLoading) {
		return <Skeleton />;
	}

	if (queryResult.error) {
		const errorMessage =
			(queryResult.error as Error)?.message || 'Something went wrong';
		return <div>{errorMessage}</div>;
	}

	return (
		<div className="related-metrics-card">
			<Typography.Text className="related-metrics-card-name">
				{metric.name}
			</Typography.Text>
			{queryResult.isLoading ? <Skeleton /> : null}
			{queryResult.error ? (
				<div className="related-metrics-card-error">
					<Typography.Text>Something went wrong</Typography.Text>
				</div>
			) : null}
			{!queryResult.isLoading && !queryResult.error && (
				<Uplot options={options} data={chartData} />
			)}
			<DashboardsAndAlertsPopover
				dashboards={metric.dashboards}
				alerts={metric.alerts}
			/>
		</div>
	);
}

export default RelatedMetricsCard;
