/**
 * Rule: no-zustand-getstate-in-hooks
 *
 * Prevents calling .getState() on Zustand hooks.
 *
 * This rule catches patterns like:
 *   useStore.getState()
 *   useAppStore.getState()
 *
 * Instead, export a standalone action from the store.
 *
 * ESLint equivalent:
 * "no-restricted-syntax": [
 *   "error",
 *   {
 *     "selector": "CallExpression[callee.property.name='getState'][callee.object.name=/^use/]",
 *     "message": "Avoid calling .getState() directly. Export a standalone action from the store instead."
 *   }
 * ]
 */

export default {
	create(context) {
		return {
			CallExpression(node) {
				const callee = node.callee;

				// Check if it's a member expression (e.g., useStore.getState())
				if (callee.type !== 'MemberExpression') {
					return;
				}

				// Check if the property is 'getState'
				const property = callee.property;
				if (property.type !== 'Identifier' || property.name !== 'getState') {
					return;
				}

				// Check if the object name starts with 'use'
				const object = callee.object;
				if (object.type !== 'Identifier' || !object.name.startsWith('use')) {
					return;
				}

				context.report({
					node,
					message:
						'Avoid calling .getState() directly. Export a standalone action from the store instead.',
				});
			},
		};
	},
};
