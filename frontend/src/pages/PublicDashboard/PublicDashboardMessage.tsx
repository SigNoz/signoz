import { ReactNode } from 'react';
import { Typography } from '@signozhq/ui/typography';

import signozBrandLogoUrl from '@/assets/Logos/signoz-brand-logo.svg';

interface PublicDashboardMessageProps {
	icon: ReactNode;
	title: string;
	description: string;
	testId?: string;
}

/**
 * Branded full-page state for a public dashboard that can't be rendered. Public
 * viewers are anonymous, so every variant can only point them at the dashboard
 * owner — there are no in-app recovery actions.
 */
function PublicDashboardMessage({
	icon,
	title,
	description,
	testId,
}: PublicDashboardMessageProps): JSX.Element {
	return (
		<div className="public-dashboard-error-container" data-testid={testId}>
			<div className="perilin-bg" />

			<div className="public-dashboard-error-content-header">
				<div className="brand">
					<img src={signozBrandLogoUrl} alt="SigNoz" className="brand-logo" />

					<Typography.Title level={2} className="brand-title">
						SigNoz
					</Typography.Title>
				</div>

				<div className="brand-tagline">
					<Typography.Text>
						OpenTelemetry-Native Logs, Metrics and Traces in a single pane
					</Typography.Text>
				</div>
			</div>

			<div className="public-dashboard-error-content">
				<Typography.Title level={4} className="public-dashboard-error-message-icon">
					{icon}
				</Typography.Title>
				<Typography.Title level={4} className="public-dashboard-error-message">
					{title}
				</Typography.Title>
				<Typography.Text className="public-dashboard-error-message-description">
					{description}
				</Typography.Text>
			</div>
		</div>
	);
}

PublicDashboardMessage.defaultProps = {
	testId: undefined,
};

export default PublicDashboardMessage;
