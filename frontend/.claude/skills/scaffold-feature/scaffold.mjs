#!/usr/bin/env node
import {
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	statSync,
	writeFileSync,
} from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
	routeKey,
	routeSpec,
	substitute,
	toCamel,
	toDirName,
	toKebab,
	toTitle,
	tokensFor,
} from './lib.mjs';

const SKILL_DIR = dirname(fileURLToPath(import.meta.url));
const TEMPLATES = join(SKILL_DIR, 'templates');
const FRONTEND = resolve(SKILL_DIR, '..', '..', '..');
const SRC = join(FRONTEND, 'src');

const ROUTE_FILES = {
	routes: join(SRC, 'constants', 'routes.ts'),
	permission: join(SRC, 'utils', 'permission', 'index.ts'),
	pageComponents: join(SRC, 'AppRoutes', 'pageComponents.ts'),
	appRoutes: join(SRC, 'AppRoutes', 'routes.ts'),
	topNav: join(SRC, 'container', 'TopNav', 'DateTimeSelectionV2', 'constants.ts'),
};
const ROUTE_ROLES = "['ADMIN', 'EDITOR', 'VIEWER']";

// Created empty, so the folder exists before it has a file to justify it.
const FEATURE_DIRS = ['components', 'hooks', 'store'];

const USAGE = `usage:
  pnpm scaffold page <Name> [--views A,B,C] [--no-tests] [--dry-run] [--force]
  pnpm scaffold component <Name> [--parent <path>] [--full] [--no-tests] [--dry-run] [--force]

examples:
  pnpm scaffold page ApiMonitoring
  pnpm scaffold page Traces --views Explorer,Funnels,Views
  pnpm scaffold page Traces/Explorer
  pnpm scaffold component DataTable
  pnpm scaffold component QueryBar --parent pages/Traces/Explorer`;

function fail(message) {
	process.stderr.write(`error: ${message}\n\n${USAGE}\n`);
	process.exit(1);
}

function expandEquals(argv) {
	return argv.flatMap((arg) =>
		arg.startsWith('--') && arg.includes('=')
			? [arg.slice(0, arg.indexOf('=')), arg.slice(arg.indexOf('=') + 1)]
			: [arg],
	);
}

function parseArgs(argv) {
	const flags = {
		views: [],
		parent: 'components',
		full: false,
		tests: true,
		dryRun: false,
		force: false,
	};
	const positional = [];
	const provided = new Set();

	for (let i = 0; i < argv.length; i += 1) {
		const arg = argv[i];
		provided.add(arg);
		if (arg === '--views' || arg === '--parent') {
			const value = argv[i + 1];
			if (!value || value.startsWith('--')) {
				fail(`${arg} needs a value`);
			}
			if (arg === '--views') {
				flags.views = value
					.split(',')
					.map((view) => view.trim())
					.filter(Boolean);
				if (!flags.views.length) {
					fail('--views needs at least one name');
				}
			} else {
				flags.parent = value;
			}
			i += 1;
		} else if (arg === '--full') {
			flags.full = true;
		} else if (arg === '--no-tests') {
			flags.tests = false;
		} else if (arg === '--dry-run') {
			flags.dryRun = true;
		} else if (arg === '--force') {
			flags.force = true;
		} else if (arg === '-h' || arg === '--help') {
			process.stdout.write(`${USAGE}\n`);
			process.exit(0);
		} else if (arg.startsWith('-')) {
			fail(`unknown option: ${arg}`);
		} else {
			positional.push(arg);
		}
	}

	return { positional, flags, provided };
}

const created = [];
const skipped = [];
let targetExisted = false;

function writeFile(target, contents, flags) {
	const rel = relative(FRONTEND, target);
	if (existsSync(target) && !flags.force) {
		skipped.push(rel);
		return;
	}
	if (!flags.dryRun) {
		mkdirSync(dirname(target), { recursive: true });
		writeFileSync(target, contents);
	}
	created.push(rel);
}

function createDirs(targetDir, dirs, flags) {
	for (const dir of dirs) {
		const target = join(targetDir, dir);
		const rel = `${relative(FRONTEND, target)}/`;
		if (existsSync(target)) {
			skipped.push(rel);
			continue;
		}
		if (!flags.dryRun) {
			mkdirSync(target, { recursive: true });
		}
		created.push(rel);
	}
}

// Template files carry a `.tmpl` suffix so no TypeScript, lint or editor tooling
// treats them as source; the suffix is dropped on the way out.
function renderTree(templateDir, targetDir, tokens, flags) {
	for (const entry of readdirSync(templateDir).sort()) {
		const from = join(templateDir, entry);
		const name = substitute(entry.replace(/\.tmpl$/, ''), tokens);
		if (statSync(from).isDirectory()) {
			if (!flags.tests && name === '__tests__') {
				continue;
			}
			renderTree(from, join(targetDir, name), tokens, flags);
		} else {
			writeFile(
				join(targetDir, name),
				substitute(readFileSync(from, 'utf8'), tokens),
				flags,
			);
		}
	}
}

// Icons for tab names the product already uses; anything else gets a neutral one.
const TAB_ICONS = {
	Explorer: 'Compass',
	Funnels: 'Cone',
	Pipelines: 'Workflow',
	SavedViews: 'TowerControl',
	Views: 'TowerControl',
};
const DEFAULT_TAB_ICON = 'LayoutPanelTop';

const tabIcon = (view) => TAB_ICONS[toDirName(view)] ?? DEFAULT_TAB_ICON;
const tabName = (view) => `${toCamel(view)}Tab`;

function shellTokens(segments, views) {
	const icons = [...new Set(views.map(tabIcon))].sort((a, b) => a.localeCompare(b));
	const viewImports = views
		.map((view) => `import ${toDirName(view)} from './${toDirName(view)}';`)
		.join('\n');
	const tabExports = views
		.map((view) => {
			const route = `ROUTES.${routeKey(segments, view)}`;
			return [
				`export const ${tabName(view)}: TabRoutes = {`,
				`\tComponent: ${toDirName(view)},`,
				'\tname: (',
				'\t\t<div className={styles.tabItem}>',
				`\t\t\t<${tabIcon(view)} size={16} /> ${toTitle(view)}`,
				'\t\t</div>',
				'\t),',
				`\troute: ${route},`,
				`\tkey: ${route},`,
				'};',
			].join('\n');
		})
		.join('\n\n');
	const tabAssertions = views
		.map(
			(view) =>
				`\t\texpect(screen.getByRole('tab', { name: '${toTitle(view)}' })).toBeInTheDocument();\n`,
		)
		.join('');
	return {
		__ICON_IMPORTS__: `import { ${icons.join(', ')} } from '@signozhq/icons';`,
		__VIEW_IMPORTS__: viewImports,
		__TAB_EXPORTS__: `${tabExports}\n`,
		__TAB_NAMES__: views.map(tabName).join(', '),
		__BASE_ROUTE__: `ROUTES.${routeKey(segments)}_BASE`,
		__FIRST_TAB__: tabName(views[0]),
		__FIRST_VIEW_TESTID__: `${toKebab(views[0])}-page`,
		__TAB_ASSERTIONS__: tabAssertions,
	};
}

const edited = [];

function insertBefore(source, anchor, text, rel, from = 0) {
	const index = source.indexOf(anchor, from);
	if (index === -1) {
		fail(`could not find \`${anchor.trim()}\` in ${rel}`);
	}
	return source.slice(0, index) + text + source.slice(index);
}

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// An existing key or export is only reused when it already means what the generator
// would have written; anything else is a naming collision and stops the run before
// any shared file is touched.
function assertSame(rel, what, existing, expected) {
	if (existing !== expected) {
		fail(
			`${what} already exists in ${rel} as ${existing}, expected ${expected} — ` +
				'pick another name',
		);
	}
}

function planRoutes({ component, keys, routed }) {
	return [
		{
			file: ROUTE_FILES.routes,
			transform: (source, rel) => {
				const added = keys.filter(({ key, path }) => {
					const match = source.match(new RegExp(`\\n\\t${key}: '([^']*)',`));
					if (match) {
						assertSame(rel, `ROUTES.${key}`, `'${match[1]}'`, `'${path}'`);
					}
					return !match;
				});
				const text = added.map(({ key, path }) => `\n\t${key}: '${path}',`).join('');
				return {
					source: insertBefore(source, '\n} as const;', text, rel),
					added: added.map(({ key }) => key),
				};
			},
		},
		{
			file: ROUTE_FILES.permission,
			transform: (source, rel) => {
				const start = source.indexOf('export const routePermission');
				if (start === -1) {
					fail(`could not find \`routePermission\` in ${rel}`);
				}
				const added = keys
					.map(({ key }) => key)
					.filter((key) => !source.includes(`\n\t${key}: `));
				const text = added.map((key) => `\n\t${key}: ${ROUTE_ROLES},`).join('');
				return { source: insertBefore(source, '\n};', text, rel, start), added };
			},
		},
		{
			file: ROUTE_FILES.pageComponents,
			transform: (source, rel) => {
				const existing = source.match(
					new RegExp(`export const ${component.name} = Loadable\\([\\s\\S]*?'([^']+)'`),
				);
				if (existing) {
					assertSame(rel, component.name, `'${existing[1]}'`, `'${component.importPath}'`);
					return { source, added: [] };
				}
				const text =
					`\nexport const ${component.name} = Loadable(\n` +
					`\t() => import(/* webpackChunkName: "${component.chunk}" */ '${component.importPath}'),\n);\n`;
				return {
					source: source.replace(/\n*$/, '\n') + text,
					added: [component.name],
				};
			},
		},
		{
			file: ROUTE_FILES.appRoutes,
			transform: (source, rel) => {
				const added = [];
				let next = source;

				const importEnd = next.indexOf("} from './pageComponents';");
				const importStart = next.lastIndexOf('import {', importEnd);
				if (importEnd === -1 || importStart === -1) {
					fail(`could not find the pageComponents import in ${rel}`);
				}
				const names = next
					.slice(importStart + 'import {'.length, importEnd)
					.split(',')
					.map((name) => name.trim())
					.filter(Boolean);
				if (!names.includes(component.name)) {
					const lower = component.name.toLowerCase();
					const at = names.findIndex((name) => name.toLowerCase() > lower);
					names.splice(at === -1 ? names.length : at, 0, component.name);
					next =
						next.slice(0, importStart) +
						`import {\n\t${names.join(',\n\t')},\n` +
						next.slice(importEnd);
					added.push(`import ${component.name}`);
				}

				const arrayStart = next.indexOf('const routes: AppRoutes[] = [');
				if (arrayStart === -1) {
					fail(`could not find \`const routes: AppRoutes[]\` in ${rel}`);
				}
				const missing = routed.filter((key) => {
					const match = next.match(
						new RegExp(`component: (\\w+),\\n\\t\\tkey: '${escapeRegExp(key)}',`),
					);
					if (match) {
						assertSame(rel, `route ${key}`, match[1], component.name);
					}
					return !match;
				});
				const entries = missing
					.map((key) =>
						[
							'\n\t{',
							`\t\tpath: ROUTES.${key},`,
							'\t\texact: true,',
							`\t\tcomponent: ${component.name},`,
							`\t\tkey: '${key}',`,
							'\t\tisPrivate: true,',
							'\t},',
						].join('\n'),
					)
					.join('');
				next = insertBefore(next, '\n];', entries, rel, arrayStart);
				added.push(...missing);

				return { source: next, added };
			},
		},
		{
			file: ROUTE_FILES.topNav,
			transform: (source, rel) => {
				const start = source.indexOf('export const routesToSkip = [');
				if (start === -1) {
					fail(`could not find \`routesToSkip\` in ${rel}`);
				}
				const end = source.indexOf('\n];', start);
				const block = source.slice(start, end);
				const added = routed.filter((key) => !block.includes(`ROUTES.${key},`));
				const text = added.map((key) => `\n\tROUTES.${key},`).join('');
				return { source: insertBefore(source, '\n];', text, rel, start), added };
			},
		},
	];
}

// Every shared file is read and validated before any is written, so a failed anchor or
// a naming collision leaves the tree untouched.
function planRouteEdits(spec) {
	return planRoutes(spec).map(({ file, transform }) => {
		const rel = relative(FRONTEND, file);
		if (!existsSync(file)) {
			fail(`shared file not found: ${rel}`);
		}
		const { source, added } = transform(readFileSync(file, 'utf8'), rel);
		return { file, rel, source, added };
	});
}

function commitRouteEdits(pending, flags) {
	for (const { file, rel, source, added } of pending) {
		if (!added.length) {
			continue;
		}
		if (!flags.dryRun) {
			writeFileSync(file, source);
		}
		edited.push({ rel, added });
	}
}

function scaffoldFeature(targetDir, name, flags) {
	renderTree(join(TEMPLATES, 'feature'), targetDir, tokensFor(name), flags);
	createDirs(targetDir, FEATURE_DIRS, flags);
}

function scaffoldPage(name, flags) {
	const segments = name.split('/').filter(Boolean).map(toDirName);
	if (!segments.length) {
		fail('page needs a name');
	}

	const viewDirs = flags.views.map(toDirName);
	const duplicate = viewDirs.find((dir, index) => viewDirs.indexOf(dir) !== index);
	if (duplicate) {
		fail(`duplicate view: ${duplicate}`);
	}

	const targetDir = join(SRC, 'pages', ...segments);
	const leaf = segments[segments.length - 1];
	targetExisted = existsSync(targetDir);
	// Shared files land before the page folder so a watching type-checker never sees a
	// page that references ROUTES keys that do not exist yet.
	commitRouteEdits(planRouteEdits(routeSpec(segments, flags.views)), flags);

	if (flags.views.length) {
		renderTree(
			join(TEMPLATES, 'shell'),
			targetDir,
			{ ...tokensFor(leaf), ...shellTokens(segments, flags.views) },
			flags,
		);
		for (const view of flags.views) {
			scaffoldFeature(join(targetDir, toDirName(view)), view, flags);
		}
	} else {
		scaffoldFeature(targetDir, leaf, flags);
	}

	return targetDir;
}

function resolveParent(parent) {
	const segments = parent
		.replace(/^src\//, '')
		.replace(/\/components\/?$/, '')
		.split('/')
		.filter(Boolean);
	if (segments[0] === 'pages') {
		return ['pages', ...segments.slice(1).map(toDirName)];
	}
	return segments;
}

function scaffoldComponent(name, flags) {
	const tokens = tokensFor(name);
	const parent = resolveParent(flags.parent);
	const isGlobal = parent.length === 1 && parent[0] === 'components';
	const componentsDir = isGlobal
		? join(SRC, 'components')
		: join(SRC, ...parent, 'components');

	if (relative(SRC, componentsDir).startsWith('..')) {
		fail(`--parent must stay inside src: ${flags.parent}`);
	}
	if (parent[0] === 'pages' && parent.length < 2) {
		fail('a component under pages/ needs a feature: --parent pages/<Feature>');
	}
	if (!isGlobal && !existsSync(join(SRC, ...parent))) {
		fail(`parent does not exist: src/${parent.join('/')}`);
	}

	const targetDir = join(componentsDir, tokens.__Pascal__);
	targetExisted = existsSync(targetDir);

	renderTree(join(TEMPLATES, 'component'), targetDir, tokens, flags);
	if (flags.full) {
		renderTree(join(TEMPLATES, 'component-extras'), targetDir, tokens, flags);
		createDirs(targetDir, FEATURE_DIRS, flags);
	}

	return targetDir;
}

function report(kind, targetDir, flags) {
	const rel = relative(FRONTEND, targetDir);
	const verb = flags.dryRun ? 'would create' : 'created';
	const segments = rel.split('/').slice(2);
	const isNestedView = kind === 'page' && segments.length > 1 && !flags.views.length;
	const leafName = segments[segments.length - 1];

	if (targetExisted) {
		process.stdout.write(
			`\nwarning: ${rel} already existed — only missing entries were added\n`,
		);
	}

	process.stdout.write(`\n${verb} ${created.length} entr(ies) in ${rel}\n`);
	for (const entry of created) {
		process.stdout.write(`  + ${entry}\n`);
	}

	if (skipped.length) {
		process.stdout.write(
			`\nskipped ${skipped.length} existing entr(ies) — pass --force to overwrite files\n`,
		);
		for (const entry of skipped) {
			process.stdout.write(`  = ${entry}\n`);
		}
	}

	if (edited.length) {
		const editVerb = flags.dryRun ? 'would edit' : 'edited';
		process.stdout.write(`\n${editVerb} ${edited.length} shared file(s)\n`);
		for (const { rel, added } of edited) {
			const additions = added.map((entry) => `+${entry}`).join(', ');
			process.stdout.write(`  ~ ${rel}: ${additions}\n`);
		}
	}

	const steps =
		kind === 'page'
			? [
					'review the route registration (constants/routes.ts, utils/permission, AppRoutes/pageComponents.ts, AppRoutes/routes.ts, TopNav routesToSkip) and add a SideNav entry in container/SideNav/menuItems.tsx if the page needs one',
					...(isNestedView
						? [
								`add a tab export for ${leafName} in the shell's constants.tsx and include it in the routes array in the shell's index.tsx`,
							]
						: []),
					'delete the placeholders you do not need (empty types/utils/constants, unused folders)',
					'fill in README.md',
					`verify: pnpm tsgo --noEmit && pnpm oxlint ${rel} && pnpm jest ${rel}`,
				]
			: [
					'delete the placeholders you do not need (empty types/utils/constants, unused folders)',
					`verify: pnpm tsgo --noEmit && pnpm oxlint ${rel} && pnpm jest ${rel}`,
				];

	process.stdout.write('\nnext:\n');
	steps.forEach((step, index) => {
		process.stdout.write(`  ${index + 1}. ${step}\n`);
	});
	process.stdout.write(
		'\nnote: git does not track empty folders — components/, hooks/ and store/ only\n' +
			'show up in a commit once they hold a file.\n',
	);
}

const { positional, flags, provided } = parseArgs(expandEquals(process.argv.slice(2)));
const [kind, name] = positional;

if (!kind || !name) {
	fail('a command and a name are required');
}
if (positional.length > 2) {
	fail(`unexpected argument: ${positional[2]}`);
}

function rejectFlags(unsupported) {
	for (const flag of unsupported) {
		if (provided.has(flag)) {
			fail(`${flag} does not apply to \`${kind}\``);
		}
	}
}

let targetDir;
try {
	if (kind === 'page') {
		rejectFlags(['--parent', '--full']);
		targetDir = scaffoldPage(name, flags);
	} else if (kind === 'component') {
		rejectFlags(['--views']);
		targetDir = scaffoldComponent(name, flags);
	} else {
		fail(`unknown command: ${kind}`);
	}
} catch (error) {
	fail(error.message);
}

report(kind, targetDir, flags);
