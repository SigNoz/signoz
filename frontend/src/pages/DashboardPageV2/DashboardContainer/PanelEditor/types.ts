import type {
	DashboardtypesPanelDTO,
	DashboardtypesPanelSpecDTO,
} from 'api/generated/services/sigNoz.schemas';

/**
 * Local draft state for the panel being edited. The draft is kept as a perses
 * `DashboardtypesPanelDTO` so the live preview (which feeds the panel renderer)
 * and the save patch share a single shape — no intermediate translation.
 */
export interface PanelEditorDraftApi {
	/** The current (possibly edited) panel. Always a defined object once seeded. */
	draft: DashboardtypesPanelDTO;
	/**
	 * The panel spec (`draft.spec`) — the single editing surface for the config pane.
	 * Title/description live at `spec.display`; the section registry reads its slices
	 * from here (plugin-level via `spec.plugin.spec.<key>`, panel-level via `spec.links`).
	 */
	spec: DashboardtypesPanelSpecDTO;
	/** Replace the whole panel spec (the registry lens returns a new one per edit). */
	setSpec: (next: DashboardtypesPanelSpecDTO) => void;
	/**
	 * True when the draft's display/plugin-spec slices diverge from the loaded
	 * panel. Excludes `spec.queries` — the query is owned by the shared builder and
	 * its dirtiness is tracked there (`usePanelEditorQuerySync.isQueryDirty`).
	 */
	isSpecDirty: boolean;
	/** Restore the draft to the originally-loaded panel. */
	reset: () => void;
}
