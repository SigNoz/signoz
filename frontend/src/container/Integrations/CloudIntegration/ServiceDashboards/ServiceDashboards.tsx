/* eslint-disable sonarjs/cognitive-complexity */
import type { KeyboardEvent, MouseEvent } from 'react';
import { TooltipSimple } from '@signozhq/ui/tooltip';
import {
	CloudintegrationtypesServiceDashboardDTO,
	CloudintegrationtypesServiceDTO,
} from 'api/generated/services/sigNoz.schemas';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import { withBasePath } from 'utils/basePath';

import './ServiceDashboards.styles.scss';

const DISABLED_TOOLTIP =
	'Enable metrics collection for this service to view this dashboard.';

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
				{dashboards.map(
					(dashboard: CloudintegrationtypesServiceDashboardDTO, index: number) => {
						const dashboardId = dashboard.integrationDashboard?.dashboardId;
						const isEnabled = Boolean(dashboardId) && isInteractive;
						const itemKey = dashboardId || `${dashboard.title}-${index}`;
						const dashboardUrl = dashboardId ? `/dashboard/${dashboardId}` : '';

						const handleClick = (event: MouseEvent<HTMLDivElement>): void => {
							if (!isEnabled) {
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
						};

						const handleAuxClick = (event: MouseEvent<HTMLDivElement>): void => {
							if (!isEnabled) {
								return;
							}
							if (event.button === 1) {
								window.open(
									withBasePath(dashboardUrl),
									'_blank',
									'noopener,noreferrer',
								);
							}
						};

						const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
							if (!isEnabled) {
								return;
							}
							if (event.key === 'Enter' || event.key === ' ') {
								event.preventDefault();
								safeNavigate(dashboardUrl);
							}
						};

						const card = (
							<div
								className={`aws-service-dashboard-item ${
									isEnabled ? 'aws-service-dashboard-item-clickable' : ''
								} ${!dashboardId ? 'aws-service-dashboard-item-disabled' : ''}`}
								role={isEnabled ? 'button' : undefined}
								tabIndex={isEnabled ? 0 : -1}
								aria-disabled={!dashboardId}
								onClick={handleClick}
								onAuxClick={handleAuxClick}
								onKeyDown={handleKeyDown}
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

						if (!dashboardId) {
							return (
								<TooltipSimple key={itemKey} title={DISABLED_TOOLTIP} arrow>
									{card}
								</TooltipSimple>
							);
						}

						return <div key={itemKey}>{card}</div>;
					},
				)}
			</div>
		</div>
	);
}

export default ServiceDashboards;
