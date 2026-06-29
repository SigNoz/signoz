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
import type { RenderablePanelDefinition } from 'pages/DashboardPageV2/DashboardContainer/Panels/types/panelDefinition';
import {
	PANEL_KIND_TO_PANEL_TYPE,
	type PanelKind,
} from 'pages/DashboardPageV2/DashboardContainer/Panels/types/panelKind';
import { buildViewPanelSpec } from 'pages/DashboardPageV2/DashboardContainer/Panels/utils/drilldown/buildViewPanelSpec';
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
	/** Restore the query the view opened with, discarding in-modal edits. */
	resetQuery: () => void;
	/** Bake the live (possibly un-run) query into a spec — used to hand edits to the full editor. */
	buildSaveSpec: (
		spec: DashboardtypesPanelSpecDTO,
	) => DashboardtypesPanelSpecDTO;
}

/**
 * The View modal's compact drilldown editor on the shared `usePanelEditSession`. Edits are
 * temporary — they live in the builder/URL + draft, never the dashboard (V1 parity).
 */
export function useViewPanelEditor({
	panel,
	panelId,
	time,
}: UseViewPanelEditorArgs): UseViewPanelEditorApi {
	const { redirectWithQueryBuilderData } = useQueryBuilder();

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
		panelType,
		query,
		runQuery,
		onChangePanelKind,
		buildSaveSpec,
		reset,
	} = usePanelEditSession({ panel: initialPanel, panelId, time });

	// The query the view opened with, captured once — the Reset target.
	const savedQuery = useMemo(
		() =>
			fromPerses(
				initialPanel.spec.queries ?? [],
				PANEL_KIND_TO_PANEL_TYPE[initialPanel.spec.plugin.kind],
			),
		// eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only snapshot
		[],
	);

	const resetQuery = useCallback((): void => {
		reset();
		redirectWithQueryBuilderData(savedQuery);
	}, [reset, redirectWithQueryBuilderData, savedQuery]);

	// Builder datasource for the type-selector's disabled rule (List needs logs/traces).
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
