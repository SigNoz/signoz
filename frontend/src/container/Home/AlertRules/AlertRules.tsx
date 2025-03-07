import { Button } from 'antd';
import { ArrowUpRight, Plus } from 'lucide-react';
import Card from 'periscope/components/Card/Card';

export default function AlertRules(): JSX.Element {
	const emptyStateCard = (): JSX.Element => (
		<div className="empty-state-container">
			<div className="empty-state-content-container">
				<div className="empty-state-content">
					<img
						src="/Icons/beacon.svg"
						alt="empty-alert-icon"
						className="empty-state-icon"
					/>

					<div className="empty-title">No Alert rules yet.</div>

					<div className="empty-description">
						Create an Alert Rule to get started
					</div>
				</div>

				<div className="empty-actions-container">
					<Button
						type="default"
						className="periscope-btn secondary"
						icon={<Plus size={16} />}
					>
						Create Alert Rule
					</Button>

					<Button type="link" className="learn-more-link">
						Learn more <ArrowUpRight size={12} />
					</Button>
				</div>
			</div>
		</div>
	);

	return (
		<Card className="alert-rules-card home-data-card">
			<Card.Content>{emptyStateCard()}</Card.Content>
		</Card>
	);
}
