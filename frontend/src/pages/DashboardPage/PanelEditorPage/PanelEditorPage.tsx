import { useCallback, useMemo, useRef } from 'react';
import {
	generatePath,
	Redirect,
	useLocation,
	useParams,
} from 'react-router-dom';
import { Typography } from '@signozhq/ui/typography';
import Spinner from 'components/Spinner';
import ROUTES from 'constants/routes';
import { useGetCompositeQueryParam } from 'hooks/queryBuilder/useGetCompositeQueryParam';
import { useDashboardPermissions } from 'hooks/dashboards/useDashboardPermissions';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import PermissionDeniedCallout from 'lib/authz/components/PermissionDeniedCallout/PermissionDeniedCallout';
import { buildDashboardReadPermission } from 'lib/authz/hooks/useAuthZ/permissions/dashboard.permissions';

import { useDashboardFetch } from '../DashboardContainer/hooks/useDashboardFetch';
import { useDashboardReadDenied } from '../DashboardContainer/hooks/useDashboardReadDenied';
import { useDashboardEditGuard } from '../DashboardContainer/hooks/useDashboardEditGuard';
import { useResolvedVariables } from '../DashboardContainer/hooks/useResolvedVariables';
import PanelEditorContainer from '../DashboardContainer/PanelEditor';
import type { PanelEditorHandoffState } from '../DashboardContainer/PanelEditor/panelEditorHandoff';
import {
	parseNewPanelKind,
	parseNewPanelLayoutIndex,
} from '../DashboardContainer/PanelEditor/newPanelRoute';
import { useSyncVariablesForSuggestions } from '../DashboardContainer/hooks/useSyncVariablesForSuggestions';
import { useTimeSearchParams } from '../DashboardContainer/hooks/useTimeSearchParams';
import { createDefaultPanel } from '../DashboardContainer/patchOps';
import { useDashboardStore } from '../DashboardContainer/store/useDashboardStore';
import { useSeedVariableSelection } from '../DashboardContainer/VariablesBar/hooks/useSeedVariableSelection';
import { buildNewPanelSeed } from './newPanelSeed';
import styles from './PanelEditorPage.module.scss';

/**
 * Full-page route for editing a V2 dashboard panel. Resolves the panel from the
 * fetched dashboard spec and wires up navigate-back callbacks.
 */
function PanelEditorPage(): JSX.Element {
	const { dashboardId, panelId } = useParams<{
		dashboardId: string;
		panelId: string;
	}>();
	const { search, state } = useLocation();
	const { safeNavigate } = useSafeNavigate();
	const timeSearch = useTimeSearchParams();

	// Edits handed off from the View modal's drilldown — open the editor on these
	// instead of the saved panel. Lost on refresh/new-tab, which falls back to saved.
	const handoffSpec = (state as PanelEditorHandoffState | null)?.editSpec;

	const { dashboard, isLoading, isError, error, refetch } =
		useDashboardFetch(dashboardId);
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
	// Derived from the dashboard this route already holds: it is a root page, so
	// the subtree hook (useDashboardEditContext) has nothing to read from yet.
	const { isEditable, editDisabledReason, editDisabledKind } =
		useDashboardEditGuard(dashboard);
	const editDisabled = useMemo(
		() =>
			editDisabledReason
				? { reason: editDisabledReason, kind: editDisabledKind }
				: undefined,
		[editDisabledReason, editDisabledKind],
	);

	// On a refresh/direct URL this route is the only mount, so seed the edit
	// context the way DashboardContainer does — during render, so the subtree's
	// first render already sees the id (useDashboardFetchRequired throws without it).
	const setEditContext = useDashboardStore((s) => s.setEditContext);
	if (dashboard?.id) {
		setEditContext({ dashboardId: dashboard.id, refetch });
	}

	// No variables bar on this route: seed the selection and publish the resolved
	// payload so the preview and context links get variable values after a refresh.
	useSeedVariableSelection(dashboard);
	useResolvedVariables(dashboard);

	// Feed variables to the query builder autocomplete inside the editor.
	useSyncVariablesForSuggestions(dashboard);

	// An explorer "Add to Dashboard" export rides the query in `compositeQuery` (V1
	// parity). Captured once at mount: the editor rewrites `compositeQuery` in the URL
	// as the user edits, and re-reading it would churn the draft (its reset target and
	// dirty baseline live in the initially-loaded panel).
	const exportCompositeQuery = useGetCompositeQueryParam();
	const exportCompositeQueryRef = useRef(exportCompositeQuery);

	// A `panel/new?panelKind=…` route means "create": seed a default panel of that
	// kind rather than looking one up (seeded from the exported query when present).
	// Persisted (with a real id) only on save.
	const newKind = parseNewPanelKind(panelId, search);
	const existingPanel = dashboard?.spec.panels[panelId];
	const panel = useMemo(() => {
		if (newKind) {
			// A `compositeQuery` at mount means the explorer routed an export here.
			const isExplorerExport = !!exportCompositeQueryRef.current;
			const { kind, pluginSpec, queries } = buildNewPanelSeed(
				newKind,
				exportCompositeQueryRef.current,
				isExplorerExport,
			);
			return createDefaultPanel(kind, pluginSpec, queries);
		}
		if (!existingPanel) {
			return undefined;
		}
		// Open on the modal's drilldown edits when handed off; else the saved panel.
		return handoffSpec ? { ...existingPanel, spec: handoffSpec } : existingPanel;
	}, [newKind, existingPanel, handoffSpec]);

	// Target section for a newly-created panel (set by the "Add panel" trigger).
	const layoutIndex = parseNewPanelLayoutIndex(search);

	const backToDashboard = useCallback((): void => {
		// Drop editor-only URL state (variables come from the persisted store), but carry
		// time so a custom range picked in the editor isn't reset to the dashboard default.
		const path = generatePath(ROUTES.DASHBOARD, { dashboardId });
		safeNavigate(timeSearch ? `${path}?${timeSearch}` : path);
	}, [safeNavigate, dashboardId, timeSearch]);

	if (isLoading || isPermissionLoading) {
		return <Spinner tip="Loading dashboard..." />;
	}

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

	// No panel (stale/deleted id, or unknown new-panel kind) — send the user back.
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
			savedPanel={existingPanel}
			isNew={!!newKind}
			layoutIndex={layoutIndex}
			isEditable={isEditable}
			editDisabled={editDisabled}
			onClose={backToDashboard}
			onSaved={backToDashboard}
		/>
	);
}

export default PanelEditorPage;
