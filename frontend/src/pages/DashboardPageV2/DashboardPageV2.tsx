import { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';

import { Typography } from '@signozhq/ui/typography';
import logEvent from 'api/common/logEvent';
import Spinner from 'components/Spinner';
import { DashboardDetailEvents } from 'pages/DashboardPageV2/constants/events';

import DashboardContainer from './DashboardContainer';
import { useDashboardFetch } from './DashboardContainer/hooks/useDashboardFetch';
import styles from './DashboardPageV2.module.scss';

function DashboardPageV2(): JSX.Element {
	const { dashboardId } = useParams<{ dashboardId: string }>();

	const { dashboard, isLoading, isError, error, refetch } =
		useDashboardFetch(dashboardId);

	// Fire once per dashboard load (re-fires on navigating to a different id).
	const openedRef = useRef<string | null>(null);
	useEffect(() => {
		if (!dashboard || openedRef.current === dashboard.id) {
			return;
		}
		openedRef.current = dashboard.id;
		const { spec } = dashboard;
		void logEvent(DashboardDetailEvents.Opened, {
			dashboardId: dashboard.id,
			dashboardName: spec.display.name,
			panelCount: Object.keys(spec.panels).length,
			variableCount: spec.variables.length,
			sectionCount: spec.layouts.length,
		});
	}, [dashboard]);

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
