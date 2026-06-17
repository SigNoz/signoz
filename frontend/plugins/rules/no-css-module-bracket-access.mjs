/**
 * Rule: no-css-module-bracket-access
 *
 * Prevents bracket access on CSS module imports that may fail with camelCaseOnly config.
 *
 * With Vite's `localsConvention: 'camelCaseOnly'`, kebab-case class names are
 * converted to camelCase and the original key is NOT exported.
 *
 * This rule catches patterns like:
 *   styles['my-class']     // BAD - undefined if CSS has .my-class
 *   styles['myClass']      // OK but prefer dot notation
 *   styles.myClass         // GOOD
 *
 * Catches:
 * - Bracket access with kebab-case strings (always fails)
 * - Bracket access with any string literal (warn - prefer dot notation)
 * - Dynamic bracket access (warn - risky)
 */

const CSS_MODULE_IMPORT_NAMES = new Set([
	'styles',
	'classes',
	'css',
	'classNames',
]);

function looksLikeCssModuleImport(name) {
	// Common patterns: styles, componentStyles, alertHistoryStyles
	return (
		CSS_MODULE_IMPORT_NAMES.has(name) ||
		name.endsWith('Styles') ||
		name.endsWith('Classes') ||
		name.endsWith('Css')
	);
}

function isKebabCase(str) {
	return str.includes('-');
}

function isSnakeCase(str) {
	return str.includes('_');
}

export default {
	create(context) {
		return {
			MemberExpression(node) {
				// Only check bracket notation: styles['...']
				if (!node.computed) {
					return;
				}

				const object = node.object;
				if (object.type !== 'Identifier') {
					return;
				}

				// Check if this looks like a CSS module import
				if (!looksLikeCssModuleImport(object.name)) {
					return;
				}

				const property = node.property;

				// Dynamic access: styles[variable]
				if (property.type === 'Identifier') {
					context.report({
						node,
						message: `Dynamic CSS module access '${object.name}[${property.name}]' is risky. With 'camelCaseOnly' config, kebab-case keys don't exist. Use dot notation or verify the key exists.`,
					});
					return;
				}

				// Template literal: styles[\`...\`]
				if (property.type === 'TemplateLiteral') {
					context.report({
						node,
						message: `Template literal CSS module access is risky. With 'camelCaseOnly' config, kebab-case keys don't exist. Prefer dot notation.`,
					});
					return;
				}

				// Numeric / boolean / null literal: styles[0]. Not a class lookup; ignore.
				if (property.type === 'Literal' && typeof property.value !== 'string') {
					return;
				}

				// String literal: styles['...']
				if (property.type === 'Literal' && typeof property.value === 'string') {
					const className = property.value;

					// Kebab-case will definitely fail
					if (isKebabCase(className)) {
						context.report({
							node,
							message: `CSS module class '${className}' uses kebab-case which won't work with 'camelCaseOnly' config. Use '${object.name}.${toCamelCase(className)}' instead.`,
						});
						return;
					}

					// Snake_case is suspicious
					if (isSnakeCase(className)) {
						context.report({
							node,
							message: `CSS module class '${className}' uses snake_case which may not work as expected. Prefer camelCase: '${object.name}.${toCamelCase(className)}'.`,
						});
						return;
					}

					// Valid camelCase but using bracket notation - prefer dot
					if (/^[a-z][a-zA-Z0-9]*$/.test(className)) {
						context.report({
							node,
							message: `Prefer dot notation: '${object.name}.${className}' instead of '${object.name}['${className}']'.`,
						});
					}
					return;
				}

				// Catch-all for other dynamic expressions:
				//   styles['prefix' + suffix]   (BinaryExpression)
				//   styles[isActive && 'foo']   (LogicalExpression)
				//   styles[isActive ? 'a' : 'b'] (ConditionalExpression)
				//   styles[fn()]                (CallExpression)
				context.report({
					node,
					message: `Dynamic CSS module access on '${object.name}' is risky. With 'camelCaseOnly' config, kebab-case keys don't exist. Use dot notation or verify each key resolves to an exported camelCase class.`,
				});
			},
		};
	},
};

function toCamelCase(str) {
	return str
		.split(/[-_]/)
		.map((part, i) =>
			i === 0
				? part.toLowerCase()
				: part.charAt(0).toUpperCase() + part.slice(1).toLowerCase(),
		)
		.join('');
}
