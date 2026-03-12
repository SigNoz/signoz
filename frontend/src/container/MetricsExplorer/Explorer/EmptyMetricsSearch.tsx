import { Empty, Typography } from 'antd';

interface EmptyMetricsSearchProps {
	hasQueryResult?: boolean;
}

export default function EmptyMetricsSearch({
	hasQueryResult,
}: EmptyMetricsSearchProps): JSX.Element {
	return (
		<div className="empty-metrics-search">
			<Empty
				description={
					<Typography.Title level={5}>
						{hasQueryResult
							? 'No data'
							: 'Select a metric and run a query to see the results'}
					</Typography.Title>
				}
			/>
		</div>
	);
}
