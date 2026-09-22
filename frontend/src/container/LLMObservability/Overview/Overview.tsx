import { Typography } from '@signozhq/ui/typography';
import Spinner from 'components/Spinner';
import DashboardContainer from 'pages/DashboardPage/DashboardContainer';

import { useSystemDashboard } from './hooks/useSystemDashboard';
import styles from './Overview.module.scss';

function Overview(): JSX.Element {
	const { dashboard, isLoading, isError, error, refetch } = useSystemDashboard();

	const renderContent = (): JSX.Element => {
		if (isLoading) {
			return <Spinner tip="Loading dashboard..." />;
		}

		if (isError || !dashboard) {
			return (
				<div className={styles.errorState}>
					<Typography.Title>Failed to load dashboard</Typography.Title>
					<Typography.Text>
						{error?.response?.data?.error?.message ?? error?.message}
					</Typography.Text>
				</div>
			);
		}

		return (
			<DashboardContainer
				dashboard={dashboard}
				refetch={refetch}
				canEditDashboardOverride={false}
			/>
		);
	};

	return (
		<div className={styles.overview} data-testid="llm-observability-overview">
			{renderContent()}
		</div>
	);
}

export default Overview;
