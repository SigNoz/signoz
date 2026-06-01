import { useIsDashboardV2 } from 'hooks/useIsDashboardV2';
import DashboardsListPageV2 from 'pages/DashboardsListPageV2';
import DashboardsListPage from './DashboardsListPage';

function DashboardsListPageEntry(): JSX.Element {
	const isV2 = useIsDashboardV2();
	if (isV2) {
		return <DashboardsListPageV2 />;
	}
	return <DashboardsListPage />;
}

export default DashboardsListPageEntry;
