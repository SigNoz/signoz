import DashboardContainer from 'pages/DashboardPageV2/DashboardContainer';

import { useSeededDashboardV2 } from './hooks/useSeededDashboardV2';
import styles from './Overview.module.scss';

function Overview(): JSX.Element {
	//TODO: this is a temporary solution to get the seeded dashboard. We should fetch this json from the backend.
	const { dashboard, refetch } = useSeededDashboardV2();

	return (
		<div className={styles.overview} data-testid="llm-observability-overview">
			<DashboardContainer dashboard={dashboard} refetch={refetch} />
		</div>
	);
}

export default Overview;
