import type { KeyboardEvent, MouseEvent } from 'react';
import { useState } from 'react';
import { TooltipSimple } from '@signozhq/ui/tooltip';
import { CloudintegrationtypesServiceDashboardDTO } from 'api/generated/services/sigNoz.schemas';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import { withBasePath } from 'utils/basePath';

const DISABLED_TOOLTIP =
	'Enable metrics collection for this service to view this dashboard.';

const noop = (): void => undefined;

function DashboardCard({
	dashboard,
	isInteractive,
}: {
	dashboard: CloudintegrationtypesServiceDashboardDTO;
	isInteractive: boolean;
}): JSX.Element {
	const dashboardId = dashboard.integrationDashboard?.dashboardId;
	const isEnabled = Boolean(dashboardId) && isInteractive;
	const isDisabled = !dashboardId;
	const dashboardUrl = dashboardId ? `/dashboard/${dashboardId}` : '';

	const { safeNavigate } = useSafeNavigate();
	const [isHovered, setIsHovered] = useState(false);

	const handleClick = (event: MouseEvent<HTMLDivElement>): void => {
		if (!isEnabled) {
			return;
		}
		if (event.metaKey || event.ctrlKey) {
			window.open(withBasePath(dashboardUrl), '_blank', 'noopener,noreferrer');
			return;
		}
		safeNavigate(dashboardUrl);
	};

	const handleAuxClick = (event: MouseEvent<HTMLDivElement>): void => {
		if (!isEnabled) {
			return;
		}
		if (event.button === 1) {
			window.open(withBasePath(dashboardUrl), '_blank', 'noopener,noreferrer');
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
			} ${isDisabled ? 'aws-service-dashboard-item-disabled' : ''}`}
			role={isEnabled ? 'button' : undefined}
			tabIndex={isEnabled ? 0 : -1}
			aria-disabled={isDisabled}
			onClick={handleClick}
			onAuxClick={handleAuxClick}
			onKeyDown={handleKeyDown}
			onMouseEnter={isDisabled ? (): void => setIsHovered(true) : undefined}
			onMouseLeave={isDisabled ? (): void => setIsHovered(false) : undefined}
		>
			<div className="aws-service-dashboard-item-content">
				<div className="aws-service-dashboard-item-title">{dashboard.title}</div>
				<div className="aws-service-dashboard-item-description">
					{dashboard.description}
				</div>
			</div>
		</div>
	);

	if (isDisabled) {
		return (
			<TooltipSimple
				title={DISABLED_TOOLTIP}
				arrow
				open={isHovered}
				onOpenChange={noop}
			>
				{card}
			</TooltipSimple>
		);
	}

	return card;
}

export default DashboardCard;
