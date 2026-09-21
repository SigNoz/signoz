import { Typography } from '@signozhq/ui/typography';
import Spinner from 'components/Spinner';
import DashboardContainer from 'pages/DashboardPage/DashboardContainer';

import { useSystemDashboard } from './hooks/useSystemDashboard';
import styles from './Overview.module.scss';

function Overview(): JSX.Element {
	const { dashboard, isLoading, isError, error, refetch } = useSystemDashboard();

	return (
		<div className={styles.overview} data-testid="llm-observability-overview">
			{isLoading && <Spinner tip="Loading dashboard..." />}
			{!isLoading && (isError || !dashboard) && (
				<div className={styles.errorState}>
					<Typography.Title>Failed to load dashboard</Typography.Title>
					<Typography.Text>{(error as Error | null)?.message}</Typography.Text>
				</div>
			)}
			{!isLoading && !isError && dashboard && (
				<DashboardContainer
					dashboard={dashboard}
					refetch={refetch}
					canEditDashboardOverride={false}
				/>
			)}
		</div>
	);
}

export default Overview;
