import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';

import { affected } from './affected.mjs';
import { E2E_DIR, listTests, REPO_DIR } from './utils.mjs';

const MAX_SHARDS = 10;
const TESTS_PER_SHARD = 80;

const { values: options } = parseArgs({
	options: { all: { type: 'boolean', default: false } },
});

function changedFiles() {
	if (!process.stdin.isTTY) {
		return fs.readFileSync(0, 'utf8').split('\n').filter(Boolean);
	}
	const git = (...args) =>
		execFileSync('git', args, { cwd: REPO_DIR })
			.toString()
			.split('\n')
			.filter(Boolean);
	const [base] = git('merge-base', 'origin/main', 'HEAD');
	return [
		...git('diff', '--name-only', base),
		...git('ls-files', '--others', '--exclude-standard'),
	];
}

const selection = options.all
	? { all: true, reasons: ['--all'], features: [], specs: [] }
	: affected(changedFiles());
const tests = listTests();
const chosen = new Set(
	tests.filter(
		(test) =>
			selection.all ||
			selection.specs.includes(test.file) ||
			selection.features.includes(test.file.split('/')[0]),
	),
);
if (chosen.size || selection.features.length || selection.specs.length) {
	tests
		.filter((test) => test.tags.includes('@smoke'))
		.forEach((test) => chosen.add(test));
}
const shardCount = Math.min(
	MAX_SHARDS,
	Math.ceil(chosen.size / TESTS_PER_SHARD),
);

const out = path.join(E2E_DIR, 'artifacts/plan');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(
	path.join(out, 'tests.txt'),
	[...chosen]
		.map((test) => `[chromium] › ${[test.file, ...test.titles].join(' › ')}\n`)
		.join(''),
);
fs.writeFileSync(
	path.join(out, 'plan.json'),
	JSON.stringify({ ...selection, tests: chosen.size, shardCount }, null, '\t'),
);

const scope = selection.all
	? 'every spec'
	: [...new Set([...selection.features, ...selection.specs, '@smoke'])].join(
			', ',
		);
const summary = [
	shardCount
		? `**E2E plan:** ${chosen.size} of ${tests.length} tests on ${shardCount} shard${shardCount > 1 ? 's' : ''}.`
		: '**E2E plan:** no test reaches this change.',
	shardCount ? `**Runs:** ${scope}` : '',
	...selection.reasons
		.slice(0, 5)
		.map(
			(reason, index) => `${index ? '' : '**Full suite because:** '}${reason}`,
		),
]
	.filter(Boolean)
	.join('\n\n');

process.stdout.write(`${summary.replaceAll('**', '')}\n`);
if (process.env.GITHUB_OUTPUT) {
	fs.appendFileSync(
		process.env.GITHUB_OUTPUT,
		`shards=${JSON.stringify(Array.from({ length: shardCount }, (_, index) => index + 1))}\nshard-count=${shardCount}\n`,
	);
}
if (process.env.GITHUB_STEP_SUMMARY) {
	fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`);
}
