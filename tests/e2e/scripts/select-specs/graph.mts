import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const CODE_EXTENSIONS = new Set([
	'.ts',
	'.tsx',
	'.js',
	'.jsx',
	'.mts',
	'.cts',
	'.mjs',
	'.cjs',
]);
const STYLE_EXTENSIONS = new Set(['.scss', '.css', '.less']);
const ASSET_EXTENSIONS = new Set([
	...STYLE_EXTENSIONS,
	'.svg',
	'.png',
	'.jpg',
	'.jpeg',
	'.gif',
	'.webp',
	'.ico',
	'.json',
]);

interface ImportRef {
	specifier: string;
	dynamic: boolean;
	/** `specifier` is a Vite glob: `import.meta.glob` or a template `import()`. */
	glob?: boolean;
}

export interface FrontendGraph {
	frontendDir: string;
	/** Every file reachable from the app entry, keyed by absolute path. */
	edges: Map<string, Set<string>>;
	/** Route components, keyed by the specifier `pageComponents.ts` imports them with. */
	pages: Map<string, string>;
	/** Files the app loads outside any page: reachable from the entry without entering a page. */
	shell: Set<string>;
	/** Files each page imports, shell files included. Keyed like `pages`. */
	pageReach: Map<string, Set<string>>;
}

function isTypeOnlySyntax(node: ts.Node): boolean {
	return (
		ts.isTypeNode(node) ||
		ts.isInterfaceDeclaration(node) ||
		ts.isTypeAliasDeclaration(node) ||
		ts.isImportDeclaration(node) ||
		(ts.isHeritageClause(node) && node.token === ts.SyntaxKind.ImplementsKeyword)
	);
}

function collectValueNames(source: ts.SourceFile): Set<string> {
	const names = new Set<string>();
	const visit = (node: ts.Node): void => {
		if (isTypeOnlySyntax(node)) {
			return;
		}
		if (ts.isIdentifier(node)) {
			names.add(node.text);
		}
		ts.forEachChild(node, visit);
	};
	visit(source);
	return names;
}

// The build (esbuild, isolatedModules) drops an import whose bindings are only used as types.
function importSurvivesBuild(
	node: ts.ImportDeclaration,
	valueNames: Set<string>,
): boolean {
	const clause = node.importClause;
	if (!clause) {
		return true;
	}
	if (clause.isTypeOnly) {
		return false;
	}
	const bindings: string[] = [];
	if (clause.name) {
		bindings.push(clause.name.text);
	}
	if (clause.namedBindings && ts.isNamespaceImport(clause.namedBindings)) {
		bindings.push(clause.namedBindings.name.text);
	} else if (clause.namedBindings) {
		for (const element of clause.namedBindings.elements) {
			if (!element.isTypeOnly) {
				bindings.push(element.name.text);
			}
		}
	}
	return bindings.some((name) => valueNames.has(name));
}

function readImports(file: string): ImportRef[] {
	const text = fs.readFileSync(file, 'utf8');
	const ext = path.extname(file);
	if (STYLE_EXTENSIONS.has(ext)) {
		const pattern =
			/@(?:use|import|forward)\s+['"]([^'"]+)['"]|url\(\s*['"]?(\.[^)'"]+)/g;
		return [...text.matchAll(pattern)].map((m) => ({
			specifier: m[1] ?? m[2],
			dynamic: false,
		}));
	}
	if (!CODE_EXTENSIONS.has(ext)) {
		return [];
	}

	const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, false);
	const valueNames = collectValueNames(source);
	const refs: ImportRef[] = [];
	const visit = (node: ts.Node): void => {
		if (ts.isImportDeclaration(node)) {
			if (
				ts.isStringLiteral(node.moduleSpecifier) &&
				importSurvivesBuild(node, valueNames)
			) {
				refs.push({ specifier: node.moduleSpecifier.text, dynamic: false });
			}
		} else if (
			ts.isExportDeclaration(node) &&
			!node.isTypeOnly &&
			node.moduleSpecifier &&
			ts.isStringLiteral(node.moduleSpecifier)
		) {
			refs.push({ specifier: node.moduleSpecifier.text, dynamic: false });
		} else if (ts.isCallExpression(node) && node.arguments.length > 0) {
			const [arg] = node.arguments;
			const isImport = node.expression.kind === ts.SyntaxKind.ImportKeyword;
			const isRequire =
				ts.isIdentifier(node.expression) && node.expression.text === 'require';
			const isGlob =
				ts.isPropertyAccessExpression(node.expression) &&
				ts.isMetaProperty(node.expression.expression) &&
				node.expression.name.text === 'glob';
			if ((isImport || isRequire) && ts.isStringLiteralLike(arg)) {
				refs.push({ specifier: arg.text, dynamic: isImport });
			} else if (isImport && ts.isTemplateExpression(arg)) {
				const pattern =
					arg.head.text +
					arg.templateSpans.map((s) => `*${s.literal.text}`).join('');
				refs.push({ specifier: pattern, dynamic: true, glob: true });
			} else if (isGlob) {
				const patterns = ts.isArrayLiteralExpression(arg)
					? [...arg.elements]
					: [arg];
				for (const p of patterns) {
					if (ts.isStringLiteralLike(p) && !p.text.startsWith('!')) {
						refs.push({ specifier: p.text, dynamic: true, glob: true });
					}
				}
			}
		}
		ts.forEachChild(node, visit);
	};
	visit(source);
	return refs;
}

function createResolver(
	frontendDir: string,
): (specifier: string, from: string) => string | undefined {
	const config = ts.getParsedCommandLineOfConfigFile(
		path.join(frontendDir, 'tsconfig.json'),
		{},
		{ ...ts.sys, onUnRecoverableConfigFileDiagnostic: () => undefined },
	);
	if (!config) {
		throw new Error(`cannot read ${frontendDir}/tsconfig.json`);
	}
	const options = config.options;
	const cache = ts.createModuleResolutionCache(frontendDir, (f) => f, options);
	const paths = Object.entries(options.paths ?? {});
	const pathsBase =
		typeof options.pathsBasePath === 'string'
			? options.pathsBasePath
			: frontendDir;

	const firstExisting = (candidates: string[]): string | undefined =>
		candidates.find((c) => fs.existsSync(c) && fs.statSync(c).isFile());

	// TypeScript only resolves code, so styles and assets go through `paths` by hand.
	const resolveAsset = (specifier: string, from: string): string | undefined => {
		const bare = specifier.replace(/\?.*$/, '');
		let targets: string[] = [];
		if (bare.startsWith('.')) {
			targets = [path.resolve(path.dirname(from), bare)];
		} else {
			for (const [pattern, replacements] of paths) {
				const prefix = pattern.replace(/\*$/, '');
				if (pattern.endsWith('*') ? bare.startsWith(prefix) : bare === pattern) {
					const rest = bare.slice(prefix.length);
					targets.push(
						...replacements.map((r) => path.resolve(pathsBase, r.replace('*', rest))),
					);
				}
			}
		}
		const candidates = targets.flatMap((t) => {
			const dir = path.dirname(t);
			const name = path.basename(t);
			return [
				t,
				`${t}.scss`,
				path.join(dir, `_${name}.scss`),
				path.join(dir, `_${name}`),
				`${t}/index.scss`,
				`${t}/_index.scss`,
				`${t}.css`,
			];
		});
		return firstExisting(candidates);
	};

	return (specifier, from) => {
		const ext = path.extname(specifier.replace(/\?.*$/, ''));
		if (STYLE_EXTENSIONS.has(path.extname(from)) || ASSET_EXTENSIONS.has(ext)) {
			const asset = resolveAsset(specifier, from);
			if (asset || ext !== '.json') {
				return asset;
			}
		}
		const { resolvedModule } = ts.resolveModuleName(
			specifier,
			from,
			options,
			ts.sys,
			cache,
		);
		if (!resolvedModule || resolvedModule.isExternalLibraryImport) {
			return undefined;
		}
		const resolved = path.resolve(resolvedModule.resolvedFileName);
		return resolved.endsWith('.d.ts') ? undefined : resolved;
	};
}

function expandGlob(pattern: string): string[] {
	const segments = pattern.split('/');
	const firstGlob = segments.findIndex((segment) => /[*?{]/.test(segment));
	const base = segments.slice(0, firstGlob).join('/');
	if (!fs.existsSync(base)) {
		return [];
	}
	const source = segments
		.slice(firstGlob)
		.join('/')
		.replace(/[.+^$()|[\]\\]/g, '\\$&')
		.replace(/\*\*\//g, '\0')
		.replace(/\*/g, '[^/]*')
		.replace(/\?/g, '[^/]')
		.replace(
			/\{([^}]*)\}/g,
			(_, options: string) => `(?:${options.split(',').join('|')})`,
		)
		.replace(/\0/g, '(?:.*/)?');
	const matcher = new RegExp(`^${source}$`);
	return fs
		.readdirSync(base, { recursive: true, encoding: 'utf8' })
		.filter((relative) => matcher.test(relative.split(path.sep).join('/')))
		.map((relative) => path.join(base, relative));
}

function closure(
	starts: Iterable<string>,
	edges: Map<string, Set<string>>,
	stop: Set<string>,
): Set<string> {
	const seen = new Set<string>();
	const queue = [...starts];
	while (queue.length > 0) {
		const file = queue.pop() as string;
		if (seen.has(file)) {
			continue;
		}
		seen.add(file);
		for (const next of edges.get(file) ?? []) {
			if (!seen.has(next) && !stop.has(next)) {
				queue.push(next);
			}
		}
	}
	return seen;
}

export function buildFrontendGraph(frontendDir: string): FrontendGraph {
	const resolve = createResolver(frontendDir);
	const entry = path.join(frontendDir, 'src/index.tsx');
	const pageComponents = path.join(
		frontendDir,
		'src/AppRoutes/pageComponents.ts',
	);

	const edges = new Map<string, Set<string>>();
	const pages = new Map<string, string>();
	const queue = [entry];
	while (queue.length > 0) {
		const file = queue.pop() as string;
		if (edges.has(file)) {
			continue;
		}
		const targets = new Set<string>();
		edges.set(file, targets);
		for (const ref of readImports(file)) {
			if (ref.glob) {
				const cwd = ref.specifier.startsWith('/')
					? frontendDir
					: path.dirname(file);
				for (const match of expandGlob(
					path.resolve(cwd, ref.specifier.replace(/^\//, '')),
				)) {
					targets.add(match);
					queue.push(match);
				}
				continue;
			}
			const target = resolve(ref.specifier, file);
			if (!target) {
				continue;
			}
			if (file === pageComponents && ref.dynamic) {
				pages.set(ref.specifier, target);
			}
			targets.add(target);
			queue.push(target);
		}
	}
	if (pages.size === 0) {
		throw new Error(`no lazy route components found in ${pageComponents}`);
	}

	const shell = closure([entry], edges, new Set(pages.values()));
	const pageReach = new Map<string, Set<string>>();
	for (const [specifier, file] of pages) {
		pageReach.set(specifier, closure([file], edges, new Set()));
	}

	return { frontendDir, edges, pages, shell, pageReach };
}
