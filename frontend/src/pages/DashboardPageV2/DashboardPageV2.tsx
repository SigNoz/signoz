import { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';

import { Typography } from '@signozhq/ui/typography';
import logEvent from 'api/common/logEvent';
import Spinner from 'components/Spinner';
import PermissionDeniedCallout from 'lib/authz/components/PermissionDeniedCallout/PermissionDeniedCallout';
import { buildDashboardReadPermission } from 'lib/authz/hooks/useAuthZ/permissions/dashboard.permissions';
import { DashboardDetailEvents } from 'pages/DashboardPageV2/constants/events';

import DashboardContainer from './DashboardContainer';
import { useDashboardFetch } from './DashboardContainer/hooks/useDashboardFetch';
import { useDashboardReadDenied } from './DashboardContainer/hooks/useDashboardReadDenied';
import styles from './DashboardPageV2.module.scss';

function DashboardPageV2(): JSX.Element {
	const { dashboardId } = useParams<{ dashboardId: string }>();

	const { dashboard, isLoading, isError, error, refetch } =
		useDashboardFetch(dashboardId);
	const isReadDenied = useDashboardReadDenied(isError, error);

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

export default DashboardPageV2;
