/**
 * Rule: no-raw-html-text-elements
 *
 * Bans raw HTML text elements (span, p, h1-h6) in JSX.
 * Use Typography component from @signozhq/ui instead.
 *
 * BAD:
 *   <span>Hello</span>
 *   <p>Paragraph</p>
 *   <h1>Title</h1>
 *
 * GOOD:
 *   <Typography>Hello</Typography>
 *   <Typography.Text>Hello</Typography.Text>
 *   <Typography.Title level={1}>Title</Typography.Title>
 */

const BANNED_ELEMENTS = new Set(['span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']);

export default {
	create(context) {
		return {
			JSXOpeningElement(node) {
				if (node.name.type !== 'JSXIdentifier') {
					return;
				}

				const elementName = node.name.name;

				if (BANNED_ELEMENTS.has(elementName)) {
					context.report({
						node,
						message: `Avoid raw '<${elementName}>' element. Use Typography component from @signozhq/ui instead.`,
					});
				}
			},
		};
	},
};
