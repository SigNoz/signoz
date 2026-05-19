import { PageAction, PageActionDescriptor } from './types';

/**
 * Module-level singleton (mirrors BlockRegistry) that maps action IDs to their
 * PageAction descriptors. Pages register their actions on mount and unregister
 * on unmount via `usePageActions`.
 *
 * Internal structure:
 *   _byPage:  pageId  → PageAction[]   (for batch unregister)
 *   _byId:    actionId → PageAction     (O(1) lookup at execute time)
 */

// pageId → actions[]
const _byPage = new Map<string, PageAction[]>();

// actionId → action (flat, for O(1) lookup)
const _byId = new Map<string, PageAction>();

export const PageActionRegistry = {
	/**
	 * Register a set of actions under a page scope key.
	 * Calling register() again with the same pageId replaces the previous set.
	 */
	register(pageId: string, actions: PageAction[]): void {
		// Remove any previously registered actions for this page
		const prev = _byPage.get(pageId) ?? [];
		prev.forEach((a) => _byId.delete(a.id));

		_byPage.set(pageId, actions);
		actions.forEach((a) => _byId.set(a.id, a));
	},

	/** Remove all actions registered under a page scope key. */
	unregister(pageId: string): void {
		const prev = _byPage.get(pageId) ?? [];
		prev.forEach((a) => _byId.delete(a.id));
		_byPage.delete(pageId);
	},

	/** Look up a single action by its dot-namespaced id. */
	get(actionId: string): PageAction | undefined {
		return _byId.get(actionId);
	},

	/**
	 * Returns serialisable descriptors for all currently registered actions,
	 * with context snapshots already collected. Safe to embed in API payload.
	 */
	snapshot(): PageActionDescriptor[] {
		return Array.from(_byId.values()).map((action) => ({
			id: action.id,
			description: action.description,
			parameters: action.parameters,
			context: action.getContext?.(),
		}));
	},

	/** Returns all registered action IDs (useful for debugging). */
	ids(): string[] {
		return Array.from(_byId.keys());
	},
};
