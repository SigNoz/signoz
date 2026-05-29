/* eslint-disable sonarjs/cognitive-complexity */
import {
	CloudintegrationtypesDashboardDTO,
	CloudintegrationtypesServiceDTO,
} from 'api/generated/services/sigNoz.schemas';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import { withBasePath } from 'utils/basePath';

import './ServiceDashboards.styles.scss';

function ServiceDashboards({
	service,
	isInteractive = true,
}: {
	service: Pick<CloudintegrationtypesServiceDTO, 'assets'>;
	isInteractive?: boolean;
}): JSX.Element {
	const dashboards = service?.assets?.dashboards || [];
	const { safeNavigate } = useSafeNavigate();
	if (!dashboards.length) {
		return <></>;
	}

	return (
		<div className="aws-service-dashboards">
			<div className="aws-service-dashboards-title">Dashboards</div>
			<div className="aws-service-dashboards-items">
				{dashboards.map((dashboard: CloudintegrationtypesDashboardDTO) => {
					if (!dashboard.id) {
						return null;
					}

					const dashboardUrl = `/dashboard/${dashboard.id}`;

					return (
						<div
							key={dashboard.id}
							className={`aws-service-dashboard-item ${
								isInteractive ? 'aws-service-dashboard-item-clickable' : ''
							}`}
							role={isInteractive ? 'button' : undefined}
							tabIndex={isInteractive ? 0 : -1}
							onClick={(event): void => {
								if (!isInteractive) {
									return;
								}
								if (event.metaKey || event.ctrlKey) {
									window.open(
										withBasePath(dashboardUrl),
										'_blank',
										'noopener,noreferrer',
									);
									return;
								}
								safeNavigate(dashboardUrl);
							}}
							onAuxClick={(event): void => {
								if (!isInteractive) {
									return;
								}
								if (event.button === 1) {
									window.open(
										withBasePath(dashboardUrl),
										'_blank',
										'noopener,noreferrer',
									);
								}
							}}
							onKeyDown={(event): void => {
								if (!isInteractive) {
									return;
								}
								if (event.key === 'Enter' || event.key === ' ') {
									event.preventDefault();
									safeNavigate(dashboardUrl);
								}
							}}
						>
							<div className="aws-service-dashboard-item-content">
								<div className="aws-service-dashboard-item-title">
									{dashboard.title}
								</div>
								<div className="aws-service-dashboard-item-description">
									{dashboard.description}
								</div>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}

export default ServiceDashboards;
