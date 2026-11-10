/**
 * Stylelint rule: local/class-name-pattern
 *
 * Enforces camelCase class names in CSS modules.
 * With Vite's `localsConvention: 'camelCaseOnly'`, kebab-case is converted but
 * using camelCase directly avoids confusion.
 *
 * BAD:
 *   .my-class { }        // converted to myClass, but confusing
 *   .my_class { }        // converted to myClass, but confusing
 *   .MyClass { }         // PascalCase not conventional
 *
 * GOOD:
 *   .myClass { }
 *   .alertHistory { }
 *   .statsCard { }
 */
import stylelint from 'stylelint';

const ruleName = 'local/class-name-pattern';

const messages = stylelint.utils.ruleMessages(ruleName, {
	kebabCase: (className) =>
		`Class "${className}" is not on camelCase. Use instead: "${toCamelCase(className)}".`,
	snakeCase: (className) =>
		`Class "${className}" is not on camelCase. Use instead: "${toCamelCase(className)}".`,
	pascalCase: (className) =>
		`Class "${className}" is not on camelCase. Use instead: "${className.charAt(0).toLowerCase() + className.slice(1)}".`,
});

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

function isKebabCase(str) {
	return str.includes('-');
}

function isSnakeCase(str) {
	return str.includes('_');
}

function isPascalCase(str) {
	return /^[A-Z][a-zA-Z0-9]*$/.test(str);
}

const CLASS_PATTERN = /\.([a-zA-Z_][a-zA-Z0-9_-]*)/g;

const DEFAULT_THIRD_PARTY_PREFIXES = [
	'ant-', // Ant Design
	'rc-', // rc-components (Ant Design internals)
	'recharts-', // Recharts
	'uplot-', // uPlot
	'u-', // uPlot legacy
	'leaflet-', // Leaflet
	'monaco-', // Monaco editor
	'react-resizable', // react-resizable
	'cm-', // CodeMirror
];

// Bare `:global { ... }` block (no parens) makes all descendants global.
// `:global(.foo)` is a per-selector escape — handled separately by globalRanges().
function hasBareGlobalAncestor(node) {
	let current = node.parent;
	while (current) {
		const selector = current.selector;
		if (selector && /:global(?!\s*\()/.test(selector)) {
			return true;
		}
		current = current.parent;
	}
	return false;
}

// Return list of [start, end) index ranges inside `selector` that fall within a
// balanced `:global(...)` argument list. Class matches inside these ranges are
// third-party and should be skipped.
function globalRanges(selector) {
	const ranges = [];
	const re = /:global\s*\(/g;
	let match;
	while ((match = re.exec(selector)) !== null) {
		const argStart = match.index + match[0].length;
		let depth = 1;
		let i = argStart;
		while (i < selector.length && depth > 0) {
			const ch = selector[i];
			if (ch === '(') {
				depth++;
			} else if (ch === ')') {
				depth--;
			}
			if (depth > 0) {
				i++;
			}
		}
		ranges.push([argStart, i]);
		re.lastIndex = i;
	}
	return ranges;
}

function indexInRanges(index, ranges) {
	for (const [start, end] of ranges) {
		if (index >= start && index < end) {
			return true;
		}
	}
	return false;
}

const rule = (primaryOption, secondaryOptions) => {
	return (root, result) => {
		if (!primaryOption) {
			return;
		}

		const userPrefixes =
			(secondaryOptions && secondaryOptions.ignoreThirdPartyPrefixes) || [];
		const allPrefixes = [...DEFAULT_THIRD_PARTY_PREFIXES, ...userPrefixes];

		root.walkRules((ruleNode) => {
			const selector = ruleNode.selector;

			// Bare `:global { }` block makes all descendants global — skip entirely.
			if (hasBareGlobalAncestor(ruleNode)) {
				return;
			}

			const ranges = globalRanges(selector);

			let match;
			CLASS_PATTERN.lastIndex = 0;

			while ((match = CLASS_PATTERN.exec(selector)) !== null) {
				const className = match[1];
				// Skip classes inside `:global(...)` ranges of this selector.
				if (indexInRanges(match.index, ranges)) {
					continue;
				}

				// Skip third-party library classes
				if (allPrefixes.some((prefix) => className.startsWith(prefix))) {
					continue;
				}

				if (isKebabCase(className)) {
					stylelint.utils.report({
						message: messages.kebabCase(className),
						node: ruleNode,
						result,
						ruleName,
					});
				} else if (isSnakeCase(className)) {
					stylelint.utils.report({
						message: messages.snakeCase(className),
						node: ruleNode,
						result,
						ruleName,
					});
				} else if (isPascalCase(className)) {
					stylelint.utils.report({
						message: messages.pascalCase(className),
						node: ruleNode,
						result,
						ruleName,
					});
				}
			}
		});
	};
};

rule.ruleName = ruleName;
rule.messages = messages;
rule.meta = {};

export { ruleName, rule };
export default { ruleName, rule };
