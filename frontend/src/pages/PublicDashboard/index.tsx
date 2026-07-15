import { useParams } from 'react-router-dom';
import { Typography } from '@signozhq/ui/typography';
import {
	PublicDashboardSchema,
	useGetResolvedPublicDashboard,
} from 'hooks/dashboard/useGetResolvedPublicDashboard';
import { Frown } from '@signozhq/icons';

import signozBrandLogoUrl from '@/assets/Logos/signoz-brand-logo.svg';

import PublicDashboardContainer from '../../container/PublicDashboardContainer';
import PublicDashboardV2 from './PublicDashboardV2/PublicDashboardV2';

import './PublicDashboard.styles.scss';

function PublicDashboardPage(): JSX.Element {
	// read the dashboard id from the url
	const { dashboardId } = useParams<{ dashboardId: string }>();

	const {
		data: resolved,
		isLoading,
		isFetching,
		isError,
	} = useGetResolvedPublicDashboard(dashboardId || '');

	const isBusy = isLoading || isFetching;

	return (
		<div className="public-dashboard-page">
			{resolved?.schema === PublicDashboardSchema.V2 && (
				<PublicDashboardV2 publicDashboardId={dashboardId} data={resolved.data} />
			)}

			{resolved?.schema === PublicDashboardSchema.V1 && (
				<PublicDashboardContainer
					publicDashboardId={dashboardId}
					publicDashboardData={{ httpStatusCode: 200, data: resolved.data }}
				/>
			)}

			{isError && !isBusy && (
				<div className="public-dashboard-error-container">
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
						<Typography.Title
							level={4}
							className="public-dashboard-error-message-icon"
						>
							<Frown size={36} />
						</Typography.Title>
						<Typography.Title level={4} className="public-dashboard-error-message">
							The public dashboard you are looking for does not exist or has been
							unpublished.
						</Typography.Title>
						<Typography.Text className="public-dashboard-error-message-description">
							Please reach out to the owner of the dashboard to get access.
						</Typography.Text>
					</div>
				</div>
			)}
		</div>
	);
}

export default PublicDashboardPage;
