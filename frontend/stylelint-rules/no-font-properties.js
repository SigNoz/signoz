/**
 * Stylelint rule: local/no-font-properties
 *
 * Bans direct font/text CSS properties with hardcoded values.
 * Use Typography component from @signozhq/ui or design tokens.
 *
 * BAD:
 *   font-family: Arial;
 *   font-weight: bold;
 *   font-size: 14px;
 *   line-height: 1.5;
 *   letter-spacing: 1px;
 *
 * GOOD (prefer Typography component):
 *   <Typography size="base" weight="medium">Text</Typography>
 *
 * GOOD (CSS tokens when Typography not applicable):
 *   font-size: var(--font-size-base);
 *   font-weight: var(--font-weight-medium);
 *   line-height: var(--line-height-normal);
 *   letter-spacing: var(--letter-spacing-normal);
 *
 * Available tokens from @signozhq/design-tokens:
 *   --font-size-{xs,sm,base,lg,xl,2xl...9xl}
 *   --font-weight-{thin,extralight,light,normal,medium,semibold,bold,extrabold,black}
 *   --line-height-{none,tight,snug,normal,relaxed,loose}
 *   --letter-spacing-{tighter,tight,normal,wide,wider}
 *   --periscope-font-size-{small,base,medium,large}
 */
import stylelint from 'stylelint';

const ruleName = 'local/no-font-properties';

const messages = stylelint.utils.ruleMessages(ruleName, {
	banned: (property) =>
		`Direct '${property}' with hardcoded value is banned. Use Typography component or design tokens (--font-size-*, --font-weight-*, --line-height-*, --letter-spacing-*).`,
});

const BANNED_PROPERTIES = new Set([
	'font-family',
	'font-weight',
	'font-size',
	'font-style',
	'font',
	'text-transform',
	'text-decoration',
	'letter-spacing',
	'line-height',
	'word-spacing',
	'text-indent',
]);

// Allow if value uses CSS variable tokens
function usesDesignToken(value) {
	return /var\s*\(\s*--/.test(value);
}

// Allow inherit/initial/unset
function isAllowedValue(value) {
	const lower = value.toLowerCase().trim();
	return ['inherit', 'initial', 'unset', 'normal', 'none'].includes(lower);
}

const rule = (primaryOption) => {
	return (root, result) => {
		if (!primaryOption) {
			return;
		}

		root.walkDecls((decl) => {
			const prop = decl.prop.toLowerCase();

			if (!BANNED_PROPERTIES.has(prop)) {
				return;
			}

			// Allow if using design tokens or allowed values
			if (usesDesignToken(decl.value) || isAllowedValue(decl.value)) {
				return;
			}

			stylelint.utils.report({
				message: messages.banned(decl.prop),
				node: decl,
				result,
				ruleName,
			});
		});
	};
};

rule.ruleName = ruleName;
rule.messages = messages;
rule.meta = {};

export { ruleName, rule };
export default { ruleName, rule };
