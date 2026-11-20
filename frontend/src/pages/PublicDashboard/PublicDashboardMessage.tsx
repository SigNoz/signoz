import { ReactNode } from 'react';
import { Typography } from '@signozhq/ui/typography';

import signozBrandLogoUrl from '@/assets/Logos/signoz-brand-logo.svg';

interface PublicDashboardMessageProps {
	icon: ReactNode;
	title: string;
	description: string;
	testId: string;
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

					<Typography
						variant="label"
						size="large"
						weight="bold"
						color="main"
						as="h2"
						textOverflow="wrap"
					>
						SigNoz
					</Typography>
				</div>

				<div className="brand-tagline">
					<Typography
						variant="paragraph"
						size="base"
						weight="regular"
						color="inherit"
						as="span"
						textOverflow="wrap"
					>
						OpenTelemetry-Native Logs, Metrics and Traces in a single pane
					</Typography>
				</div>
			</div>

			<div className="public-dashboard-error-content">
				<Typography
					variant="label"
					size="large"
					weight="bold"
					color="secondary"
					as="h4"
					marginY={4}
					textOverflow="wrap"
				>
					{icon}
				</Typography>
				<Typography
					variant="label"
					size="large"
					weight="bold"
					color="inherit"
					as="h4"
					align="center"
					marginTop={6}
					marginBottom={4}
					textOverflow="wrap"
				>
					{title}
				</Typography>
				<Typography
					variant="paragraph"
					size="base"
					weight="regular"
					color="inherit"
					as="span"
					textOverflow="wrap"
				>
					{description}
				</Typography>
			</div>
		</div>
	);
}

export default PublicDashboardMessage;
