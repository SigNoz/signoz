import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import SlowTestReporter from '../slow-test-reporter.mjs';

const result = {
	testFilePath: path.join(process.cwd(), 'src/a/A.test.tsx'),
	testResults: [
		{ fullName: 'A › saves', duration: 2500 },
		{ fullName: 'A › loads', duration: 100 },
		{ fullName: 'A › reads a | b', duration: 4000 },
	],
};

test('lists tests over 2 s in the job summary, slowest first', (t) => {
	const summary = path.join(
		mkdtempSync(path.join(tmpdir(), 'slow-')),
		'summary.md',
	);
	writeFileSync(summary, '');
	t.after(() => delete process.env.GITHUB_STEP_SUMMARY);
	process.env.GITHUB_STEP_SUMMARY = summary;

	const reporter = new SlowTestReporter();
	reporter.onTestResult(undefined, result);
	reporter.onRunComplete();

	assert.equal(
		readFileSync(summary, 'utf8'),
		[
			'### Jest tests over 2 s',
			'',
			'| Test | File | Time |',
			'| --- | --- | --- |',
			'| A › reads a \\| b | `src/a/A.test.tsx` | 4.0 s |',
			'| A › saves | `src/a/A.test.tsx` | 2.5 s |',
			'',
		].join('\n'),
	);
});
