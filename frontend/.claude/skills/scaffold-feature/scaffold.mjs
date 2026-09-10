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

const SKILL_DIR = dirname(fileURLToPath(import.meta.url));
const TEMPLATES = join(SKILL_DIR, 'templates');
const FRONTEND = resolve(SKILL_DIR, '..', '..', '..');
const SRC = join(FRONTEND, 'src');

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

const capitalize = (word) => word.charAt(0).toUpperCase() + word.slice(1);

// Folder names keep the casing the author typed — only the first letter is forced
// up — so acronyms like `LLMObservability` survive. Separated names
// (`api-monitoring`, `api monitoring`) collapse to PascalCase.
function toDirName(value) {
	const name = value.trim().replace(/[^a-zA-Z0-9\-_ ]/g, '');
	if (!name) {
		fail(`"${value}" has no usable name characters`);
	}
	return /[-_\s]/.test(name)
		? name
				.split(/[-_\s]+/)
				.filter(Boolean)
				.map(capitalize)
				.join('')
		: capitalize(name);
}

const splitHumps = (name, separator) =>
	name
		.replace(/([a-z0-9])([A-Z])/g, `$1${separator}$2`)
		.replace(/([A-Z]+)([A-Z][a-z])/g, `$1${separator}$2`);

const toKebab = (value) => splitHumps(toDirName(value), '-').toLowerCase();
const toTitle = (value) => splitHumps(toDirName(value), ' ');
const toConst = (value) => toKebab(value).replace(/-/g, '_').toUpperCase();
const toCamel = (value) => {
	const dir = toDirName(value);
	return dir.charAt(0).toLowerCase() + dir.slice(1);
};

function tokensFor(name) {
	return {
		__Pascal__: toDirName(name),
		__kebab__: toKebab(name),
		__camel__: toCamel(name),
		__CONST__: toConst(name),
		__Title__: toTitle(name),
	};
}

function substitute(text, tokens) {
	return Object.entries(tokens).reduce(
		(acc, [token, value]) => acc.split(token).join(value),
		text,
	);
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

function shellTokens(views) {
	const viewImports = views
		.map((view) => `import ${toDirName(view)} from './${toDirName(view)}';`)
		.join('\n');
	const tabEntries = views
		.map((view) => {
			const path = '`${BASE_PATH}/' + toKebab(view) + '`';
			return [
				'\t{',
				`\t\tComponent: ${toDirName(view)},`,
				`\t\tname: '${toTitle(view)}',`,
				`\t\troute: ${path},`,
				`\t\tkey: ${path},`,
				'\t},',
			].join('\n');
		})
		.join('\n');
	return { __VIEW_IMPORTS__: viewImports, __TAB_ENTRIES__: `${tabEntries}\n` };
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

	if (flags.views.length) {
		renderTree(
			join(TEMPLATES, 'shell'),
			targetDir,
			{ ...tokensFor(leaf), ...shellTokens(flags.views) },
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

	const steps =
		kind === 'page'
			? [
					'register the route: src/constants/routes.ts, src/AppRoutes/pageComponents.ts, src/AppRoutes/routes.ts',
					...(flags.views.length
						? ['swap BASE_PATH in constants.ts for the new ROUTES entries']
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
if (kind === 'page') {
	rejectFlags(['--parent', '--full']);
	targetDir = scaffoldPage(name, flags);
} else if (kind === 'component') {
	rejectFlags(['--views']);
	targetDir = scaffoldComponent(name, flags);
} else {
	fail(`unknown command: ${kind}`);
}

report(kind, targetDir, flags);
