import { ServiceData } from './types';

function DashboardItem({
	dashboard,
}: {
	dashboard: ServiceData['assets']['dashboards'][number];
}): JSX.Element {
	return (
		<div className="cloud-service-dashboard-item">
			<div className="cloud-service-dashboard-item__title">{dashboard.title}</div>
			<div className="cloud-service-dashboard-item__preview">
				<img
					src={dashboard.image}
					alt={dashboard.title}
					className="cloud-service-dashboard-item__preview-image"
				/>
			</div>
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
