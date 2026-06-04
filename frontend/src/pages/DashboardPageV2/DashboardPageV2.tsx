import { useEffect } from 'react';
import { useParams } from 'react-router-dom';

import { Typography } from '@signozhq/ui/typography';
import { useGetDashboardV2 } from 'api/generated/services/dashboard';
import Spinner from 'components/Spinner';

import DashboardContainer from './DashboardContainer';
import styles from './DashboardPageV2.module.scss';

function DashboardPageV2(): JSX.Element {
	const { dashboardId } = useParams<{ dashboardId: string }>();

	const { data, isLoading, isError, error, refetch } = useGetDashboardV2({
		id: dashboardId,
	});

	const dashboard = data?.data;
	const name = dashboard?.spec?.display?.name;

	useEffect(() => {
		if (name) {
			document.title = name;
		}
	}, [name]);

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
