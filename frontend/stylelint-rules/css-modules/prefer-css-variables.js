/**
 * Stylelint rule: local/prefer-css-variables
 *
 * Warns on hardcoded colors in CSS modules.
 * Use CSS variables for consistent theming.
 *
 * BAD:
 *   color: #ff0000;
 *   background: rgb(255, 0, 0);
 *   border: 1px solid blue;
 *
 * GOOD:
 *   color: var(--l1-foreground);
 *   background: var(--primary-background);
 *   border: 1px solid var(--l2-border);
 *
 * ALLOWED:
 *   transparent, inherit, currentColor, none
 *   Colors inside var() fallbacks
 */
import stylelint from 'stylelint';

const ruleName = 'local/prefer-css-variables';

const messages = stylelint.utils.ruleMessages(ruleName, {
	hardcodedColor: (value, property) =>
		`Hardcoded color "${value}" in "${property}". Use a semantic CSS variable instead (e.g., var(--l1-foreground), var(--primary-background)). See docs/css-modules-guide.md.`,
});

const COLOR_PROPERTIES = new Set([
	'color',
	'background',
	'background-color',
	'background-image',
	'border',
	'border-color',
	'border-top',
	'border-right',
	'border-bottom',
	'border-left',
	'border-top-color',
	'border-right-color',
	'border-bottom-color',
	'border-left-color',
	'border-image',
	'border-image-source',
	'outline',
	'outline-color',
	'box-shadow',
	'text-shadow',
	'fill',
	'stroke',
	'caret-color',
	'text-decoration-color',
	'column-rule-color',
	'mask',
	'mask-image',
]);

const ALLOWED_VALUES = new Set([
	'transparent',
	'inherit',
	'initial',
	'unset',
	'currentcolor',
	'none',
	'auto',
]);

const HEX_PATTERN = /#[0-9a-fA-F]{3,8}\b/;
const RGB_PATTERN = /rgba?\s*\([^)]+\)/i;
const HSL_PATTERN = /hsla?\s*\([^)]+\)/i;
const NAMED_COLOR_PATTERN =
	/\b(red|blue|green|yellow|orange|purple|pink|black|white|gray|grey|cyan|magenta|brown|navy|teal|olive|maroon|lime|aqua|fuchsia|silver)\b/i;

// Strip balanced `fn(...)` sections (e.g. `var(...)`, `url(...)`) from value.
// Handles nested parens by counting depth.
function stripBalancedFn(value, fnName) {
	const needle = `${fnName}(`;
	let out = '';
	let i = 0;
	while (i < value.length) {
		if (value.startsWith(needle, i)) {
			let depth = 1;
			i += needle.length;
			while (i < value.length && depth > 0) {
				const ch = value[i];
				if (ch === '(') {
					depth++;
				} else if (ch === ')') {
					depth--;
				}
				i++;
			}
		} else {
			out += value[i];
			i++;
		}
	}
	return out;
}

function containsHardcodedColor(value) {
	// Strip url(...) first — paths/fragments may contain hex-like or color-named substrings
	let scanned = value.includes('url(') ? stripBalancedFn(value, 'url') : value;

	// Strip var(...) — color tokens inside var fallbacks are allowed
	if (scanned.includes('var(')) {
		scanned = stripBalancedFn(scanned, 'var');
		if (!scanned.trim()) {
			return null;
		}
	}

	const lower = scanned.toLowerCase();
	if (ALLOWED_VALUES.has(lower)) {
		return null;
	}

	if (HEX_PATTERN.test(scanned)) {
		return scanned.match(HEX_PATTERN)[0];
	}
	if (RGB_PATTERN.test(scanned)) {
		return scanned.match(RGB_PATTERN)[0];
	}
	if (HSL_PATTERN.test(scanned)) {
		return scanned.match(HSL_PATTERN)[0];
	}
	if (NAMED_COLOR_PATTERN.test(scanned)) {
		return scanned.match(NAMED_COLOR_PATTERN)[0];
	}

	return null;
}

const rule = (primaryOption) => {
	return (root, result) => {
		if (!primaryOption) {
			return;
		}

		root.walkDecls((decl) => {
			const prop = decl.prop.toLowerCase();

			if (!COLOR_PROPERTIES.has(prop)) {
				return;
			}

			const hardcodedColor = containsHardcodedColor(decl.value);

			if (hardcodedColor) {
				stylelint.utils.report({
					message: messages.hardcodedColor(hardcodedColor, decl.prop),
					node: decl,
					result,
					ruleName,
				});
			}
		});
	};
};

rule.ruleName = ruleName;
rule.messages = messages;
rule.meta = {};

export { ruleName, rule };
export default { ruleName, rule };
