import PublicDashboardContainer from 'container/PublicDashboardContainer/PublicDashboardContainer';
import { useParams } from 'react-router-dom';

function PublicDashboard(): JSX.Element {
	const { dashboardId } = useParams<{ dashboardId: string }>();

	console.log('dashboardId', dashboardId);

	return (
		<div className="public-dashboard-container">
			<PublicDashboardContainer />
		</div>
	);
}

export default PublicDashboard;
