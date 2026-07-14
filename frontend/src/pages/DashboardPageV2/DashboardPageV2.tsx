import { useParams } from 'react-router-dom';

import { Typography } from '@signozhq/ui/typography';
import Spinner from 'components/Spinner';

import DashboardContainer from './DashboardContainer';
import { useDashboardFetch } from './DashboardContainer/hooks/useDashboardFetch';
import styles from './DashboardPageV2.module.scss';

function DashboardPageV2(): JSX.Element {
	const { dashboardId } = useParams<{ dashboardId: string }>();

	const { dashboard, isLoading, isError, error, refetch } =
		useDashboardFetch(dashboardId);

	if (isLoading) {
		return <Spinner tip="Loading dashboard..." />;
	}

	if (isError || !dashboard) {
		return (
			<div className={styles.errorState}>
				<Typography.Title>Failed to load dashboard</Typography.Title>
				<Typography.Text>{(error as Error)?.message}</Typography.Text>
			</div>
		);
	}

	return <DashboardContainer dashboard={dashboard} refetch={refetch} />;
}

export default DashboardPageV2;
