import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

import { E2E_DIR, REPO_DIR } from './utils.mjs';

const FEATURES = Object.entries(
	JSON.parse(fs.readFileSync(path.join(E2E_DIR, 'affected.json'), 'utf8')),
);
const ROUTER = path.join(REPO_DIR, 'frontend/src/AppRoutes/pageComponents.ts');
const ENTRY = path.join(REPO_DIR, 'frontend/src/index.tsx');
const SPECS_DIR = path.join(E2E_DIR, 'tests');
const E2E_SOURCE = /^tests\/e2e\/(tests|drivers|helpers|fixtures)\/.+\.ts$/;
const SOURCE = /\.[cm]?[jt]sx?$/;
const IGNORED = [
	/\.md$/,
	/^docs\//,
	/^tests\/integration\//,
	/^frontend\/\.(storybook|husky)\//,
	/^frontend\/src\/(storybook|mocks-server)\//,
	/^frontend\/(.*\/)?(__tests__|__mocks__)\//,
	/^frontend\/.*\.(test|spec|stories)\.[jt]sx?$/,
];

const isIgnored = (file) => IGNORED.some((pattern) => pattern.test(file));
const relative = (file) => path.relative(REPO_DIR, file);
const isUnder = (file, root) =>
	file === root || file.startsWith(`${root}/`) || file.startsWith(`${root}.`);

function importersOf(tsconfigPath) {
	const { config } = ts.readConfigFile(tsconfigPath, (file) =>
		ts.sys.readFile(file),
	);
	const { options, fileNames } = ts.parseJsonConfigFileContent(
		config,
		ts.sys,
		path.dirname(tsconfigPath),
	);
	const cache = ts.createModuleResolutionCache(
		path.dirname(tsconfigPath),
		(name) => name,
		options,
	);
	const aliases = Object.entries(options.paths ?? {});
	const aliasBase = options.pathsBasePath ?? path.dirname(tsconfigPath);

	const resolve = (specifier, from) => {
		const { resolvedModule } = ts.resolveModuleName(
			specifier,
			from,
			options,
			ts.sys,
			cache,
		);
		if (resolvedModule) {
			return resolvedModule.isExternalLibraryImport
				? undefined
				: path.resolve(resolvedModule.resolvedFileName);
		}
		// TypeScript resolves only modules, so styles and assets are matched here.
		const candidates = specifier.startsWith('.')
			? [path.resolve(path.dirname(from), specifier)]
			: aliases.flatMap(([pattern, targets]) => {
					const prefix = pattern.replace(/\*$/, '');
					const matches = pattern.endsWith('*')
						? specifier.startsWith(prefix)
						: specifier === pattern;
					return matches
						? targets.map((target) =>
								path.resolve(
									aliasBase,
									target.replace('*', specifier.slice(prefix.length)),
								),
							)
						: [];
				});
		return candidates.find((candidate) =>
			fs.statSync(candidate, { throwIfNoEntry: false })?.isFile(),
		);
	};

	const importers = new Map();
	for (const file of fileNames) {
		const { importedFiles } = ts.preProcessFile(
			fs.readFileSync(file, 'utf8'),
			true,
			true,
		);
		for (const { fileName } of importedFiles) {
			const target = resolve(fileName, file);
			if (target) {
				if (!importers.has(target)) {
					importers.set(target, new Set());
				}
				importers.get(target).add(path.resolve(file));
			}
		}
	}
	return importers;
}

// Walks importers up from `start`. `tops` are files nothing imports; `routes`
// are files imported straight by the router.
function climb(start, importers, isRouter) {
	const seen = new Set([start]);
	const queue = [start];
	const tops = [];
	const routes = [];
	while (queue.length) {
		const file = queue.pop();
		const parents = importers.get(file) ?? new Set();
		if (!parents.size) {
			tops.push(file);
		}
		for (const parent of parents) {
			if (isRouter(parent)) {
				routes.push(file);
			} else if (!seen.has(parent)) {
				seen.add(parent);
				queue.push(parent);
			}
		}
	}
	return { tops, routes };
}

// Spec files and feature folders a change can affect. `all` is set when any
// changed file can't be traced to them.
export function affected(changedFiles) {
	const reasons = [];
	const features = new Set();
	const specs = new Set();
	let frontend;
	let e2e;

	for (const changed of changedFiles) {
		const file = path.join(REPO_DIR, changed);
		// A deleted module or style's importers are in the change as well.
		const isDeletedImport =
			!fs.existsSync(file) &&
			(SOURCE.test(changed) || changed.startsWith('frontend/src/'));
		if (isIgnored(changed) || isDeletedImport) {
			continue;
		}
		if (changed.startsWith('frontend/')) {
			frontend ??= importersOf(path.join(REPO_DIR, 'frontend/tsconfig.json'));
			const { tops, routes } = climb(
				file,
				frontend,
				(parent) => parent === ROUTER,
			);
			// Other tops are dead code, tests or stories. A file outside the module
			// graph (config, lockfile, public asset, scss partial) is never traced.
			const isModule = SOURCE.test(changed) && changed.startsWith('frontend/src/');
			if (tops.includes(ENTRY)) {
				reasons.push(`${changed} reaches the app shell`);
			} else if (tops.includes(file) && !isModule) {
				reasons.push(`${changed} has no importer`);
			}
			for (const route of routes) {
				const matched = FEATURES.filter(([, roots]) =>
					roots.some((root) => isUnder(relative(route), root)),
				);
				if (!matched.length) {
					reasons.push(`${changed} reaches ${relative(route)}, unmapped`);
				}
				matched.forEach(([feature]) => features.add(feature));
			}
		} else if (E2E_SOURCE.test(changed)) {
			e2e ??= importersOf(path.join(E2E_DIR, 'tsconfig.json'));
			for (const top of climb(file, e2e, () => false).tops) {
				if (top.startsWith(`${SPECS_DIR}/`)) {
					specs.add(path.relative(SPECS_DIR, top));
				} else {
					reasons.push(`${changed} reaches ${relative(top)}`);
				}
			}
		} else {
			reasons.push(`${changed} is not traced`);
		}
	}

	return {
		all: reasons.length > 0,
		reasons,
		features: [...features].sort((a, b) => a.localeCompare(b)),
		specs: [...specs].sort((a, b) => a.localeCompare(b)),
	};
}
