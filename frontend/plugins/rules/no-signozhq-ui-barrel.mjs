/**
 * Rule: no-signozhq-ui-barrel
 *
 * Forbids importing from the `@signozhq/ui` barrel and requires the matching
 * subpath instead.
 *
 * This rule catches:
 *   import { Typography } from '@signozhq/ui'
 *   import { Button, toast } from '@signozhq/ui'
 *   import '@signozhq/ui'
 *
 * And expects:
 *   import { Typography } from '@signozhq/ui/typography'
 *   import { Button } from '@signozhq/ui/button'
 *   import { toast } from '@signozhq/ui/sonner'
 *
 * Why: the barrel eagerly require()s every component (~90 of them) along with
 * their Radix/cmdk/motion/react-day-picker dependencies. Under Jest this caused
 * 5s timeouts and flaky tests after the Antd→@signozhq/ui Typography migration
 * (#11199). Subpath imports (added in @signozhq/ui@0.0.18) load only what's
 * used.
 *
 * The auto-generated `auto-import-registry.d.ts` is a pure declaration file
 * that exists solely to nudge VS Code's auto-import indexer; its bare
 * `import '@signozhq/ui';` is type-only and not emitted, so it is exempt.
 */

const ALLOWED_FILES = new Set(['auto-import-registry.d.ts']);

export default {
	create(context) {
		const filename = context.filename || '';
		// path-agnostic basename check — works whether we get an absolute path
		// or a project-relative one.
		const basename = filename.split(/[\\/]/).pop();
		if (ALLOWED_FILES.has(basename)) {
			return {};
		}

		return {
			ImportDeclaration(node) {
				if (node.source.value !== '@signozhq/ui') {
					return;
				}

				context.report({
					node: node.source,
					message:
						"Do not import from the '@signozhq/ui' barrel. Use the matching subpath instead (e.g. '@signozhq/ui/typography', '@signozhq/ui/button', '@signozhq/ui/sonner'). The barrel eagerly loads ~90 components and slows tests substantially.",
				});
			},
		};
	},
};
