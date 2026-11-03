import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';

import { affected } from './affected.mjs';
import { E2E_DIR, listTests, REPO_DIR, testKey } from './utils.mjs';

// Matches `workers` in playwright.config.ts on CI.
const WORKERS = 2;

const { values: options } = parseArgs({
	options: {
		all: { type: 'boolean', default: false },
		out: { type: 'string', default: 'artifacts/plan' },
		'max-shards': { type: 'string', default: '8' },
		'shard-minutes': { type: 'string', default: '4' },
	},
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

const median = (values) =>
	values.length ? [...values].sort((a, b) => a - b)[values.length >> 1] : 0;

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

// A flaky test is expected to cost one extra attempt per flaky run.
const durations = JSON.parse(
	fs.readFileSync(path.join(E2E_DIR, 'durations.json'), 'utf8'),
);
const fallbackMs =
	median(Object.values(durations).map((duration) => duration.ms)) || 30_000;
const cost = (test) => {
	const duration = durations[testKey(test)];
	return duration
		? duration.ms * (1 + duration.flaky / duration.runs)
		: fallbackMs;
};

// Files stay whole so serial groups and worker-scoped seeds stay on one shard.
const files = new Map();
for (const test of chosen) {
	const file = files.get(test.file) ?? { tests: [], ms: 0 };
	file.tests.push(test);
	file.ms += cost(test);
	files.set(test.file, file);
}
const totalMs = [...files.values()].reduce((sum, file) => sum + file.ms, 0);
const shardMs = Number(options['shard-minutes']) * 60_000 * WORKERS;
const shardCount = files.size
	? Math.min(Number(options['max-shards']), Math.ceil(totalMs / shardMs))
	: 0;

// Longest file first onto the least loaded shard.
const shards = Array.from({ length: shardCount }, () => ({ ms: 0, tests: [] }));
for (const file of [...files.values()].sort((a, b) => b.ms - a.ms)) {
	const shard = shards.reduce((least, next) =>
		next.ms < least.ms ? next : least,
	);
	shard.ms += file.ms;
	shard.tests.push(...file.tests);
}

const out = path.resolve(E2E_DIR, options.out);
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
shards.forEach((shard, index) => {
	fs.writeFileSync(
		path.join(out, `shard-${index + 1}.txt`),
		shard.tests
			.map((test) => `[chromium] › ${[test.file, ...test.titles].join(' › ')}`)
			.join('\n') + '\n',
	);
});

const minutes = (ms) => (ms / WORKERS / 60_000).toFixed(1);
const scope = selection.all
	? 'every spec'
	: [...new Set([...selection.features, ...selection.specs, '@smoke'])].join(
			', ',
		);
const summary = [
	shardCount
		? `**E2E plan:** ${chosen.size} of ${tests.length} tests on ${shardCount} shard${shardCount > 1 ? 's' : ''}, at most ${minutes(Math.max(...shards.map((shard) => shard.ms)))} min of tests per shard.`
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

fs.writeFileSync(
	path.join(out, 'plan.json'),
	JSON.stringify(
		{
			...selection,
			tests: chosen.size,
			shards: shards.map((shard) => minutes(shard.ms)),
		},
		null,
		'\t',
	),
);
process.stdout.write(`${summary.replaceAll('**', '')}\n`);
if (process.env.GITHUB_OUTPUT) {
	fs.appendFileSync(
		process.env.GITHUB_OUTPUT,
		`shards=${JSON.stringify(shards.map((_, index) => index + 1))}\n`,
	);
}
if (process.env.GITHUB_STEP_SUMMARY) {
	fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`);
}
