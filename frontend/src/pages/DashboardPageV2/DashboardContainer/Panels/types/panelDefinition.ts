import type { ComponentType } from 'react';
import { DataSource } from 'types/common/queryBuilder';

import type { SectionConfig } from './sections';
import type { AnyPanelInteractionProps } from './interactions';
import type { PanelKind } from './panelKind';
import type { BaseRendererProps, PanelRendererProps } from './rendererProps';

export interface PanelDefinition<K extends PanelKind = PanelKind> {
	kind: K;
	displayName: string;
	Renderer: ComponentType<PanelRendererProps<K>>;
	sections: SectionConfig[];
	supportedSignals: DataSource[];
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
