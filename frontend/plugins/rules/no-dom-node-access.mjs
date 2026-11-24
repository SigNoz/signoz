/**
 * Rule: no-dom-node-access
 *
 * Tests find elements through Testing Library (`screen`, `within`), not by
 * walking the DOM. Flags calls to DOM query methods and reads of node
 * traversal properties:
 *   container.querySelector('.row')
 *   screen.getByText('Name').closest('tr')
 *   cell.parentElement
 *   list.children
 *
 * A non-DOM `children` read (a data tree, React props) disables the rule on
 * that line with a reason.
 */

const QUERY_METHODS = new Set([
	'querySelector',
	'querySelectorAll',
	'closest',
	'getElementById',
	'getElementsByClassName',
	'getElementsByTagName',
	'getElementsByName',
]);

const TRAVERSAL_PROPERTIES = new Set([
	'parentElement',
	'parentNode',
	'firstChild',
	'lastChild',
	'firstElementChild',
	'lastElementChild',
	'nextSibling',
	'previousSibling',
	'nextElementSibling',
	'previousElementSibling',
	'childNodes',
	'children',
]);

export default {
	create(context) {
		return {
			MemberExpression(node) {
				if (node.computed || node.property.type !== 'Identifier') {
					return;
				}
				const { name } = node.property;
				const isCall =
					node.parent?.type === 'CallExpression' && node.parent.callee === node;
				if ((isCall && QUERY_METHODS.has(name)) || TRAVERSAL_PROPERTIES.has(name)) {
					context.report({
						node: node.property,
						message: `Find elements through Testing Library (\`screen\`, \`within\`) instead of \`${name}\`.`,
					});
				}
			},
		};
	},
};
