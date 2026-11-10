import type {
	DashboardtypesPanelDTO,
	DashboardtypesPanelSpecDTO,
} from 'api/generated/services/sigNoz.schemas';

/**
 * Local draft state for the panel being edited, kept as a perses `DashboardtypesPanelDTO`
 * so the live preview and the save patch share one shape (no intermediate translation).
 */
export interface PanelEditorDraftApi {
	/** The current (possibly edited) panel. Always defined once seeded. */
	draft: DashboardtypesPanelDTO;
	/** The panel spec — the single editing surface for the config pane. */
	spec: DashboardtypesPanelSpecDTO;
	/** Replace the whole panel spec (the registry lens returns a new one per edit). */
	setSpec: (next: DashboardtypesPanelSpecDTO) => void;
	/**
	 * True when the draft's display/plugin-spec slices diverge from the loaded panel.
	 * Excludes `spec.queries` — owned by the shared builder, tracked via
	 * `usePanelEditorQuerySync.isQueryDirty`.
	 */
	isSpecDirty: boolean;
	/** Restore the draft to the originally-loaded panel. */
	reset: () => void;
}
