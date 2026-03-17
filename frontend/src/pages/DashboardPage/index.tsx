import { useParams } from 'react-router-dom';
import { DashboardProvider } from 'providers/Dashboard/Dashboard';

import DashboardPage from './DashboardPage';

function DashboardPageWithProvider(): JSX.Element {
	const { dashboardId } = useParams<{ dashboardId: string }>();

	return (
		<DashboardProvider dashboardId={dashboardId}>
			<DashboardPage />
		</DashboardProvider>
	);
}

export default DashboardPageWithProvider;
