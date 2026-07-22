import type { ComponentType } from 'react';
import { TelemetrytypesSignalDTO } from 'api/generated/services/sigNoz.schemas';
import type { EQueryType } from 'types/common/dashboard';

import type { SectionConfig } from './sections';
import type { AnyPanelInteractionProps } from './interactions';
import type { PanelKind } from './panelKind';
import type { QueryBuilderFieldRule } from './panelCapabilities';
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

export interface PanelDefinition<K extends PanelKind = PanelKind> {
	kind: K;
	displayName: string;
	Renderer: ComponentType<PanelRendererProps<K>>;
	sections: SectionConfig[];
	/** Signals this kind can visualize. */
	supportedSignals: TelemetrytypesSignalDTO[];
	/** Query languages this kind supports (Query Builder / ClickHouse / PromQL). */
	supportedQueryTypes: EQueryType[];
	/** Query-builder fields this kind hides/disables, optionally per signal (`{}` hides none). */
	queryBuilderFields: QueryBuilderFieldRule;
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
