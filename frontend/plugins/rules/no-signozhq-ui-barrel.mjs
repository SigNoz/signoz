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
 *
 * Autofix:
 *   Rewrites named imports to the matching subpath, splitting one statement
 *   into multiple when specifiers come from different subpaths. The
 *   export-name → subpath map is derived lazily from the installed
 *   `@signozhq/ui` dist `.d.ts` files. Imports we can't classify (namespace,
 *   default, side-effect, or unknown specifier) are reported without a fix.
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ALLOWED_FILES = new Set(['auto-import-registry.d.ts']);

const PLUGIN_DIR = dirname(fileURLToPath(import.meta.url));

let exportMap = null;

function loadExportMap() {
	if (exportMap === null) {
		exportMap = buildExportMap();
	}
	return exportMap;
}

function buildExportMap() {
	const map = new Map();
	const root = findSignozUiRoot();
	if (!root) return map;

	let pkg;
	try {
		pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf-8'));
	} catch {
		return map;
	}

	const subpathKeys = Object.keys(pkg.exports || {}).filter((k) => k !== '.');
	for (const key of subpathKeys) {
		const subpath = key.replace(/^\.\//, '');
		const entry = join(root, 'dist', subpath, 'index.d.ts');
		if (!existsSync(entry)) continue;

		const names = new Set();
		collectExportedNames(entry, names, new Set());
		// First-wins: package.json subpath order is the canonical home for
		// names re-exported across multiple subpaths (e.g. `ToggleColor` is
		// declared in `toggle` and re-exported from `toggle-group`).
		for (const name of names) {
			if (!map.has(name)) map.set(name, subpath);
		}
	}

	return map;
}

function findSignozUiRoot() {
	let dir = PLUGIN_DIR;
	while (true) {
		const candidate = join(dir, 'node_modules', '@signozhq', 'ui');
		if (existsSync(join(candidate, 'package.json'))) return candidate;
		const parent = dirname(dir);
		if (parent === dir) return null;
		dir = parent;
	}
}

function collectExportedNames(filepath, out, visited) {
	if (visited.has(filepath) || !existsSync(filepath)) return;
	visited.add(filepath);

	let content;
	try {
		content = readFileSync(filepath, 'utf-8');
	} catch {
		return;
	}

	// `export * from './x.js'` / `export type * from './x.js'`
	for (const m of content.matchAll(
		/export\s+(?:type\s+)?\*\s+from\s+['"]([^'"]+)['"]/g,
	)) {
		collectExportedNames(resolveRelativeDts(filepath, m[1]), out, visited);
	}

	// `export { Foo, type Bar, Foo as Baz } from '...';` and `export { ... };`
	for (const m of content.matchAll(/export\s+(?:type\s+)?\{([^}]*)\}/g)) {
		for (const item of m[1].split(',')) {
			const cleaned = item.trim().replace(/^type\s+/, '');
			if (!cleaned) continue;
			const idMatch = cleaned.match(
				/^([A-Za-z_$][A-Za-z0-9_$]*)(?:\s+as\s+([A-Za-z_$][A-Za-z0-9_$]*))?$/,
			);
			if (idMatch) out.add(idMatch[2] || idMatch[1]);
		}
	}

	// `export (declare) const|let|var|function|class|enum|type|interface Foo`
	for (const m of content.matchAll(
		/export\s+(?:declare\s+)?(?:const|let|var|function|class|enum|type|interface)\s+([A-Za-z_$][A-Za-z0-9_$]*)/g,
	)) {
		out.add(m[1]);
	}
}

function resolveRelativeDts(fromFile, spec) {
	const base = dirname(fromFile);
	const stripped = spec.replace(/\.(js|mjs|cjs)$/, '');
	const sibling = join(base, `${stripped}.d.ts`);
	if (existsSync(sibling)) return sibling;
	const indexed = join(base, stripped, 'index.d.ts');
	if (existsSync(indexed)) return indexed;
	return sibling;
}

function buildReplacement(node, map) {
	const specifiers = node.specifiers || [];
	if (specifiers.length === 0) return null;

	for (const spec of specifiers) {
		if (spec.type !== 'ImportSpecifier') return null;
		if (spec.imported?.type !== 'Identifier') return null;
	}

	const quote = node.source.raw?.[0] === '"' ? '"' : "'";
	const topLevelType = node.importKind === 'type';
	const keyword = topLevelType ? 'import type' : 'import';

	const groups = new Map();
	for (const spec of specifiers) {
		const importedName = spec.imported.name;
		const subpath = map.get(importedName);
		if (!subpath) return null;

		const localName = spec.local.name;
		const inlineType = !topLevelType && spec.importKind === 'type';
		let text = inlineType ? 'type ' : '';
		text += importedName;
		if (localName !== importedName) text += ` as ${localName}`;

		if (!groups.has(subpath)) groups.set(subpath, []);
		groups.get(subpath).push(text);
	}

	const lines = [];
	for (const [subpath, items] of groups) {
		lines.push(
			`${keyword} { ${items.join(', ')} } from ${quote}@signozhq/ui/${subpath}${quote};`,
		);
	}
	return lines.join('\n');
}

export default {
	meta: {
		fixable: 'code',
	},
	create(context) {
		const filename = context.filename || '';
		const basename = filename.split(/[\\/]/).pop();
		if (ALLOWED_FILES.has(basename)) {
			return {};
		}

		return {
			ImportDeclaration(node) {
				if (node.source.value !== '@signozhq/ui') {
					return;
				}

				const replacement = buildReplacement(node, loadExportMap());
				const report = {
					node: node.source,
					message:
						"Do not import from the '@signozhq/ui' barrel. Use the matching subpath instead (e.g. '@signozhq/ui/typography', '@signozhq/ui/button', '@signozhq/ui/sonner'). The barrel eagerly loads ~90 components and slows tests substantially.",
				};
				if (replacement) {
					report.fix = (fixer) => fixer.replaceText(node, replacement);
				}
				context.report(report);
			},
		};
	},
};
