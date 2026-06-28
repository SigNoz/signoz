import { useCallback, useMemo } from 'react';
import type {
	DashboardtypesPanelDTO,
	DashboardtypesPanelSpecDTO,
	TelemetrytypesSignalDTO,
} from 'api/generated/services/sigNoz.schemas';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { usePanelEditSession } from 'pages/DashboardPageV2/DashboardContainer/PanelEditor/hooks/usePanelEditSession';
import type { RenderablePanelDefinition } from 'pages/DashboardPageV2/DashboardContainer/Panels/types/panelDefinition';
import {
	PANEL_KIND_TO_PANEL_TYPE,
	type PanelKind,
} from 'pages/DashboardPageV2/DashboardContainer/Panels/types/panelKind';
import { getBuilderQueries } from 'pages/DashboardPageV2/DashboardContainer/Panels/utils/getBuilderQueries';
import { fromPerses } from 'pages/DashboardPageV2/DashboardContainer/queryV5/persesQueryAdapters';
import {
	type PanelQueryTimeOverride,
	type UsePanelQueryResult,
} from 'pages/DashboardPageV2/DashboardContainer/hooks/usePanelQuery';

interface UseViewPanelEditorArgs {
	panel: DashboardtypesPanelDTO;
	panelId: string;
	/** Per-view time window (epoch ms); isolates the preview from the dashboard. */
	time: PanelQueryTimeOverride;
}

export interface UseViewPanelEditorApi {
	/** Local editable copy of the panel — the preview renders this, not the saved panel. */
	draft: DashboardtypesPanelDTO;
	/** Resolved renderer for the draft's current kind. */
	panelDefinition: RenderablePanelDefinition | undefined;
	/** Draft kind → V1 panel type (drives the query builder tabs + preview). */
	panelType: PANEL_TYPES;
	/** Current builder datasource — drives the panel-type selector's disabled rule. */
	signal?: TelemetrytypesSignalDTO;
	/** Query result for the draft over the per-view window. */
	query: UsePanelQueryResult;
	/** Stage & run the live builder query into the draft (drilldown; not persisted). */
	runQuery: () => void;
	/** Switch the draft's visualization kind (temporary; reversible per session). */
	onChangePanelKind: (kind: PanelKind) => void;
	/** Restore the saved panel's query + kind, discarding the drilldown edits. */
	resetQuery: () => void;
	/** Bake the live (possibly un-run) query into a spec — used to hand edits to the full editor. */
	buildSaveSpec: (
		spec: DashboardtypesPanelSpecDTO,
	) => DashboardtypesPanelSpecDTO;
}

/**
 * Turns the View modal into a compact, drilldown panel editor on top of the shared
 * `usePanelEditSession`: the same draft/query/query-sync/type-switch pipeline the
 * full editor uses, scoped to a per-view time window, plus drilldown-only extras
 * (the saved-query snapshot for Reset, and the builder signal for the type selector).
 * Edits are temporary — they live in the builder/URL and the draft, never the
 * dashboard, matching V1.
 */
export function useViewPanelEditor({
	panel,
	panelId,
	time,
}: UseViewPanelEditorArgs): UseViewPanelEditorApi {
	const { redirectWithQueryBuilderData } = useQueryBuilder();

	const {
		draft,
		panelDefinition,
		panelType,
		query,
		runQuery,
		onChangePanelKind,
		buildSaveSpec,
		reset,
	} = usePanelEditSession({ panel, panelId, time });

	// The saved panel's query, captured once — the restore target for Reset Query.
	const savedQuery = useMemo(
		() =>
			fromPerses(
				panel.spec.queries ?? [],
				PANEL_KIND_TO_PANEL_TYPE[panel.spec.plugin.kind],
			),
		// eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only snapshot
		[],
	);

	const resetQuery = useCallback((): void => {
		// Draft back to the saved panel (query + kind); builder back to the saved query.
		reset();
		redirectWithQueryBuilderData(savedQuery);
	}, [reset, redirectWithQueryBuilderData, savedQuery]);

	// Current builder datasource (List needs logs/traces, not metrics) for the
	// panel-type disabled rule; unknown for PromQL/ClickHouse.
	const signal = getBuilderQueries(draft.spec.queries || [])[0]?.signal as
		| TelemetrytypesSignalDTO
		| undefined;

	return {
		draft,
		panelDefinition,
		panelType,
		signal,
		query,
		runQuery,
		onChangePanelKind,
		resetQuery,
		buildSaveSpec,
	};
}
