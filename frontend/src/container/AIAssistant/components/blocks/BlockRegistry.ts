import React from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type BlockComponent<T = any> = React.ComponentType<{ data: T }>;

/**
 * Global registry for AI response block renderers.
 *
 * Any part of the application can register a custom block type:
 *
 *   import { BlockRegistry } from 'container/AIAssistant/components/blocks';
 *   BlockRegistry.register('my-panel', MyPanelComponent);
 *
 * The AI can then emit fenced code blocks with the prefix `ai-<type>` and a
 * JSON payload, and the registered component will be rendered in-place:
 *
 *   ```ai-my-panel
 *   { "foo": "bar" }
 *   ```
 */
const _registry = new Map<string, BlockComponent>();

export const BlockRegistry = {
	register<T>(type: string, component: BlockComponent<T>): void {
		_registry.set(type, component as BlockComponent);
	},

	get(type: string): BlockComponent | undefined {
		return _registry.get(type);
	},

	/** Returns all registered type names (useful for debugging). */
	types(): string[] {
		return Array.from(_registry.keys());
	},
};
