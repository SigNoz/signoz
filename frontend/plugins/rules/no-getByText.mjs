/**
 * Rule: no-getByText
 *
 * Bans getByText, queryByText, findByText, getAllByText, queryAllByText, findAllByText
 * in test files. Use getByTestId or getByRole instead.
 *
 * BAD:
 *   screen.getByText('Submit')
 *   getByText('Submit')
 *
 * GOOD:
 *   screen.getByTestId('submit-button')
 *   screen.getByRole('button', { name: 'Submit' })
 */

const BANNED_METHODS = new Set([
	'getByText',
	'queryByText',
	'findByText',
	'getAllByText',
	'queryAllByText',
	'findAllByText',
]);

export default {
	create(context) {
		return {
			CallExpression(node) {
				let methodName = null;

				// screen.getByText(...) or result.getByText(...)
				if (
					node.callee.type === 'MemberExpression' &&
					node.callee.property.type === 'Identifier'
				) {
					methodName = node.callee.property.name;
				}

				// Direct getByText(...) from destructured import
				if (node.callee.type === 'Identifier') {
					methodName = node.callee.name;
				}

				if (methodName && BANNED_METHODS.has(methodName)) {
					context.report({
						node,
						message: `Avoid '${methodName}'. Use getByTestId or getByRole instead for more stable selectors.`,
					});
				}
			},
		};
	},
};
