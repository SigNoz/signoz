import type { ComponentType } from 'react';
import { DataSource } from 'types/common/queryBuilder';

import type { SectionConfig } from './sections';
import type { AnyPanelInteractionProps } from './interactions';
import type { PanelKind } from './panelKind';
import type { BaseRendererProps, PanelRendererProps } from './rendererProps';

/**
 * Kind-level action capabilities: which panel actions THIS kind supports.
 * Declared per-kind in `kinds/<Kind>/definition.ts` — the field is required,
 * so registering a new kind forces an explicit decision for every action
 * (mirroring how PanelInteractionMap forces per-kind interaction coverage).
 *
 * Chrome actions (move to section, clone, delete) are dashboard-layout
 * concerns, available for every panel — including kinds V2 can't render —
 * and are intentionally not declarable here.
 */
export interface PanelActionCapabilities {
	/** Kind has a full-screen view — gates the "View" action. */
	view: boolean;
	/** Kind is editable in the V2 panel editor — gates the "Edit panel" action. */
	edit: boolean;
	/**
	 * Kind's data can be exported as CSV — gates "Download as CSV". V1 parity:
	 * only table panels carry tabular data worth exporting.
	 */
	download: boolean;
	/** Kind's query can seed a new alert — gates "Create Alerts". */
	createAlert: boolean;
}

export interface PanelDefinition<K extends PanelKind = PanelKind> {
	kind: K;
	displayName: string;
	Renderer: ComponentType<PanelRendererProps<K>>;
	sections: SectionConfig[];
	supportedSignals: DataSource[];
	actions: PanelActionCapabilities;
}

// Keyed registry that preserves the kind ↔ definition correlation: indexing
// with a literal kind yields that kind's exactly-typed PanelDefinition.
export type PanelRegistry = { [K in PanelKind]?: PanelDefinition<K> };

// A PanelDefinition whose Renderer is widened to the kind-agnostic prop surface.
// At the render boundary the concrete kind isn't known statically (a registry
// lookup returns a union over kinds), so getPanelDefinition resolves to this —
// concentrating the single unavoidable cast in one place instead of leaking it
// to every call site.
export interface RenderablePanelDefinition extends Omit<
	PanelDefinition,
	'Renderer'
> {
	Renderer: ComponentType<BaseRendererProps & AnyPanelInteractionProps>;
}
