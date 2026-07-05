import { useCallback, useMemo } from 'react';
import type {
	DashboardtypesPanelDTO,
	DashboardtypesPanelSpecDTO,
	TelemetrytypesSignalDTO,
} from 'api/generated/services/sigNoz.schemas';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { usePanelEditSession } from 'pages/DashboardPageV2/DashboardContainer/PanelEditor/hooks/usePanelEditSession';
import type { RenderablePanelDefinition } from 'pages/DashboardPageV2/DashboardContainer/Panels/types/panelDefinition';
import {
	PANEL_KIND_TO_PANEL_TYPE,
	type PanelKind,
} from 'pages/DashboardPageV2/DashboardContainer/Panels/types/panelKind';
import { resolveSignal } from 'pages/DashboardPageV2/DashboardContainer/Panels/utils/getBuilderQueries';
import { fromPerses } from 'pages/DashboardPageV2/DashboardContainer/queryV5/persesQueryAdapters';
import {
	type PanelQueryTimeOverride,
	type UsePanelQueryResult,
} from 'pages/DashboardPageV2/DashboardContainer/hooks/usePanelQuery';
import type { EQueryType } from 'types/common/dashboard';

interface UseViewPanelModeArgs {
	panel: DashboardtypesPanelDTO;
	panelId: string;
	/** Per-view time window (epoch ms); isolates the preview from the dashboard. */
	time: PanelQueryTimeOverride;
}

export interface UseViewPanelModeReturn {
	/** Local editable copy of the panel — the preview renders this, not the saved panel. */
	draft: DashboardtypesPanelDTO;
	/** Resolved renderer for the draft's current kind (registry always resolves a kind). */
	panelDefinition: RenderablePanelDefinition;
	/**
	 * Builder datasource driving the query builder and the panel-type selector's
	 * disabled rule. Resolved from the query, falling back to the kind's default
	 * signal, so it's always defined.
	 */
	signal: TelemetrytypesSignalDTO;
	/** Active query type (selected builder tab) — drives the panel-type selector's disabled rule. */
	queryType: EQueryType;
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
 * Powers the panel View modal's drilldown editing on top of the shared
 * `usePanelEditSession`: the same draft/query/query-sync/type-switch pipeline the
 * full editor uses, scoped to a per-view time window, plus drilldown-only extras
 * (the saved-query snapshot for Reset, and the builder signal for the type selector).
 * Edits are temporary — they live in the builder/URL and the draft, never the
 * dashboard, matching V1.
 */
export function useViewPanelMode({
	panel,
	panelId,
	time,
}: UseViewPanelModeArgs): UseViewPanelModeReturn {
	const { currentQuery, redirectWithQueryBuilderData } = useQueryBuilder();

	const {
		draft,
		panelDefinition,
		defaultSignal,
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
				panel.spec.queries,
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

	// Current builder datasource — resolved the same way as the full editor's
	// ConfigPane so the two selectors stay in sync, then defaulted to the kind's first
	// signal (PromQL/ClickHouse carry none) so the query builder always has one.
	const signal =
		resolveSignal(draft.spec.queries, defaultSignal) ?? defaultSignal;

	return {
		draft,
		panelDefinition,
		signal,
		queryType: currentQuery.queryType,
		query,
		runQuery,
		onChangePanelKind,
		resetQuery,
		buildSaveSpec,
	};
}
