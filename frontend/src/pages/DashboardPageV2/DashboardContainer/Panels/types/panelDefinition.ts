import type { ComponentType } from 'react';
import { DataSource } from 'types/common/queryBuilder';

import type { SectionConfig } from './sections';
import type { AnyPanelInteractionProps } from './interactions';
import type { PanelKind } from './panelKind';
import type { BaseRendererProps, PanelRendererProps } from './rendererProps';

/**
 * Formats a panel can be exported as — the options under the single "Download"
 * action. The union is the one source of truth for available formats: adding
 * one here turns every kind's `download` map into a compile error until it
 * declares support, forcing an explicit per-kind decision (see below).
 */
export type DownloadFormat = 'csv' | 'png' | 'svg';

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
	/** Kind can be cloned — gates the "Clone" action. */
	clone: boolean;
	/**
	 * Which formats this kind can be downloaded as — surfaced as options under
	 * the single "Download" action. Keyed by every DownloadFormat so each kind
	 * makes an explicit per-format decision. CSV needs tabular data (table-only,
	 * V1 parity); PNG/SVG capture the rendered DOM, so every renderable kind
	 * supports them.
	 */
	download: Record<DownloadFormat, boolean>;
	/** Kind's query can seed a new alert — gates "Create Alerts". */
	createAlert: boolean;
}

/**
 * Kind-level header controls: chrome the panel header renders for THIS kind,
 * beyond the universal title / status / actions. Declared per-kind so the
 * header stays generic and never branches on kind. Required, mirroring
 * `actions`, so registering a new kind forces an explicit decision for every
 * control.
 */
export interface PanelHeaderControls {
	/**
	 * Header carries a collapsible search box that filters the rendered rows
	 * client-side. V1 parity: only tabular panels expose it. The kind's renderer
	 * must consume `searchTerm` (see BaseRendererProps) to apply the filter.
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
	headerControls: PanelHeaderControls;
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
