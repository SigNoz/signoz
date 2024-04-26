import './DashboardEmptyState.styles.scss';

import { Button, Typography } from 'antd';
import ConfigureIcon from 'assets/Integrations/ConfigureIcon';
import { Plus, Tent } from 'lucide-react';

export default function DashboardEmptyState(): JSX.Element {
	return (
		<section className="dashboard-empty-state">
			<div className="dashboard-content">
				<section className="heading">
					<Tent size={14} className="icons" />
					<Typography.Text className="welcome">
						Welcome to your new dashboard
					</Typography.Text>
					<Typography.Text className="welcome-info">
						Follow the steps to populate it with data and share with your teammates
					</Typography.Text>
				</section>
				<section className="actions">
					<div className="actions-1">
						<div className="actions-configure">
							<div className="actions-configure-text">
								<Tent size={14} className="icons" />
								<Typography.Text className="configure">
									Configure your new dashboard
								</Typography.Text>
							</div>
							<Typography.Text className="configure-info">
								Give it a name, add description, tags and variables
							</Typography.Text>
						</div>
						<Button type="text" className="configure-btn" icon={<ConfigureIcon />}>
							Configure
						</Button>
					</div>
					<div className="actions-1">
						<div className="actions-add-panel">
							<div className="actions-panel-text">
								<Tent size={14} className="icons" />
								<Typography.Text className="panel">Add panels</Typography.Text>
							</div>
							<Typography.Text className="panel-info">
								Add panels to visualize your data
							</Typography.Text>
						</div>
						<Button type="text" className="add-panel-btn" icon={<Plus size={14} />}>
							New panel
						</Button>
					</div>
				</section>
			</div>
		</section>
	);
}
