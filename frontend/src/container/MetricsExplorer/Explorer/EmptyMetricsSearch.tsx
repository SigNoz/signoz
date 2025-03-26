import { Typography } from 'antd';
import { Empty } from 'antd/lib';

export default function EmptyMetricsSearch(): JSX.Element {
	return (
		<div className="empty-metrics-search">
			<Empty
				description={
					<Typography.Title level={5}>
						Please build and run a valid query to see the result
					</Typography.Title>
				}
			/>
		</div>
	);
}
