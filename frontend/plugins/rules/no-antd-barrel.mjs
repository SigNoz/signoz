/**
 * Rule: no-antd-barrel
 *
 * Forbids importing from the `antd` barrel and requires the matching
 * `antd/es/<component>` subpath instead.
 *
 * This rule catches:
 *   import { Tooltip } from 'antd'
 *   import { Button, Modal } from 'antd'
 *   import { theme as antdTheme } from 'antd'
 *
 * And expects:
 *   import Tooltip from 'antd/es/tooltip'
 *   import Button from 'antd/es/button'
 *   import antdTheme from 'antd/es/theme'
 *
 * Why: `antd/es/index.js` re-exports every component, and a re-export cannot be
 * erased by type elision the way an unused named import can, so one `Tooltip`
 * import loads all ~536 antd modules. Measured on the jest suite, five files on
 * the `tests/test-utils` path were responsible for the whole antd subtree;
 * converting just those cut per-file import cost 33%.
 *
 * Type-only imports are exempt: `import type { ThemeConfig } from 'antd'` is
 * erased before the module is ever requested.
 */

const SUBPATH_OVERRIDES = {
	theme: 'theme',
	message: 'message',
	notification: 'notification',
	ConfigProvider: 'config-provider',
	FloatButton: 'float-button',
	AutoComplete: 'auto-complete',
	BackTop: 'back-top',
	ColorPicker: 'color-picker',
	DatePicker: 'date-picker',
	InputNumber: 'input-number',
	TimePicker: 'time-picker',
	TreeSelect: 'tree-select',
	QRCode: 'qr-code',
};

function toSubpath(name) {
	if (SUBPATH_OVERRIDES[name]) return SUBPATH_OVERRIDES[name];
	// Components are PascalCase and live at the kebab-case path.
	if (!/^[A-Z]/.test(name)) return null;
	return name
		.replace(/([a-z0-9])([A-Z])/g, '$1-$2')
		.replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
		.toLowerCase();
}

function buildReplacement(node) {
	const quote = node.source.raw?.[0] === '"' ? '"' : "'";
	const lines = [];

	for (const spec of node.specifiers) {
		if (spec.type !== 'ImportSpecifier') return null;
		if (spec.imported?.type !== 'Identifier') return null;

		const subpath = toSubpath(spec.imported.name);
		if (!subpath) return null;

		// An inline `type` specifier keeps its name; it is erased either way.
		const keyword = spec.importKind === 'type' ? 'import type' : 'import';
		lines.push(
			`${keyword} ${spec.local.name} from ${quote}antd/es/${subpath}${quote};`,
		);
	}

	return lines.length ? lines.join('\n') : null;
}

export default {
	meta: {
		fixable: 'code',
	},
	create(context) {
		return {
			ImportDeclaration(node) {
				if (node.source.value !== 'antd') return;
				if (node.importKind === 'type') return;
				if (node.specifiers.length === 0) return;

				const replacement = buildReplacement(node);
				const report = {
					node: node.source,
					message:
						"Do not import from the 'antd' barrel. Use the matching subpath instead (e.g. 'antd/es/tooltip', 'antd/es/button'). The barrel re-exports every component, so one named import loads all ~536 antd modules and slows every test that reaches this file.",
				};
				if (replacement) {
					report.fix = (fixer) => fixer.replaceText(node, replacement);
				}
				context.report(report);
			},
		};
	},
};
