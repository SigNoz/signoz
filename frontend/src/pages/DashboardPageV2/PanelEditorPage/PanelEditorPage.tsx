import { useCallback } from 'react';
import {
	generatePath,
	Redirect,
	useLocation,
	useParams,
} from 'react-router-dom';
import { Typography } from '@signozhq/ui/typography';
import { useGetDashboardV2 } from 'api/generated/services/dashboard';
import Spinner from 'components/Spinner';
import ROUTES from 'constants/routes';
import { useSafeNavigate } from 'hooks/useSafeNavigate';

import PanelEditorContainer from '../DashboardContainer/PanelEditor';
import styles from './PanelEditorPage.module.scss';

/**
 * Dedicated route for editing a V2 dashboard panel (`/dashboard/:dashboardId/
 * panel/:panelId`). Replaces the former modal overlay: the editor is now a full
 * page you navigate to and back from, mirroring the V1 widget-editor flow.
 *
 * Fetches the dashboard (same hook as DashboardPageV2), resolves the panel from
 * its spec, and hands `PanelEditorContainer` the navigate-back callbacks. The
 * save round-trip invalidates the dashboard query, so returning to the
 * dashboard shows the persisted edit without an explicit refetch here.
 */
function PanelEditorPage(): JSX.Element {
	const { dashboardId, panelId } = useParams<{
		dashboardId: string;
		panelId: string;
	}>();
	const { search } = useLocation();
	const { safeNavigate } = useSafeNavigate();

	const { data, isLoading, isError, error } = useGetDashboardV2({
		id: dashboardId,
	});
	const dashboard = data?.data;
	const panel = dashboard?.spec.panels[panelId];

	const backToDashboard = useCallback((): void => {
		safeNavigate(`${generatePath(ROUTES.DASHBOARD, { dashboardId })}${search}`);
	}, [safeNavigate, dashboardId, search]);

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

	// The URL references a panel that no longer exists on this dashboard (stale
	// link or deleted panel) — send the user back to the dashboard instead of
	// rendering an empty editor.
	if (!panel) {
		return (
			<Redirect
				to={`${generatePath(ROUTES.DASHBOARD, { dashboardId })}${search}`}
			/>
		);
	}

	return (
		<PanelEditorContainer
			dashboardId={dashboardId}
			panelId={panelId}
			panel={panel}
			onClose={backToDashboard}
			onSaved={backToDashboard}
		/>
	);
}

export default PanelEditorPage;
