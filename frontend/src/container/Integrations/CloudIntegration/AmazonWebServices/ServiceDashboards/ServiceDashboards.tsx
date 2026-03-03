import { useSafeNavigate } from 'hooks/useSafeNavigate';

import { ServiceData } from '../types';

import './ServiceDashboards.styles.scss';

function ServiceDashboards({ service }: { service: ServiceData }): JSX.Element {
	const dashboards = service?.assets?.dashboards || [];
	const { safeNavigate } = useSafeNavigate();

	return (
		<div className="aws-service-dashboards">
			<div className="aws-service-dashboards-title">Dashboards</div>
			<div className="aws-service-dashboards-items">
				{dashboards.map((dashboard) => (
					<div
						key={dashboard.id}
						className={`aws-service-dashboard-item ${
							dashboard.url ? 'aws-service-dashboard-item-clickable' : ''
						}`}
						onClick={(): void => {
							if (dashboard.url) {
								safeNavigate(dashboard.url);
							}
						}}
					>
						<div className="aws-service-dashboard-item-title">{dashboard.title}</div>
						<div className="aws-service-dashboard-item-description">
							{dashboard.description}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

export default ServiceDashboards;
