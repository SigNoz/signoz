import { Skeleton } from 'antd';
import Card from 'periscope/components/Card/Card';

export default function AlertRulesLoading(): JSX.Element {
	return (
		<Card className="dashboards-list-card home-data-card loading-card">
			<Card.Content>
				<Skeleton active />
			</Card.Content>
		</Card>
	);
}
