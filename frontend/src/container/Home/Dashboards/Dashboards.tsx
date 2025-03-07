import { Button } from 'antd';
import { ArrowUpRight, Plus } from 'lucide-react';
import Card from 'periscope/components/Card/Card';

export default function Dashboards(): JSX.Element {
	const emptyStateCard = (): JSX.Element => (
		<div className="empty-state-container">
			<div className="empty-state-content-container">
				<div className="empty-state-content">
					<img
						src="/Icons/dials.svg"
						alt="empty-alert-icon"
						className="empty-state-icon"
					/>

					<div className="empty-title">You don’t have any dashboards yet.</div>

					<div className="empty-description">Create a dashboard to get started</div>
				</div>

				<div className="empty-actions-container">
					<Button
						type="default"
						className="periscope-btn secondary"
						icon={<Plus size={16} />}
					>
						New Dashboard
					</Button>

					<Button type="link" className="learn-more-link">
						Learn more <ArrowUpRight size={12} />
					</Button>
				</div>
			</div>
		</div>
	);

	return (
		<Card className="dashboards-card home-data-card">
			<Card.Content>{emptyStateCard()}</Card.Content>
		</Card>
	);
}
