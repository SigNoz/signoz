import type {
	DashboardtypesPanelDTO,
	DashboardtypesPanelPluginDTO,
	DashboardtypesPanelSpecDTO,
} from 'api/generated/services/sigNoz.schemas';
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

// The single plugin variant for kind K, picked from the generated plugin union.
// The union members carry a nominal kind-enum, so we distribute over it and
// coerce each member's kind to its string value (`${VK & string}`) to match
// against K. Result: the variant whose `spec` is that kind's exact spec DTO.
// K = PanelKind keeps every variant, recovering the full union.
type PluginOfKind<K extends PanelKind> =
	DashboardtypesPanelPluginDTO extends infer V
		? V extends { kind: infer VK }
			? `${VK & string}` extends K
				? V
				: never
			: never
		: never;

// The panel narrowed to kind K: identical to the wire DTO except `plugin` (and
// hence `plugin.spec`) is the single variant for K. Lets a renderer read
// `panel.spec.plugin.spec` as its own spec type — no cast at the call site.
export type PanelOfKind<K extends PanelKind = PanelKind> = Omit<
	DashboardtypesPanelDTO,
	'spec'
> & {
	spec: Omit<DashboardtypesPanelSpecDTO, 'plugin'> & {
		plugin: PluginOfKind<K>;
	};
};

// Renderer props for a specific panel kind: the shared base (with `panel`
// narrowed to K) plus that kind's interaction surface (PanelInteractionMap[K]).
// Each renderer annotates with its own kind — e.g.
// PanelRendererProps<'signoz/TimeSeriesPanel'> — so it sees its exact spec and
// only the gestures that kind supports. Indexing PanelInteractionMap here forces
// the map to cover every PanelKind. The default K = PanelKind yields the widest
// surface (a union over all kinds).
export type PanelRendererProps<K extends PanelKind = PanelKind> = Omit<
	BaseRendererProps,
	'panel'
> & {
	panel: PanelOfKind<K>;
} & PanelInteractionMap[K];
