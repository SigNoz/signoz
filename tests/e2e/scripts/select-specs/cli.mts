import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';

import { classify, type Verdict } from './classify.mts';
import { buildFrontendGraph } from './graph.mts';
import { SPEC_PAGES } from './spec-pages.mts';

const USAGE = `Usage: node scripts/select-specs/cli.mts [options] [-- playwright args]

Picks the Playwright spec files a change can affect.

  --base <ref>       compare the working tree with <ref> (default: merge-base with origin/main)
  --all              select every spec without reading the diff
  --project <name>   Playwright project to list (default: chromium)
  --max-shards <n>   shards a full run uses (default: 10)
  --github-output    write mode, specs, shards and shard-total to $GITHUB_OUTPUT
  --run              run the selected specs, passing the args after --
  --check            fail when spec-pages.mts and the code disagree
`;

interface ListedSuite {
	file: string;
	specs?: { tests: { projectName: string }[] }[];
	suites?: ListedSuite[];
}

const e2eDir = path.resolve(import.meta.dirname, '../..');
const git = (...args: string[]): string =>
	execFileSync('git', args, { cwd: e2eDir, encoding: 'utf8' }).trim();

function playwrightList(project: string, extra: string[]): Map<string, number> {
	const result = spawnSync(
		'pnpm',
		[
			'exec',
			'playwright',
			'test',
			'--list',
			'--reporter=json',
			`--project=${project}`,
			'--pass-with-no-tests',
			...extra,
		],
		{
			cwd: e2eDir,
			encoding: 'utf8',
			maxBuffer: 256 * 1024 * 1024,
			env: { ...process.env, CI: '' },
		},
	);
	if (result.status !== 0) {
		throw new Error(`playwright --list failed:\n${result.stderr}`);
	}
	const report = JSON.parse(result.stdout) as { suites: ListedSuite[] };
	const counts = new Map<string, number>();
	const visit = (suite: ListedSuite): void => {
		for (const spec of suite.specs ?? []) {
			const tests = spec.tests.filter((t) => t.projectName === project).length;
			if (tests > 0) {
				const file = path.join('tests', suite.file);
				counts.set(file, (counts.get(file) ?? 0) + tests);
			}
		}
		suite.suites?.forEach(visit);
	};
	report.suites.forEach(visit);
	return counts;
}

function changedFiles(base: string): string[] {
	const tracked = git('diff', '--name-only', '--no-renames', base).split('\n');
	const untracked = git(
		'ls-files',
		'--others',
		'--exclude-standard',
		'--full-name',
		':/',
	).split('\n');
	return [...new Set([...tracked, ...untracked])].filter(Boolean).sort();
}

function check(repoRoot: string): number {
	const graph = buildFrontendGraph(path.join(repoRoot, 'frontend'));
	const errors: string[] = [];
	const folders = fs
		.readdirSync(path.join(e2eDir, 'tests'), { withFileTypes: true })
		.filter((d) => d.isDirectory())
		.map((d) => d.name);
	for (const folder of folders) {
		if (!SPEC_PAGES[folder]) {
			errors.push(`tests/${folder} has no entry in spec-pages.mts`);
		}
	}
	for (const [folder, pages] of Object.entries(SPEC_PAGES)) {
		if (!folders.includes(folder)) {
			errors.push(
				`spec-pages.mts lists ${folder}, which is not a folder under tests/`,
			);
		}
		for (const page of pages.filter((p) => !graph.pages.has(p))) {
			errors.push(
				`spec-pages.mts: ${folder} lists ${page}, which pageComponents.ts does not import`,
			);
		}
	}
	const covered = new Set(Object.values(SPEC_PAGES).flat());
	const uncovered = [...graph.pages.keys()]
		.filter((p) => !covered.has(p))
		.sort();
	console.error(`pages no spec opens: ${uncovered.join(', ')}`);
	errors.forEach((e) => console.error(`error: ${e}`));
	return errors.length > 0 ? 1 : 0;
}

function main(): number {
	const { values, positionals } = parseArgs({
		allowPositionals: true,
		options: {
			base: { type: 'string' },
			all: { type: 'boolean', default: false },
			project: { type: 'string', default: 'chromium' },
			'max-shards': { type: 'string', default: '10' },
			'github-output': { type: 'boolean', default: false },
			run: { type: 'boolean', default: false },
			check: { type: 'boolean', default: false },
			help: { type: 'boolean', default: false },
		},
	});
	if (values.help) {
		process.stdout.write(USAGE);
		return 0;
	}
	const repoRoot = git('rev-parse', '--show-toplevel');
	if (values.check) {
		return check(repoRoot);
	}
	const project = values.project as string;
	const maxShards = Number(values['max-shards']);

	let mode: 'all' | 'some' | 'none' = 'all';
	let specs: string[] = [];
	let share = 1;
	const report: string[] = [];
	if (!values.all) {
		const base = values.base ?? git('merge-base', 'HEAD', 'origin/main');
		const graph = buildFrontendGraph(path.join(repoRoot, 'frontend'));
		const verdicts = changedFiles(base).map((file): [string, Verdict] => [
			file,
			classify(file, repoRoot, graph),
		]);
		for (const [file, verdict] of verdicts) {
			const target =
				verdict.kind === 'folders' ? verdict.folders.join(' ') : verdict.kind;
			console.error(`${file}\n    ${target} (${verdict.reason})`);
			report.push(`| \`${file}\` | ${target} | ${verdict.reason} |`);
		}

		if (!verdicts.some(([, v]) => v.kind === 'all')) {
			const all = playwrightList(project, []);
			const folders = new Set(
				verdicts.flatMap(([, v]) => (v.kind === 'folders' ? v.folders : [])),
			);
			const selected = new Set(
				[...all.keys()].filter((f) => folders.has(f.split(path.sep)[1])),
			);
			if (verdicts.some(([, v]) => v.kind === 'playwright')) {
				for (const file of playwrightList(project, [
					`--only-changed=${base}`,
				]).keys()) {
					selected.add(file);
				}
			}
			specs = [...selected].sort();
			const total = [...all.values()].reduce((a, b) => a + b, 0);
			share = specs.reduce((sum, f) => sum + (all.get(f) ?? 0), 0) / total;
			mode = specs.length === 0 ? 'none' : 'some';
		}
	}

	const shardTotal =
		mode === 'none' ? 0 : Math.max(1, Math.ceil(maxShards * share));
	console.error(
		mode === 'all'
			? `\nall specs, ${shardTotal} shards`
			: `\n${specs.length} spec files, ${(share * 100).toFixed(0)}% of tests, ${shardTotal} shards\n${specs.join('\n')}`,
	);

	if (values['github-output']) {
		const shards = Array.from({ length: shardTotal }, (_, i) => i + 1);
		fs.appendFileSync(
			process.env.GITHUB_OUTPUT as string,
			`mode=${mode}\nspecs=${specs.join(' ')}\nshards=${JSON.stringify(shards)}\nshard-total=${shardTotal}\n`,
		);
		if (process.env.GITHUB_STEP_SUMMARY) {
			const heading =
				mode === 'all'
					? 'Running every spec.'
					: `Running ${specs.length} spec files, ${(share * 100).toFixed(0)}% of tests, on ${shardTotal} shards.`;
			const table =
				report.length > 0
					? `\n\n| File | Runs | Why |\n|---|---|---|\n${report.join('\n')}`
					: '';
			fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${heading}${table}\n`);
		}
	}
	if (values.run && mode !== 'none') {
		const run = spawnSync(
			'pnpm',
			[
				'exec',
				'playwright',
				'test',
				`--project=${project}`,
				...positionals,
				...specs,
			],
			{
				cwd: e2eDir,
				stdio: 'inherit',
			},
		);
		return run.status ?? 1;
	}
	return 0;
}

process.exitCode = main();
