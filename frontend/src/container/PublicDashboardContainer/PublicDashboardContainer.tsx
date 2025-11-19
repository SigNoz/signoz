import './PublicDashboardContainer.styles.scss';

import { Typography } from 'antd';

function PublicDashboardContainer(): JSX.Element {
	return (
		<div className="public-dashboard-container">
			<div className="public-dashboard-header-container">
				<div className="public-dashboard-header-left">
					<div className="brand-logo-container">
						<img
							src="/Logos/signoz-brand-logo.svg"
							alt="logo"
							className="brand-logo"
						/>

						<Typography.Title level={5} className="brand-name">
							SigNoz
						</Typography.Title>
					</div>
				</div>
				<div className="public-dashboard-header-right">
					<Typography.Title
						level={5}
						className="public-dashboard-header-right-title"
					>
						Public Dashboard
					</Typography.Title>
				</div>
			</div>

			<div className="public-dashboard-content-container">
				<div className="public-dashboard-panels-container">
					{/* {panels.map((panel) => (
						<div className="public-dashboard-panel" key={panel.id}>
							<Typography.Title level={5} className="public-dashboard-panel-title">
								{panel.title}
							</Typography.Title>

							<Typography.Text className="public-dashboard-panel-description">
								{panel.description}
							</Typography.Text>
						</div>
					))} */}
				</div>
			</div>
		</div>
	);
}

export default PublicDashboardContainer;
