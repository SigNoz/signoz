import type { ComponentType } from 'react';
import { TelemetrytypesSignalDTO } from 'api/generated/services/sigNoz.schemas';
import type { ChartLine } from '@signozhq/icons';
import type { EQueryType } from 'types/common/dashboard';

import type { SectionConfig } from './sections';
import type { AnyPanelInteractionProps } from './interactions';
import type { PanelKind } from './panelKind';
import type {
	PanelQueryCapabilities,
	QueryBuilderFieldRule,
} from './panelCapabilities';
import type { BaseRendererProps, PanelRendererProps } from './rendererProps';

/** Export formats offered under the single "Download" action. */
export enum DownloadFormat {
	CSV = 'csv',
	PNG = 'png',
	SVG = 'svg',
}

/**
 * Which actions a kind supports, declared per-kind in `kinds/<Kind>/definition.ts`.
 * Chrome actions (move, clone, delete) are layout concerns and aren't declared here.
 */
export interface PanelActionCapabilities {
	/** Gates the "View" action. */
	view: boolean;
	/** Gates the "Edit panel" action. */
	edit: boolean;
	/** Gates the "Clone" action. */
	clone: boolean;
	/** Which formats this kind can be downloaded as (CSV is table-only). */
	download: Record<DownloadFormat, boolean>;
	/** Gates "Create Alerts". */
	createAlert: boolean;
	/** Client-side header search box, consumed by the renderer via `searchTerm`. */
	search: boolean;
	/**
	 * Kind supports click-to-drilldown (context menu + View/Breakout). V1 parity: charts + scalar
	 * Pie/Value/Table; Histogram/List opt out. AND-ed with "has a builder query" in `useDrilldown`.
	 */
	drilldown: boolean;
}

/**
 * No actions at all — for a kind this build can't render, where every action would act on
 * a panel body that isn't there. See `UNSUPPORTED_PANEL`.
 */
export const NO_PANEL_ACTIONS: PanelActionCapabilities = {
	view: false,
	edit: false,
	clone: false,
	download: {
		[DownloadFormat.CSV]: false,
		[DownloadFormat.PNG]: false,
		[DownloadFormat.SVG]: false,
	},
	createAlert: false,
	search: false,
	drilldown: false,
};

// Derived from an icon component so the props stay exact (size is a constrained
// IconSize union) and ForwardRef-compatible.
export type PanelIcon = typeof ChartLine;

export interface PanelDefinition<K extends PanelKind = PanelKind> {
	kind: K;
	displayName: string;
	icon: PanelIcon;
	Renderer: ComponentType<PanelRendererProps<K>>;
	sections: SectionConfig[];
	/** Signals this kind can visualize. */
	supportedSignals: TelemetrytypesSignalDTO[];
	/** Query languages this kind supports (Query Builder / ClickHouse / PromQL). */
	supportedQueryTypes: EQueryType[];
	/** Query-builder fields this kind hides/disables, optionally per signal (`{}` hides none). */
	queryBuilderFields: QueryBuilderFieldRule;
	/** How this kind's query-range request is shaped (request type, paging, result formatting). */
	queryCapabilities: PanelQueryCapabilities;
	actions: PanelActionCapabilities;
}

// Every kind must be registered, so getPanelDefinition never returns undefined.
export type PanelRegistry = { [K in PanelKind]: PanelDefinition<K> };

// PanelDefinition with its Renderer widened to the kind-agnostic prop surface.
export interface RenderablePanelDefinition extends Omit<
	PanelDefinition,
	'Renderer'
> {
	Renderer: ComponentType<BaseRendererProps & AnyPanelInteractionProps>;
}
