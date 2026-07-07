/**
 * Stylelint rule: local/no-primitive-color-tokens
 *
 * Bans primitive color tokens from @signozhq/design-tokens.
 * Use semantic tokens instead.
 *
 * PRIMITIVE (banned):
 *   --bg-robin-500, --bg-cherry-200, --bg-slate-400
 *   --text-robin-500, --text-vanilla-100
 *   --bg-gradient-coral, --text-gradient-dawn
 *   --bg-base-black, --text-base-white
 *
 * SEMANTIC (allowed):
 *   --l1-background, --l2-foreground, --l3-border
 *   --primary-*, --secondary-*, --accent-*
 *   --danger-*, --warning-*, --success-*
 *   --callout-*, --chart-*, --sidebar-*
 *
 * See docs/css-modules-guide.md for semantic token reference.
 */
import stylelint from 'stylelint';

const ruleName = 'local/no-primitive-color-tokens';

const messages = stylelint.utils.ruleMessages(ruleName, {
	primitiveToken: (token) =>
		`Primitive color token '${token}' is banned. Use semantic tokens (--l1-*, --l2-*, --l3-*, --accent-*, --primary-*, etc). See docs/css-modules-guide.md.`,
});

// Primitive color names from @signozhq/design-tokens
const PRIMITIVE_COLORS = [
	'robin',
	'sienna',
	'cherry',
	'aqua',
	'sakura',
	'amber',
	'forest',
	'ink',
	'vanilla',
	'slate',
	'neutraldark',
	'neutrallight',
	'base',
	'gradient',
];

// Matches: --bg-<color>-<number|name> or --text-<color>-<number|name>
// Examples: --bg-robin-500, --text-cherry-400, --bg-base-black, --bg-gradient-coral
const PRIMITIVE_TOKEN_PATTERN = new RegExp(
	`--(bg|text)-(${PRIMITIVE_COLORS.join('|')})-[a-z0-9-]+`,
	'gi',
);

const rule = (primaryOption) => {
	return (root, result) => {
		if (!primaryOption) {
			return;
		}

		root.walkDecls((decl) => {
			const value = decl.value;

			// Reset lastIndex for global regex
			PRIMITIVE_TOKEN_PATTERN.lastIndex = 0;

			const matches = value.match(PRIMITIVE_TOKEN_PATTERN);
			if (matches) {
				for (const token of matches) {
					stylelint.utils.report({
						message: messages.primitiveToken(token),
						node: decl,
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
