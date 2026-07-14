/**
 * Rule: no-navigator-clipboard
 *
 * Prevents direct usage of navigator.clipboard.
 *
 * This rule catches patterns like:
 *   navigator.clipboard.writeText(...)
 *   navigator.clipboard.readText()
 *   const cb = navigator.clipboard
 *
 * Instead, use the useCopyToClipboard hook from react-use library.
 *
 * ESLint equivalent:
 * "no-restricted-properties": [
 *   "error",
 *   {
 *     "object": "navigator",
 *     "property": "clipboard",
 *     "message": "Do not use navigator.clipboard directly..."
 *   }
 * ]
 */

export default {
	create(context) {
		return {
			MemberExpression(node) {
				const object = node.object;
				const property = node.property;

				// Check if it's navigator.clipboard
				if (
					object.type === 'Identifier' &&
					object.name === 'navigator' &&
					property.type === 'Identifier' &&
					property.name === 'clipboard'
				) {
					context.report({
						node,
						message:
							'Do not use navigator.clipboard directly since it does not work well with specific browsers. Use hook useCopyToClipboard from react-use library. https://streamich.github.io/react-use/?path=/story/side-effects-usecopytoclipboard--docs',
					});
				}
			},
		};
	},
};
