/**
 * Stylelint rule: local/no-id-selectors
 *
 * Prevents ID selectors in CSS modules.
 * IDs create high specificity, can't be reused, and defeat CSS modules scoping purpose.
 *
 * BAD:
 *   #myComponent { }
 *   .container #header { }
 *
 * GOOD:
 *   .myComponent { }
 *   .containerHeader { }
 */
import stylelint from 'stylelint';

const ruleName = 'local/no-id-selectors';

const messages = stylelint.utils.ruleMessages(ruleName, {
	unexpected: (selector) =>
		`ID selector "${selector}" not allowed in CSS modules. Use class selector instead.`,
});

const ID_PATTERN = /#[a-zA-Z_][a-zA-Z0-9_-]*/g;

const rule = (primaryOption) => {
	return (root, result) => {
		if (!primaryOption) {
			return;
		}

		root.walkRules((ruleNode) => {
			const selector = ruleNode.selector;
			const matches = selector.match(ID_PATTERN);

			if (matches) {
				for (const match of matches) {
					stylelint.utils.report({
						message: messages.unexpected(match),
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
