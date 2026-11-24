import { ruleTester } from './rule-tester.mjs';

const message = (name) =>
	`Find elements through Testing Library (\`screen\`, \`within\`) instead of \`${name}\`.`;

await ruleTester({
	rule: 'no-dom-node-access',
	valid: [
		{
			name: 'Testing Library queries',
			code: "within(screen.getByTestId('row')).getByText('Name');",
		},
		{
			name: 'children of a data tree',
			code: 'expect(tree.children).toHaveLength(2);',
		},
		{
			name: 'a query method that is not called',
			code: 'jest.spyOn(document, "querySelector");\nconst q = Element.prototype.closest;',
		},
		{
			name: 'computed access',
			code: "const name = 'closest';\nel[name]('tr');",
		},
	],
	invalid: [
		{
			name: 'querySelector on the container',
			code: "container.querySelector('.row');",
			errors: [{ message: message('querySelector'), line: 1, column: 11 }],
		},
		{
			name: 'closest after a screen query',
			code: "screen.getByText('Name').closest('tr');",
			errors: [{ message: message('closest'), line: 1, column: 26 }],
		},
		{
			name: 'optional call',
			code: "row?.querySelectorAll('td');",
			errors: [{ message: message('querySelectorAll'), line: 1, column: 6 }],
		},
		{
			name: 'traversal property',
			code: 'expect(cell.parentElement).toBeVisible();',
			errors: [{ message: message('parentElement'), line: 1, column: 13 }],
		},
		{
			name: 'document lookup by id',
			code: "document.getElementById('root');",
			errors: [{ message: message('getElementById'), line: 1, column: 10 }],
		},
	],
});
