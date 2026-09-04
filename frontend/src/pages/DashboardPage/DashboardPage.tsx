import { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';

import { Typography } from '@signozhq/ui/typography';
import logEvent from 'api/common/logEvent';
import Spinner from 'components/Spinner';
import PermissionDeniedCallout from 'lib/authz/components/PermissionDeniedCallout/PermissionDeniedCallout';
import { buildDashboardReadPermission } from 'lib/authz/hooks/useAuthZ/permissions/dashboard.permissions';
import { DashboardDetailEvents } from 'pages/DashboardPage/constants/events';

import DashboardContainer from './DashboardContainer';
import { useDashboardFetch } from './DashboardContainer/hooks/useDashboardFetch';
import { useDashboardReadDenied } from './DashboardContainer/hooks/useDashboardReadDenied';
import { useDashboardPermissions } from 'hooks/dashboards/useDashboardPermissions';
import styles from './DashboardPage.module.scss';

function DashboardPage(): JSX.Element {
	const { dashboardId } = useParams<{ dashboardId: string }>();

	const { dashboard, isLoading, isError, error, refetch } =
		useDashboardFetch(dashboardId);
	// Fired in parallel with the dashboard GET, then both are awaited below, so the
	// tree mounts once with permissions already known.
	const {
		canRead,
		isLoading: isPermissionLoading,
		hasError: hasPermissionError,
	} = useDashboardPermissions(dashboardId);
	const isReadDenied = useDashboardReadDenied({
		canRead,
		hasPermissionError,
		isError,
		error,
	});

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

	if (isLoading || isPermissionLoading) {
		return <Spinner tip="Loading dashboard..." />;
	}

	// The route stays reachable and the denial is explained in place, rather than
	// reading as a generic failure — a dashboard you can list but not read is a
	// normal outcome of the backend's collection-scoped list.
	if (isReadDenied) {
		return (
			<div className={styles.errorState}>
				<PermissionDeniedCallout
					deniedPermissions={[buildDashboardReadPermission(dashboardId)]}
				/>
			</div>
		);
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

export default DashboardPage;
