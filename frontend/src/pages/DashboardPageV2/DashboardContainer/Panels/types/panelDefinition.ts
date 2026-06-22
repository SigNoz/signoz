import type { ComponentType } from 'react';
import { DataSource } from 'types/common/queryBuilder';

import type { SectionConfig } from './sections';
import type { AnyPanelInteractionProps } from './interactions';
import type { PanelKind } from './panelKind';
import type { BaseRendererProps, PanelRendererProps } from './rendererProps';

/**
 * Which panel actions a kind supports. Required field, so registering a new
 * kind forces an explicit decision for every action. Chrome actions (move to
 * section, clone, delete) are dashboard-layout concerns available to every
 * panel and are intentionally not declarable here.
 */
export interface PanelActionCapabilities {
	/** Kind has a full-screen view — gates the "View" action. */
	view: boolean;
	/** Kind is editable in the V2 panel editor — gates the "Edit panel" action. */
	edit: boolean;
	/** Kind can be cloned — gates the "Clone" action. */
	clone: boolean;
	/** Gates "Download as CSV". V1 parity: only table panels carry exportable data. */
	download: boolean;
	/** Kind's query can seed a new alert — gates "Create Alerts". */
	createAlert: boolean;
	/**
	 * Header search box that filters rendered rows client-side (V1 parity: only
	 * tabular kinds). Not a menu action — the renderer must consume `searchTerm`.
	 */
	search: boolean;
}

export interface PanelDefinition<K extends PanelKind = PanelKind> {
	kind: K;
	displayName: string;
	Renderer: ComponentType<PanelRendererProps<K>>;
	sections: SectionConfig[];
	supportedSignals: DataSource[];
	actions: PanelActionCapabilities;
}

// Indexing with a literal kind yields that kind's exactly-typed PanelDefinition.
export type PanelRegistry = { [K in PanelKind]?: PanelDefinition<K> };

// PanelDefinition with its Renderer widened to the kind-agnostic prop surface.
// getPanelDefinition resolves to this, concentrating the unavoidable cast in one
// place rather than leaking it to every call site (the kind isn't known statically).
export interface RenderablePanelDefinition extends Omit<
	PanelDefinition,
	'Renderer'
> {
	Renderer: ComponentType<BaseRendererProps & AnyPanelInteractionProps>;
}
