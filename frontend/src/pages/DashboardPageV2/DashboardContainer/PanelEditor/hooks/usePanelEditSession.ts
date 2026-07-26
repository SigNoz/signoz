import type {
	DashboardtypesPanelDTO,
	DashboardtypesPanelSpecDTO,
	TelemetrytypesSignalDTO,
} from 'api/generated/services/sigNoz.schemas';
import type { PANEL_TYPES } from 'constants/queryBuilder';
import { getPanelDefinition } from 'pages/DashboardPageV2/DashboardContainer/Panels/registry';
import type { RenderablePanelDefinition } from 'pages/DashboardPageV2/DashboardContainer/Panels/types/panelDefinition';
import {
	PANEL_KIND_TO_PANEL_TYPE,
	type PanelKind,
} from 'pages/DashboardPageV2/DashboardContainer/Panels/types/panelKind';
import {
	usePanelQuery,
	type PanelQueryTimeOverride,
	type UsePanelQueryResult,
} from 'pages/DashboardPageV2/DashboardContainer/hooks/usePanelQuery';

import { usePanelEditorDraft } from './usePanelEditorDraft';
import { usePanelEditorQuerySync } from './usePanelEditorQuerySync';
import { usePanelTypeSwitch } from './usePanelTypeSwitch';

interface UsePanelEditSessionArgs {
	panel: DashboardtypesPanelDTO;
	panelId: string;
	/**
	 * The persisted panel the dirty check compares against. Distinct from `panel` (the
	 * seed), which may carry unsaved edits handed off from View mode. Omit for a new
	 * panel or the drilldown modal, where the seed is the baseline.
	 */
	savedPanel?: DashboardtypesPanelDTO;
	/** Per-view time window (epoch ms); omit to follow the dashboard's global window. */
	time?: PanelQueryTimeOverride;
	/** Serialize the live builder query into the spec on save even if unchanged (new panels). */
	alwaysSerializeQuery?: boolean;
	/** Seed an empty builder with the kind's default signal (new panels) — off for drilldown. */
	seedQuerySignal?: boolean;
}

export interface UsePanelEditSessionReturn {
	/** Local editable copy of the panel — the preview renders this, not the saved panel. */
	draft: DashboardtypesPanelDTO;
	spec: DashboardtypesPanelSpecDTO;
	setSpec: (next: DashboardtypesPanelSpecDTO) => void;
	isSpecDirty: boolean;
	/** Restore the draft to the originally-loaded panel. */
	reset: () => void;
	/** Draft kind → V1 panel type (drives the query builder + preview). */
	panelType: PANEL_TYPES;
	panelDefinition: RenderablePanelDefinition;
	/** The kind's first supported signal — seeds new queries/columns. */
	defaultSignal: TelemetrytypesSignalDTO;
	/** Shared query result for the draft over the resolved time window. */
	query: UsePanelQueryResult;
	/** Stage & run the live builder query into the draft. */
	runQuery: () => void;
	isQueryDirty: boolean;
	/** Bake the live (possibly un-run) query into a spec — for save / editor handoff. */
	buildSaveSpec: (
		spec: DashboardtypesPanelSpecDTO,
	) => DashboardtypesPanelSpecDTO;
	/** Switch the draft's visualization kind in place (reversible per session). */
	onChangePanelKind: (kind: PanelKind) => void;
}

/**
 * The panel-editing pipeline shared by the full-page editor and the View modal's
 * drilldown editor: a local draft, its query result over the resolved time window,
 * the staged-query sync, and the visualization-kind switch. Each consumer layers its
 * own concerns on top (the editor adds save + list seeding; the modal adds per-view
 * time isolation + reset). Keeping the wiring here stops the two from drifting.
 */
export function usePanelEditSession({
	panel,
	panelId,
	savedPanel,
	time,
	alwaysSerializeQuery = false,
	seedQuerySignal = false,
}: UsePanelEditSessionArgs): UsePanelEditSessionReturn {
	const { draft, spec, setSpec, isSpecDirty, reset } = usePanelEditorDraft(
		panel,
		savedPanel,
	);

	const panelKind = draft.spec.plugin.kind;
	const panelDefinition = getPanelDefinition(panelKind);
	const panelType = PANEL_KIND_TO_PANEL_TYPE[panelKind];
	const defaultSignal = panelDefinition.supportedSignals[0];

	const query = usePanelQuery({
		panel: draft,
		panelId,
		time,
		enabled: !!panelDefinition,
	});

	const { runQuery, isQueryDirty, buildSaveSpec } = usePanelEditorQuerySync({
		draft,
		panelType,
		setSpec,
		refetch: query.refetch,
		alwaysSerializeQuery,
		signal: seedQuerySignal ? defaultSignal : undefined,
		savedQueries: savedPanel?.spec.queries,
	});

	const { onChangePanelKind } = usePanelTypeSwitch({
		spec: draft.spec,
		panelType,
		setSpec,
	});

	return {
		draft,
		spec,
		setSpec,
		isSpecDirty,
		reset,
		panelType,
		panelDefinition,
		defaultSignal,
		query,
		runQuery,
		isQueryDirty,
		buildSaveSpec,
		onChangePanelKind,
	};
}
