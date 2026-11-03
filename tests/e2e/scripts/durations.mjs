import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseArgs } from 'node:util';

import { E2E_DIR, listTests, REPO_DIR, testKey } from './utils.mjs';

// Reads reports already downloaded into `dir` when given; otherwise downloads
// the Playwright artifacts of the last green e2eci runs.
const { values: options, positionals } = parseArgs({
	options: { runs: { type: 'string', default: '10' } },
	allowPositionals: true,
});

const gh = (...args) =>
	execFileSync('gh', args, {
		cwd: REPO_DIR,
		stdio: ['ignore', 'pipe', 'inherit'],
	})
		.toString()
		.trim();

const dir =
	positionals[0] ?? fs.mkdtempSync(path.join(os.tmpdir(), 'e2e-durations-'));
if (!positionals[0]) {
	const runIds = gh(
		'run',
		'list',
		'--workflow',
		'e2eci.yaml',
		'--status',
		'success',
		'--limit',
		options.runs,
		'--json',
		'databaseId',
		'--jq',
		'.[].databaseId',
	).split('\n');
	for (const runId of runIds) {
		try {
			gh(
				'run',
				'download',
				runId,
				'--pattern',
				'playwright-artifacts-*',
				'--dir',
				path.join(dir, runId),
			);
		} catch {
			console.warn(`Skipped run ${runId}: its artifacts did not download.`);
		}
	}
}

const samples = new Map();
const reports = fs
	.readdirSync(dir, { recursive: true })
	.filter((file) => file.endsWith('results.json'));
for (const report of reports) {
	const walk = (suite, titles) => {
		for (const spec of suite.specs ?? []) {
			for (const test of spec.tests) {
				if (test.projectName !== 'chromium' || !test.results.length) {
					continue;
				}
				const key = testKey({ file: spec.file, titles: [...titles, spec.title] });
				const sample = samples.get(key) ?? { first: [], flaky: 0 };
				sample.first.push(test.results[0].duration);
				sample.flaky += test.status === 'flaky' ? 1 : 0;
				samples.set(key, sample);
			}
		}
		for (const child of suite.suites ?? []) {
			walk(child, [...titles, child.title]);
		}
	};
	for (const fileSuite of JSON.parse(fs.readFileSync(path.join(dir, report)))
		.suites) {
		walk(fileSuite, []);
	}
}
if (!positionals[0]) {
	fs.rmSync(dir, { recursive: true, force: true });
}

const durations = {};
for (const key of listTests()
	.map(testKey)
	.sort((a, b) => a.localeCompare(b))) {
	const sample = samples.get(key);
	if (sample) {
		const sorted = [...sample.first].sort((a, b) => a - b);
		durations[key] = {
			ms: Math.round(sorted[sorted.length >> 1]),
			runs: sorted.length,
			flaky: sample.flaky,
		};
	}
}
fs.writeFileSync(
	path.join(E2E_DIR, 'durations.json'),
	`${JSON.stringify(durations, null, '\t')}\n`,
);

const entries = Object.entries(durations);
const describe = ([key, { ms, runs, flaky }]) =>
	`  ${(ms / 1000).toFixed(1).padStart(5)} s  ${flaky}/${runs} flaky  ${key}`;
process.stdout.write(
	[
		`${entries.length} tests from ${reports.length} reports.`,
		'Slowest:',
		...entries
			.sort((a, b) => b[1].ms - a[1].ms)
			.slice(0, 10)
			.map(describe),
		'Flaky:',
		...entries
			.filter(([, { flaky }]) => flaky)
			.sort((a, b) => b[1].flaky / b[1].runs - a[1].flaky / a[1].runs)
			.map(describe),
		'',
	].join('\n'),
);
