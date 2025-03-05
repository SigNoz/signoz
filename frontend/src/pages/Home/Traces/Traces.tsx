import { Button } from 'antd';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import Card from 'periscope/components/Card/Card';

export default function Traces(): JSX.Element {
	return (
		<Card className="traces-card home-data-card">
			<Card.Content>
				<div className="empty-state-container">
					<div className="empty-state-content-container">
						<div className="empty-state-content">
							<img
								src="/Icons/triangle-ruler.svg"
								alt="empty-alert-icon"
								className="empty-state-icon"
							/>

							<div className="empty-title">You are not sending traces yet.</div>

							<div className="empty-description">
								Start sending traces to see your services.
							</div>
						</div>

						<div className="empty-actions-container">
							<Button type="default" className="periscope-btn secondary">
								Get Started &nbsp; <ArrowRight size={16} />
							</Button>

							<Button type="link" className="learn-more-link">
								Learn more <ArrowUpRight size={12} />
							</Button>
						</div>
					</div>
				</div>
			</Card.Content>
		</Card>
	);
}
