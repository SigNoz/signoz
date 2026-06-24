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
import { QueryParams } from 'constants/query';
import ROUTES from 'constants/routes';
import { useSafeNavigate } from 'hooks/useSafeNavigate';

import PanelEditorContainer from '../DashboardContainer/PanelEditor';
import styles from './PanelEditorPage.module.scss';

/**
 * Full-page route for editing a V2 dashboard panel. Fetches the dashboard, resolves
 * the panel from its spec, and hands `PanelEditorContainer` the navigate-back
 * callbacks. The save round-trip invalidates the dashboard query, so returning shows
 * the persisted edit without an explicit refetch here.
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
		// Carry only dashboard params back; drop editor-only URL state (chiefly
		// `compositeQuery`, the query builder's URL sync) so it doesn't leak into the
		// dashboard. Time lives in Redux, so it survives without being in the URL.
		const params = new URLSearchParams();
		const variables = new URLSearchParams(search).get(QueryParams.variables);
		if (variables) {
			params.set(QueryParams.variables, variables);
		}
		const query = params.toString();
		safeNavigate(
			`${generatePath(ROUTES.DASHBOARD, { dashboardId })}${
				query ? `?${query}` : ''
			}`,
		);
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

	// Stale/deleted panel ref: redirect to the dashboard rather than render an empty editor.
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
