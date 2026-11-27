/**
 * Rule: require-disable-reason
 *
 * A disable directive that names one of RULES must say why after `--`:
 *   // oxlint-disable-next-line signoz/no-text-css -- canvas text, not DOM
 *
 * Directives that disable every rule are not checked.
 */

const RULES = new Set(['signoz/no-text-css']);

const DIRECTIVE = /^\s*(?:eslint|oxlint)-disable(?:-next-line|-line)?\s+(.*)$/s;

export default {
	create(context) {
		return {
			Program() {
				for (const comment of context.sourceCode.getAllComments()) {
					const match = comment.value.match(DIRECTIVE);
					if (!match) {
						continue;
					}
					const [rules, reason] = match[1].split(/\s--\s?/);
					const named = rules
						.split(',')
						.map((rule) => rule.trim())
						.filter((rule) => RULES.has(rule));
					if (named.length > 0 && !reason?.trim()) {
						context.report({
							node: comment,
							message: `Disabling ${named.join(', ')} needs a reason after \`--\`.`,
						});
					}
				}
			},
		};
	},
};
