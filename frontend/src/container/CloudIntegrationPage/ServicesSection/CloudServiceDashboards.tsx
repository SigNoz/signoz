import { Link } from 'react-router-dom';

import { ServiceData } from './types';

function DashboardItem({
	dashboard,
}: {
	dashboard: ServiceData['assets']['dashboards'][number];
}): JSX.Element {
	const content = (
		<>
			<div className="cloud-service-dashboard-item__title">{dashboard.title}</div>
			<div className="cloud-service-dashboard-item__preview">
				<img
					src={dashboard.image}
					alt={dashboard.title}
					className="cloud-service-dashboard-item__preview-image"
				/>
			</div>
		</>
	);

	return (
		<div className="cloud-service-dashboard-item">
			{dashboard.url ? (
				<Link to={dashboard.url} className="cloud-service-dashboard-item__link">
					{content}
				</Link>
			) : (
				content
			)}
		</div>
	);
}

function CloudServiceDashboards({
	service,
}: {
	service: ServiceData;
}): JSX.Element {
	return (
		<>
			{service.assets.dashboards.map((dashboard) => (
				<DashboardItem key={dashboard.id} dashboard={dashboard} />
			))}
		</>
	);
}

export default CloudServiceDashboards;
