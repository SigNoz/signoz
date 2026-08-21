import { useParams } from 'react-router-dom';
import {
	PublicDashboardSchema,
	useGetResolvedPublicDashboard,
} from 'hooks/dashboard/useGetResolvedPublicDashboard';
import { Frown, TriangleAlert } from '@signozhq/icons';

import PublicDashboardMessage from './PublicDashboardMessage';
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

			{resolved?.schema === PublicDashboardSchema.Legacy && (
				<PublicDashboardMessage
					testId="public-dashboard-legacy"
					icon={<TriangleAlert size={36} />}
					title="This dashboard hasn't been migrated to the new experience yet."
					description="Please reach out to the owner of the dashboard — they can migrate it and re-share the link."
				/>
			)}

			{isError && !isBusy && (
				<PublicDashboardMessage
					testId="public-dashboard-unavailable"
					icon={<Frown size={36} />}
					title="The public dashboard you are looking for does not exist or has been unpublished."
					description="Please reach out to the owner of the dashboard to get access."
				/>
			)}
		</div>
	);
}

export default PublicDashboardPage;
