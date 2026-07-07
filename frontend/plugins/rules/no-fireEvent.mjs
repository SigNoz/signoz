/**
 * Rule: no-fireEvent
 *
 * Bans fireEvent in test files. Use userEvent instead for more realistic
 * user interaction simulation.
 *
 * BAD:
 *   fireEvent.click(button)
 *   fireEvent.change(input, { target: { value: 'test' } })
 *
 * GOOD:
 *   await userEvent.click(button)
 *   await userEvent.type(input, 'test')
 */

export default {
	create(context) {
		return {
			// fireEvent.click(...), fireEvent.change(...)
			MemberExpression(node) {
				if (
					node.object.type === 'Identifier' &&
					node.object.name === 'fireEvent'
				) {
					context.report({
						node,
						message:
							"Avoid 'fireEvent'. Use userEvent from @testing-library/user-event for more realistic user interactions.",
					});
				}
			},

			// import { fireEvent } from '@testing-library/react'
			ImportSpecifier(node) {
				if (
					node.imported.type === 'Identifier' &&
					node.imported.name === 'fireEvent'
				) {
					context.report({
						node,
						message:
							"Avoid importing 'fireEvent'. Use userEvent from @testing-library/user-event instead.",
					});
				}
			},
		};
	},
};
