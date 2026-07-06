import { useIsDashboardV2 } from 'hooks/useIsDashboardV2';
import DashboardsListPageV2 from 'pages/DashboardsListPageV2';

import DashboardsListPage from './DashboardsListPage';

// Serves the V2 dashboards list when the `use_dashboard_v2` flag is active;
// otherwise the existing V1 list. Lets V2 dark-ship behind the flag without
// changing route definitions.
function DashboardsListPageEntry(): JSX.Element {
	const isDashboardV2 = useIsDashboardV2();

	return isDashboardV2 ? <DashboardsListPageV2 /> : <DashboardsListPage />;
}

export default DashboardsListPageEntry;
