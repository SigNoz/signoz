import {
	CloudintegrationtypesServiceDashboardDTO,
	CloudintegrationtypesServiceDTO,
} from 'api/generated/services/sigNoz.schemas';

import DashboardCard from './DashboardCard';
import './ServiceDashboards.styles.scss';

function ServiceDashboards({
	service,
	isInteractive = true,
}: {
	service: Pick<CloudintegrationtypesServiceDTO, 'assets'>;
	isInteractive?: boolean;
}): JSX.Element {
	const dashboards = service?.assets?.dashboards || [];
	if (!dashboards.length) {
		return <></>;
	}

	return (
		<div className="aws-service-dashboards">
			<div className="aws-service-dashboards-title">Dashboards</div>
			<div className="aws-service-dashboards-items">
				{dashboards.map(
					(dashboard: CloudintegrationtypesServiceDashboardDTO, index: number) => {
						const key =
							dashboard.integrationDashboard?.dashboardId ||
							`${dashboard.title}-${index}`;
						return (
							<DashboardCard
								key={key}
								dashboard={dashboard}
								isInteractive={isInteractive}
							/>
						);
					},
				)}
			</div>
		</div>
	);
}

export default ServiceDashboards;
