/**
 * Stylelint rule: local/no-deep-nesting
 *
 * Prevents deep nesting in CSS modules (max 3 levels).
 * Deep nesting creates specificity wars and hard-to-override styles.
 *
 * BAD:
 *   .container { .wrapper { .inner { .content { } } } }  // 4 levels
 *
 * GOOD:
 *   .container { }
 *   .containerWrapper { }
 *   .containerContent { }
 *
 * Allowed nesting (pseudo-classes/elements):
 *   .button { &:hover { } &::before { } }
 */
import stylelint from 'stylelint';

const ruleName = 'local/no-deep-nesting';
const DEFAULT_MAX_DEPTH = 3;

const messages = stylelint.utils.ruleMessages(ruleName, {
	tooDeep: (depth, max) =>
		`Nesting depth ${depth} exceeds maximum of ${max}. Flatten selectors for CSS modules.`,
});

function isPseudoSelector(selector) {
	return /^&?:/.test(selector.trim());
}

function isParentReference(selector) {
	return /^&[.#[]/.test(selector.trim());
}

function countNestingDepth(rule, depth = 0) {
	const selector = rule.selector || '';

	// Don't count pseudo-selectors or parent references toward depth
	if (isPseudoSelector(selector) || isParentReference(selector)) {
		// Still check children
		let maxChildDepth = depth;
		rule.walkRules?.((child) => {
			const childDepth = countNestingDepth(child, depth);
			maxChildDepth = Math.max(maxChildDepth, childDepth);
		});
		return maxChildDepth;
	}

	const currentDepth = depth + 1;
	let maxDepth = currentDepth;

	rule.walkRules?.((child) => {
		const childDepth = countNestingDepth(child, currentDepth);
		maxDepth = Math.max(maxDepth, childDepth);
	});

	return maxDepth;
}

const rule = (primaryOption, secondaryOptions) => {
	return (root, result) => {
		if (!primaryOption) {
			return;
		}

		const maxDepth =
			secondaryOptions && Number.isInteger(secondaryOptions.maxDepth)
				? secondaryOptions.maxDepth
				: DEFAULT_MAX_DEPTH;

		root.walkRules((ruleNode) => {
			// Only check top-level rules
			if (ruleNode.parent.type !== 'root' && ruleNode.parent.type !== 'atrule') {
				return;
			}

			const depth = countNestingDepth(ruleNode);

			if (depth > maxDepth) {
				stylelint.utils.report({
					message: messages.tooDeep(depth, maxDepth),
					node: ruleNode,
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
