import { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';

import { Typography } from '@signozhq/ui/typography';
import logEvent from 'api/common/logEvent';
import Spinner from 'components/Spinner';
import { withAuthZPage } from 'lib/authz/components/withAuthZ/withAuthZPage';
import { buildDashboardReadPermission } from 'lib/authz/hooks/useAuthZ/permissions/dashboard.permissions';
import { DashboardDetailEvents } from 'pages/DashboardPage/constants/events';

import DashboardContainer from './DashboardContainer';
import { useDashboardFetch } from './DashboardContainer/hooks/useDashboardFetch';
import { useDashboardPermissions } from 'hooks/dashboards/useDashboardPermissions';
import styles from './DashboardPage.module.scss';

function DashboardPage(): JSX.Element {
	const { dashboardId } = useParams<{ dashboardId: string }>();

	const { dashboard, isLoading, isError, error, refetch } =
		useDashboardFetch(dashboardId);
	// `read` is already resolved by the page guard; this resolves `update` and
	// `delete` so the subtree mounts once with every permission known, instead of
	// rendering controls enabled and flipping them.
	const { isLoading: isPermissionLoading } =
		useDashboardPermissions(dashboardId);

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

// Typed explicitly because the route lazy-loads this module, and Loadable needs
// an indexable props type.
export default withAuthZPage<Record<string, unknown>>(DashboardPage, {
	checks: (_props, router) => [
		buildDashboardReadPermission(router.params.dashboardId ?? ''),
	],
	fallbackOnLoading: <Spinner tip="Loading dashboard..." />,
});
