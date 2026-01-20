import { Typography } from 'antd';
import { ChartLine } from 'lucide-react';

export default function NoData(): JSX.Element {
	return (
		<div className="no-data-container">
			<ChartLine size={48} />
			<Typography.Text className="no-data-text">
				No data found for the selected query
			</Typography.Text>
		</div>
	);
}
