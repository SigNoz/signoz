/**
 * Stylelint rule: local/no-bare-element-selectors
 *
 * Prevents bare element selectors at root level in CSS modules.
 * Bare elements affect ALL instances of that element within component scope,
 * often unintentionally.
 *
 * BAD:
 *   div { }
 *   span { padding: 4px; }
 *   p { margin: 0; }
 *
 * GOOD:
 *   .container { }
 *   .title { }
 *
 * ALLOWED (nested under class):
 *   .container {
 *     p { margin: 0; }  // Scoped to .container
 *   }
 */
import stylelint from 'stylelint';

const ruleName = 'local/no-bare-element-selectors';

const messages = stylelint.utils.ruleMessages(ruleName, {
	unexpected: (element) =>
		`Bare element selector "${element}" at root level affects all instances. Use class selector or nest under a class.`,
	unexpectedInCompound: (element, full) =>
		`Bare element "${element}" in unscoped selector "${full}" at root level matches every "<${element}>" in the module. Anchor the selector with a class (e.g., ".container ${element}") or use :global() if intentional.`,
});

const ELEMENT_PATTERN = /^[a-z][a-z0-9]*$/i;
const EXCLUDED_ELEMENTS = new Set(['html', 'body', 'root']);

function isPartBareElement(part) {
	const trimmed = part.trim();
	if (!trimmed) {
		return false;
	}
	// Strip pseudo suffixes (`:hover`, `::before`) — element part is what's before
	const elementOnly = trimmed.split(':')[0];
	if (!elementOnly) {
		return false;
	}
	// Skip class/id/attribute parts
	if (/[.#[]/.test(elementOnly)) {
		return false;
	}
	return (
		ELEMENT_PATTERN.test(elementOnly) &&
		!EXCLUDED_ELEMENTS.has(elementOnly.toLowerCase())
	);
}

function isBareElement(selector) {
	const trimmed = selector.trim();
	// Skip combined selectors
	if (/[,\s>+~]/.test(trimmed)) {
		return false;
	}
	// Skip pseudo-selectors
	if (trimmed.includes(':')) {
		return false;
	}
	// Skip class/id/attribute selectors
	if (/[.#[]/.test(trimmed)) {
		return false;
	}
	return (
		ELEMENT_PATTERN.test(trimmed) && !EXCLUDED_ELEMENTS.has(trimmed.toLowerCase())
	);
}

// Split a compound selector on combinators (`>`, `+`, `~`, descendant space)
// while keeping each part intact. Returns an array of selector parts.
function splitOnCombinators(selector) {
	return selector
		.split(/\s*[>+~]\s*|\s+/)
		.map((p) => p.trim())
		.filter(Boolean);
}

function isInsideGlobal(selector) {
	return /:global\s*\(/.test(selector);
}

const KEYFRAME_ATRULES = new Set([
	'keyframes',
	'-webkit-keyframes',
	'-moz-keyframes',
	'-o-keyframes',
]);

// Rule's effective parent is root if all ancestors above it are atrules
// (e.g. `@media`, `@supports`). A bare `div` inside `@media { }` at top level
// still matches every `<div>` in the module. Exclude `@keyframes` — its
// `from`/`to`/`0%` children are not element selectors.
function isEffectivelyTopLevel(node) {
	let parent = node.parent;
	while (parent && parent.type === 'atrule') {
		if (KEYFRAME_ATRULES.has(parent.name.toLowerCase())) {
			return false;
		}
		parent = parent.parent;
	}
	return Boolean(parent) && parent.type === 'root';
}

const rule = (primaryOption) => {
	return (root, result) => {
		if (!primaryOption) {
			return;
		}

		root.walkRules((ruleNode) => {
			if (!isEffectivelyTopLevel(ruleNode)) {
				return;
			}

			const selectors = ruleNode.selector.split(',').map((s) => s.trim());

			for (const selector of selectors) {
				if (isInsideGlobal(selector)) {
					continue;
				}

				if (isBareElement(selector)) {
					stylelint.utils.report({
						message: messages.unexpected(selector),
						node: ruleNode,
						result,
						ruleName,
					});
					continue;
				}

				// Check combined selectors part-by-part. Only flag when the compound
				// has NO class/id anchor — `.container > div` is already scoped, but
				// `div + span` at root affects every matching descendant in the module.
				if (/[\s>+~]/.test(selector) && !/[.#]/.test(selector)) {
					const parts = splitOnCombinators(selector);
					for (const part of parts) {
						if (isPartBareElement(part)) {
							stylelint.utils.report({
								message: messages.unexpectedInCompound(part.split(':')[0], selector),
								node: ruleNode,
								result,
								ruleName,
							});
						}
					}
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
