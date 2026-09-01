import type {
	DashboardtypesPanelDTO,
	DashboardtypesPanelSpecDTO,
	TelemetrytypesSignalDTO,
} from 'api/generated/services/sigNoz.schemas';
import type { PANEL_TYPES } from 'constants/queryBuilder';
import { requireQueryPanelDefinition } from 'pages/DashboardPage/DashboardContainer/Panels/capabilities';
import { isPanelKindSupported } from 'pages/DashboardPage/DashboardContainer/Panels/registry';
import type { RenderableQueryPanelDefinition } from 'pages/DashboardPage/DashboardContainer/Panels/types/panelDefinition';
import { toLegacyPanelType } from 'pages/DashboardPage/DashboardContainer/Panels/types/panelKind';
import {
	usePanelQuery,
	type PanelQueryTimeOverride,
	type UsePanelQueryResult,
} from 'pages/DashboardPage/DashboardContainer/hooks/usePanelQuery';

import type { PanelEditorDraftApi } from '../types';
import { usePanelEditorDraft } from './usePanelEditorDraft';
import { usePanelEditorQuerySync } from './usePanelEditorQuerySync';

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
	/**
	 * Externally-owned draft. The editor shell hoists it above its mode fork so a
	 * kind switch across modes survives the branch swap; hosts without a fork (the
	 * View modal, until it forks) omit it and the session owns the draft.
	 */
	draftApi?: PanelEditorDraftApi;
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
	panelDefinition: RenderableQueryPanelDefinition;
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
	draftApi,
}: UsePanelEditSessionArgs): UsePanelEditSessionReturn {
	// Called unconditionally (hooks rules); unused when a hoisted draft is passed in.
	const internalDraftApi = usePanelEditorDraft(panel, savedPanel);
	const { draft, spec, setSpec, isSpecDirty, reset } =
		draftApi ?? internalDraftApi;

	const panelKind = draft.spec.plugin.kind;
	// Hosts fork on `definition.mode` before mounting this session (the editor and
	// View modal shells) — asserted rather than assumed.
	const panelDefinition = requireQueryPanelDefinition(panelKind);
	const panelType = toLegacyPanelType(panelKind);
	const defaultSignal = panelDefinition.supportedSignals[0];

	const query = usePanelQuery({
		panel: draft,
		panelId,
		queryCapabilities: panelDefinition.queryCapabilities,
		time,
		enabled: isPanelKindSupported(panelKind),
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
	};
}
