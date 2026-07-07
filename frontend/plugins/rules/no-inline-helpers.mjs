/**
 * Rule: no-inline-helpers
 *
 * Bans too many helper functions in component files.
 * Helper functions should be moved to utils.ts or specialized files.
 *
 * Exempt:
 * - Hooks (use* functions)
 * - Exported functions (they're intentionally in the file)
 * - Files named utils.ts, helpers.ts, constants.ts
 *
 * Threshold: More than 3 private helper functions triggers warning.
 */

const MAX_HELPERS = 3;

function isHookName(name) {
	return /^use[A-Z]/.test(name);
}

function isComponentName(name) {
	return /^[A-Z]/.test(name);
}

export default {
	create(context) {
		const filename = context.getFilename();

		// Skip utility files
		if (
			/\/(utils|helpers|constants|types|hooks)\.(ts|tsx|js|jsx)$/.test(filename) ||
			/\/(utils|helpers|constants|types)\//.test(filename)
		) {
			return {};
		}

		// Skip test files
		if (/\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename)) {
			return {};
		}

		const privateHelpers = [];
		const exportedNames = new Set();
		let hasComponent = false;

		return {
			// Track exported names
			ExportNamedDeclaration(node) {
				if (node.declaration) {
					if (node.declaration.type === 'FunctionDeclaration' && node.declaration.id) {
						exportedNames.add(node.declaration.id.name);
						if (isComponentName(node.declaration.id.name)) {
							hasComponent = true;
						}
					}
					if (node.declaration.type === 'VariableDeclaration') {
						for (const decl of node.declaration.declarations) {
							if (decl.id.type === 'Identifier') {
								exportedNames.add(decl.id.name);
								if (isComponentName(decl.id.name)) {
									hasComponent = true;
								}
							}
						}
					}
				}
			},

			ExportDefaultDeclaration(node) {
				if (
					node.declaration.type === 'FunctionDeclaration' &&
					node.declaration.id &&
					isComponentName(node.declaration.id.name)
				) {
					hasComponent = true;
				}
				if (node.declaration.type === 'Identifier') {
					exportedNames.add(node.declaration.name);
				}
			},

			// Track private function declarations
			FunctionDeclaration(node) {
				if (!node.id) {
					return;
				}

				const name = node.id.name;

				// Will check if exported later
				if (
					!isHookName(name) &&
					!isComponentName(name) &&
					node.parent.type !== 'ExportNamedDeclaration' &&
					node.parent.type !== 'ExportDefaultDeclaration'
				) {
					privateHelpers.push({ name, node });
				}
			},

			// Track private arrow/function expressions
			VariableDeclaration(node) {
				// Skip if this is an export
				if (
					node.parent.type === 'ExportNamedDeclaration' ||
					node.parent.type === 'Program'
				) {
					for (const decl of node.declarations) {
						if (decl.id.type !== 'Identifier') {
							continue;
						}

						const name = decl.id.name;
						const init = decl.init;

						// Only track functions
						if (
							!init ||
							(init.type !== 'ArrowFunctionExpression' &&
								init.type !== 'FunctionExpression')
						) {
							continue;
						}

						// Skip hooks, components, and exports
						if (
							!isHookName(name) &&
							!isComponentName(name) &&
							node.parent.type !== 'ExportNamedDeclaration'
						) {
							privateHelpers.push({ name, node: decl });
						}
					}
				}
			},

			'Program:exit'() {
				// Only check files with components
				if (!hasComponent) {
					return;
				}

				// Filter out any that ended up exported
				const actualPrivate = privateHelpers.filter(
					(h) => !exportedNames.has(h.name),
				);

				if (actualPrivate.length > MAX_HELPERS) {
					// Report on helpers beyond the threshold
					for (let i = MAX_HELPERS; i < actualPrivate.length; i++) {
						const { name, node } = actualPrivate[i];
						context.report({
							node,
							message: `Too many helper functions (${actualPrivate.length}) in component file. Move '${name}' and other helpers to utils.ts. Helpers: ${actualPrivate.map((h) => h.name).join(', ')}.`,
						});
					}
				}
			},
		};
	},
};
