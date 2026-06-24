import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import type {
	DashboardCursorSync,
	SyncTooltipFilterMode,
} from 'lib/uPlotV2/plugins/TooltipPlugin/types';
import { PanelMode } from 'container/DashboardContainer/visualization/panels/types';
import type {
	PanelPagination,
	PanelQueryData,
} from 'pages/DashboardPageV2/DashboardContainer/queryV5/types';

import type { PanelInteractionMap } from './interactions';
import type { PanelKind } from './panelKind';

/** Dashboard-wide rendering preferences propagated to every panel renderer. */
export interface DashboardPreference {
	/** Cursor-sync mode; always present — `DashboardCursorSync.None` is the off state. */
	syncMode: DashboardCursorSync;
	/** Filter applied to the synced tooltip across panels. */
	syncFilterMode?: SyncTooltipFilterMode;
	/** Dashboard id, for renderers that scope per-dashboard state. */
	dashboardId?: string;
}

// Kind-agnostic props every renderer receives. Kind-specific interaction props
// are layered on per-kind by PanelRendererProps<K>.
export interface BaseRendererProps {
	panelId: string;
	/**
	 * The whole perses panel — renderers derive `spec` and `queries` from this.
	 * Required: the render boundary only mounts a renderer once the panel and its
	 * kind are resolved, so a renderer never sees an absent panel.
	 */
	panel: DashboardtypesPanelDTO;
	/** Raw V5 fetch result — response + the request that produced it. */
	data: PanelQueryData;
	isLoading: boolean;
	error: Error | null;
	/** Gate for the drill-down right-click menu. Off by default in V2. */
	enableDrillDown?: boolean;
	/** Render context (dashboard widget vs. standalone vs. editor); see PanelMode. */
	panelMode: PanelMode;
	/** Dashboard-level preferences propagated to every panel; shell resolves, renderer consumes. */
	dashboardPreference?: DashboardPreference;
	/**
	 * Free-text filter from the header search box, applied client-side. Only
	 * meaningful for kinds that declare `actions.search`; others ignore it.
	 */
	searchTerm?: string;
	/** Server-side paging handles. Present only for raw/list panels; others ignore it. */
	pagination?: PanelPagination;
}

// Renderer props for a specific kind: shared base plus that kind's interaction
// surface. Indexing PanelInteractionMap forces it to cover every PanelKind; the
// default K = PanelKind yields the widest surface (a union over all kinds).
export type PanelRendererProps<K extends PanelKind = PanelKind> =
	BaseRendererProps & PanelInteractionMap[K];
