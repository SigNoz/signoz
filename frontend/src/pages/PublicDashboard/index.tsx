import './PublicDashboard.styles.scss';

import { Typography } from 'antd';
import { useGetPublicDashboardData } from 'hooks/dashboard/useGetPublicDashboardData';
import { FrownIcon } from 'lucide-react';
import { useParams } from 'react-router-dom';

import PublicDashboardContainer from '../../container/PublicDashboardContainer';

function PublicDashboardPage(): JSX.Element {
	// read the dashboard id from the url
	const { dashboardId } = useParams<{ dashboardId: string }>();

	const {
		data: publicDashboardData,
		isLoading: isLoadingPublicDashboardData,
		isFetching: isFetchingPublicDashboardData,
		isError: isErrorPublicDashboardData,
	} = useGetPublicDashboardData(dashboardId || '');

	const isLoading =
		isLoadingPublicDashboardData || isFetchingPublicDashboardData;

	const isError = isErrorPublicDashboardData;

	return (
		<div className="public-dashboard-page">
			{publicDashboardData && (
				<PublicDashboardContainer
					publicDashboardId={dashboardId}
					publicDashboardData={publicDashboardData}
				/>
			)}

			{isError && !isLoading && (
				<div className="public-dashboard-error-container">
					<div className="perilin-bg" />

					<div className="public-dashboard-error-content-header">
						<div className="brand">
							<img
								src="/Logos/signoz-brand-logo.svg"
								alt="SigNoz"
								className="brand-logo"
							/>

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
							<FrownIcon size={36} />
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
