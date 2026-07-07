/**
 * Rule: no-multiple-components
 *
 * Bans multiple React component exports in a single file.
 * Each component should have its own file.
 *
 * BAD:
 *   export function ComponentA() { return <div /> }
 *   export function ComponentB() { return <div /> }
 *
 * GOOD:
 *   // ComponentA.tsx
 *   export function ComponentA() { return <div /> }
 *
 *   // ComponentB.tsx (separate file)
 *   export function ComponentB() { return <div /> }
 *
 * Note: index.tsx files are exempt (re-export barrels).
 */

function isPascalCase(name) {
	return /^[A-Z][a-zA-Z0-9]*$/.test(name);
}

function hasJSXReturn(node) {
	if (!node.body) {
		return false;
	}

	// Arrow function with direct JSX return: () => <div />
	if (node.body.type === 'JSXElement' || node.body.type === 'JSXFragment') {
		return true;
	}

	// Function body - check return statements
	if (node.body.type === 'BlockStatement') {
		for (const stmt of node.body.body) {
			if (
				stmt.type === 'ReturnStatement' &&
				stmt.argument &&
				(stmt.argument.type === 'JSXElement' ||
					stmt.argument.type === 'JSXFragment' ||
					// Conditional: condition ? <A /> : <B />
					(stmt.argument.type === 'ConditionalExpression' &&
						(stmt.argument.consequent.type === 'JSXElement' ||
							stmt.argument.alternate.type === 'JSXElement')) ||
					// Logical: condition && <A />
					(stmt.argument.type === 'LogicalExpression' &&
						(stmt.argument.left.type === 'JSXElement' ||
							stmt.argument.right.type === 'JSXElement')))
			) {
				return true;
			}
		}
	}

	return false;
}

export default {
	create(context) {
		const exportedComponents = [];

		return {
			// export function ComponentName() { }
			ExportNamedDeclaration(node) {
				if (!node.declaration) {
					return;
				}

				// function ComponentName() {}
				if (node.declaration.type === 'FunctionDeclaration') {
					const name = node.declaration.id?.name;
					if (name && isPascalCase(name) && hasJSXReturn(node.declaration)) {
						exportedComponents.push({ name, node });
					}
				}

				// const ComponentName = () => {} or const ComponentName = function() {}
				if (node.declaration.type === 'VariableDeclaration') {
					for (const declarator of node.declaration.declarations) {
						const name = declarator.id?.name;
						if (!name || !isPascalCase(name)) {
							continue;
						}

						const init = declarator.init;
						if (!init) {
							continue;
						}

						// Arrow function or function expression
						if (
							(init.type === 'ArrowFunctionExpression' ||
								init.type === 'FunctionExpression') &&
							hasJSXReturn(init)
						) {
							exportedComponents.push({ name, node });
						}

						// React.memo(Component) or memo(Component)
						if (
							init.type === 'CallExpression' &&
							((init.callee.type === 'Identifier' &&
								(init.callee.name === 'memo' ||
									init.callee.name === 'forwardRef')) ||
								(init.callee.type === 'MemberExpression' &&
									init.callee.object.name === 'React' &&
									(init.callee.property.name === 'memo' ||
										init.callee.property.name === 'forwardRef')))
						) {
							exportedComponents.push({ name, node });
						}
					}
				}
			},

			// export default function ComponentName() { }
			ExportDefaultDeclaration(node) {
				if (node.declaration.type === 'FunctionDeclaration') {
					const name = node.declaration.id?.name;
					if (name && isPascalCase(name) && hasJSXReturn(node.declaration)) {
						exportedComponents.push({ name, node });
					}
				}
			},

			'Program:exit'() {
				if (exportedComponents.length > 1) {
					// Report on all but the first component
					for (let i = 1; i < exportedComponents.length; i++) {
						const { name, node } = exportedComponents[i];
						context.report({
							node,
							message: `Multiple component exports in same file. Move '${name}' to its own file. Found ${exportedComponents.length} components: ${exportedComponents.map((c) => c.name).join(', ')}.`,
						});
					}
				}
			},
		};
	},
};
