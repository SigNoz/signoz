'use strict';

/**
 * ESLint rule: prefer-signoz-ui-icons
 *
 * Warn when UI components/icons are imported from non-design-system packages.
 * Current governance:
 * - Use @signozhq/ui for UI primitives.
 * - Use @signozhq/icons for icons.
 */
module.exports = {
	meta: {
		type: 'suggestion',
		docs: {
			description:
				'Prefer @signozhq/ui and @signozhq/icons over external UI/icon packages',
			category: 'Design System',
			recommended: false,
		},
		schema: [],
		messages: {
			preferSignozUi:
				'Import UI components from "@signozhq/ui" instead of "{{ source }}".',
			preferSignozIcons:
				'Import icons from "@signozhq/icons" instead of "{{ source }}".',
		},
	},

	create(context) {
		return {
			ImportDeclaration(node) {
				const source = node.source && node.source.value;
				if (typeof source !== 'string') {
					return;
				}

				if (source === 'antd') {
					context.report({
						node,
						messageId: 'preferSignozUi',
						data: { source },
					});
					return;
				}

				if (source === '@ant-design/icons') {
					context.report({
						node,
						messageId: 'preferSignozIcons',
						data: { source },
					});
				}
			},
		};
	},
};
