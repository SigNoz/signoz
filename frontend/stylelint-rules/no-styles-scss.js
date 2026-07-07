/**
 * Stylelint rule: local/no-styles-scss
 *
 * Bans files named styles.scss (non-module).
 * Use .module.scss for CSS modules instead.
 *
 * BAD:
 *   styles.scss
 *   Component.styles.scss
 *
 * GOOD:
 *   Component.module.scss
 *   styles.module.scss
 */
import stylelint from 'stylelint';
import path from 'path';

const ruleName = 'local/no-styles-scss';

const messages = stylelint.utils.ruleMessages(ruleName, {
	banned: (filename) =>
		`Non-module SCSS file '${filename}' is banned. Use .module.scss for CSS modules instead.`,
});

const rule = (primaryOption) => {
	return (root, result) => {
		if (!primaryOption) {
			return;
		}

		const filename = result.opts?.from;
		if (!filename) {
			return;
		}

		const basename = path.basename(filename);

		// Check if it's a non-module styles.scss file
		if (
			basename.endsWith('.scss') &&
			!basename.endsWith('.module.scss') &&
			(basename === 'styles.scss' || basename.includes('.styles.scss'))
		) {
			stylelint.utils.report({
				message: messages.banned(basename),
				node: root,
				result,
				ruleName,
			});
		}
	};
};

rule.ruleName = ruleName;
rule.messages = messages;
rule.meta = {};

export { ruleName, rule };
export default { ruleName, rule };
