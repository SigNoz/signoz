import './FunnelsEmptyState.styles.scss';

import { Button } from 'antd';
import LearnMore from 'components/LearnMore/LearnMore';
import { Plus } from 'lucide-react';

interface FunnelsEmptyStateProps {
	onCreateFunnel: () => void;
}

function FunnelsEmptyState({
	onCreateFunnel,
}: FunnelsEmptyStateProps): JSX.Element {
	return (
		<div className="funnels-empty">
			<div className="funnels-empty__content">
				<section className="funnels-empty__header">
					<img
						src="/Icons/alert_emoji.svg"
						alt="funnels-empty-icon"
						className="funnels-empty__icon"
					/>
					<div>
						<span className="funnels-empty__title">No funnels yet. </span>
						<span className="funnels-empty__subtitle">
							Create a funnel to start analyzing your data
						</span>
					</div>
				</section>

				<div className="funnels-empty__actions">
					<Button
						type="primary"
						icon={<Plus size={16} />}
						onClick={onCreateFunnel}
						className="funnels-empty__new-btn"
					>
						New funnel
					</Button>
					<LearnMore />
				</div>
			</div>
		</div>
	);
}

export default FunnelsEmptyState;
