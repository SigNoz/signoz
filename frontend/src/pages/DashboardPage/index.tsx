import { useIsDashboardV2 } from 'hooks/useIsDashboardV2';
import DashboardPageV2 from 'pages/DashboardPageV2';

import DashboardPage from './DashboardPage';

// Serves the V2 dashboard detail page when the `use_dashboard_v2` flag is active;
// otherwise the existing V1 page. Lets V2 dark-ship behind the flag without
// changing route definitions.
function DashboardPageEntry(): JSX.Element {
	const isDashboardV2 = useIsDashboardV2();

	return isDashboardV2 ? <DashboardPageV2 /> : <DashboardPage />;
}

export default DashboardPageEntry;
