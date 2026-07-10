import { useCallback, useMemo } from 'react';
import type {
	DashboardtypesPanelDTO,
	DashboardtypesPanelSpecDTO,
	TelemetrytypesSignalDTO,
} from 'api/generated/services/sigNoz.schemas';
import { QueryParams } from 'constants/query';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { useGetCompositeQueryParam } from 'hooks/queryBuilder/useGetCompositeQueryParam';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import useUrlQuery from 'hooks/useUrlQuery';
import { usePanelEditSession } from 'pages/DashboardPageV2/DashboardContainer/PanelEditor/hooks/usePanelEditSession';
import type { OpenDrilldownView } from 'pages/DashboardPageV2/DashboardContainer/Panels/types/drilldown';
import type { RenderablePanelDefinition } from 'pages/DashboardPageV2/DashboardContainer/Panels/types/panelDefinition';
import {
	PANEL_KIND_TO_PANEL_TYPE,
	type PanelKind,
} from 'pages/DashboardPageV2/DashboardContainer/Panels/types/panelKind';
import { resolveSignal } from 'pages/DashboardPageV2/DashboardContainer/Panels/utils/getBuilderQueries';
import { buildViewPanelSpec } from 'pages/DashboardPageV2/DashboardContainer/Panels/utils/drilldown/buildViewPanelSpec';
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
	/** Update the draft's spec in place (e.g. the List columns editor). */
	setSpec: (next: DashboardtypesPanelSpecDTO) => void;
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
	/** Restore the query the view opened with, discarding in-modal edits. */
	resetQuery: () => void;
	/** Bake the live (possibly un-run) query into a spec — used to hand edits to the full editor. */
	buildSaveSpec: (
		spec: DashboardtypesPanelSpecDTO,
	) => DashboardtypesPanelSpecDTO;
	/**
	 * Drill-down handoff for filter-by-value / breakout: refine the view in place (persist to the
	 * URL so it survives refresh, and re-run the preview), rather than opening a new View modal.
	 */
	applyDrilldownQuery: OpenDrilldownView;
}

/**
 * The View modal's compact drilldown editor on the shared `usePanelEditSession`. Edits are
 * temporary — they live in the builder/URL + draft, never the dashboard (V1 parity).
 */
export function useViewPanelMode({
	panel,
	panelId,
	time,
}: UseViewPanelModeArgs): UseViewPanelModeReturn {
	const { currentQuery, redirectWithQueryBuilderData } = useQueryBuilder();

	// Seed the draft from the URL (`compositeQuery` + `graphType`) when present, else the saved
	// panel — mount-only, so a refresh re-seeds from the URL and in-modal edits survive (V1 parity).
	const urlQuery = useGetCompositeQueryParam();
	const urlGraphType = useUrlQuery().get(
		QueryParams.graphType,
	) as PANEL_TYPES | null;
	const initialPanel = useMemo<DashboardtypesPanelDTO>(
		() =>
			urlQuery
				? {
						...panel,
						spec: buildViewPanelSpec({
							spec: panel.spec,
							query: urlQuery,
							panelType:
								urlGraphType ?? PANEL_KIND_TO_PANEL_TYPE[panel.spec.plugin.kind],
						}),
					}
				: panel,
		// eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only seed from the URL
		[],
	);

	const {
		draft,
		panelDefinition,
		defaultSignal,
		query,
		runQuery,
		onChangePanelKind,
		buildSaveSpec,
		reset,
		setSpec,
	} = usePanelEditSession({ panel: initialPanel, panelId, time });

	// The query the view opened with, captured once — the Reset target.
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
		reset();
		redirectWithQueryBuilderData(savedQuery);
	}, [reset, redirectWithQueryBuilderData, savedQuery]);

	// redirectWithQueryBuilderData (not the grid's openViewWithQuery): the cloned query keeps its id,
	// so the QB provider's `stagedQuery.id === url id` guard would skip a plain URL write. setSpec
	// commits into the draft too — filter/breakout aren't a structural change, so it won't auto-commit.
	const applyDrilldownQuery = useCallback<OpenDrilldownView>(
		(viewPanelId, drilldownQuery, drilldownPanelType): void => {
			redirectWithQueryBuilderData(
				drilldownQuery,
				{
					[QueryParams.expandedWidgetId]: viewPanelId,
					[QueryParams.graphType]: drilldownPanelType,
				},
				undefined,
				true,
			);
			setSpec(
				buildViewPanelSpec({
					spec: draft.spec,
					query: drilldownQuery,
					panelType: drilldownPanelType,
				}),
			);
		},
		[redirectWithQueryBuilderData, setSpec, draft.spec],
	);

	// Current builder datasource — resolved the same way as the full editor's
	// ConfigPane so the two selectors stay in sync, then defaulted to the kind's first
	// signal (PromQL/ClickHouse carry none) so the query builder always has one.
	const signal =
		resolveSignal(draft.spec.queries, defaultSignal) ?? defaultSignal;

	return {
		draft,
		setSpec,
		panelDefinition,
		signal,
		queryType: currentQuery.queryType,
		query,
		runQuery,
		onChangePanelKind,
		resetQuery,
		buildSaveSpec,
		applyDrilldownQuery,
	};
}
