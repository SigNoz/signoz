import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';

/** The panel display fields editable in milestone 1 of the V2 panel editor. */
export interface PanelDisplayDraft {
	name: string;
	description: string;
}

/**
 * Local draft state for the panel being edited. The draft is kept as a perses
 * `DashboardtypesPanelDTO` so the live preview (which feeds the panel renderer)
 * and the save patch share a single shape — no intermediate translation.
 */
export interface PanelEditorDraftApi {
	/** The current (possibly edited) panel. Always a defined object once seeded. */
	draft: DashboardtypesPanelDTO;
	/** Read the current display values (name/description) for the config pane. */
	display: PanelDisplayDraft;
	/** Patch the panel's display (title/description). */
	setDisplay: (next: Partial<PanelDisplayDraft>) => void;
	/** True when the draft diverges from the originally-loaded panel. */
	isDirty: boolean;
	/** Restore the draft to the originally-loaded panel. */
	reset: () => void;
}
