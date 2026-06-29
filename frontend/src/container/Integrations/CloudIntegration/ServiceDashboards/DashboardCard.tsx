import type { KeyboardEvent, MouseEvent } from 'react';
import { TooltipSimple } from '@signozhq/ui/tooltip';
import { CloudintegrationtypesServiceDashboardDTO } from 'api/generated/services/sigNoz.schemas';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import { openInNewTab } from 'utils/navigation';

const DISABLED_TOOLTIP =
	'Enable metrics collection for this service to view this dashboard.';

function DashboardCard({
	dashboard,
	isInteractive,
}: {
	dashboard: CloudintegrationtypesServiceDashboardDTO;
	isInteractive: boolean;
}): JSX.Element {
	const dashboardId = dashboard.integrationDashboard?.dashboardId;
	const isClickable = Boolean(dashboardId) && isInteractive;
	const dashboardUrl = dashboardId ? `/dashboard/${dashboardId}` : '';

	const { safeNavigate } = useSafeNavigate();

	const interactiveProps = isClickable
		? {
				role: 'button',
				tabIndex: 0,
				onClick: (event: MouseEvent<HTMLDivElement>): void => {
					if (event.metaKey || event.ctrlKey) {
						openInNewTab(dashboardUrl);
						return;
					}
					safeNavigate(dashboardUrl);
				},
				onKeyDown: (event: KeyboardEvent<HTMLDivElement>): void => {
					if (event.key === 'Enter' || event.key === ' ') {
						event.preventDefault();
						safeNavigate(dashboardUrl);
					}
				},
			}
		: {};

	const card = (
		<div
			className={`aws-service-dashboard-item ${
				isClickable
					? 'aws-service-dashboard-item-clickable'
					: 'aws-service-dashboard-item-disabled'
			} `}
			{...interactiveProps}
		>
			<div className="aws-service-dashboard-item-content">
				<div className="aws-service-dashboard-item-title">{dashboard.title}</div>
				<div className="aws-service-dashboard-item-description">
					{dashboard.description}
				</div>
			</div>
		</div>
	);

	if (!dashboardId) {
		return <TooltipSimple title={DISABLED_TOOLTIP}>{card}</TooltipSimple>;
	}

	return card;
}

export default DashboardCard;
