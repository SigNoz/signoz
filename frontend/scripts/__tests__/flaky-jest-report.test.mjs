import assert from 'node:assert/strict';
import { test } from 'node:test';

import { findFlaky, parseFailures } from '../flaky-jest-report.mjs';

const LOG = [
	'2026-11-10T10:00:00.0000000Z \x1b[1mFAIL\x1b[22m src/a/A.test.tsx (12.1 s)',
	'2026-11-10T10:00:00.0000001Z   \x1b[1m● A › saves the form\x1b[22m',
	'2026-11-10T10:00:00.0000002Z ',
	'2026-11-10T10:00:00.0000003Z     thrown: "Exceeded timeout of 5000 ms for a test.',
	'2026-11-10T10:00:00.0000004Z FAIL src/b/B.test.tsx',
	'2026-11-10T10:00:00.0000005Z   ● B › shows the error',
	'2026-11-10T10:00:00.0000006Z     expect(received).toBe(expected)',
	'2026-11-10T10:00:00.0000007Z   ● Test suite failed to run',
	'2026-11-10T10:00:00.0000008Z FAIL src/a/A.test.tsx (12.1 s)',
	'2026-11-10T10:00:00.0000009Z   ● A › saves the form',
].join('\n');

test('parseFailures reads each failing test once with its first error line', () => {
	assert.deepEqual(parseFailures(LOG), [
		{
			file: 'src/a/A.test.tsx',
			test: 'A › saves the form',
			error: 'thrown: "Exceeded timeout of 5000 ms for a test.',
		},
		{
			file: 'src/b/B.test.tsx',
			test: 'B › shows the error',
			error: 'expect(received).toBe(expected)',
		},
	]);
});

test('findFlaky keeps re-run, merge queue and multi-PR failures only', () => {
	const failure = (test, extra) => ({
		file: 'src/x.test.tsx',
		test,
		error: '',
		event: 'pull_request',
		pr: 1,
		passedOnRerun: false,
		...extra,
	});
	const flaky = findFlaky([
		failure('one PR only'),
		failure('one PR only'),
		failure('re-run', { passedOnRerun: true }),
		failure('queue', { event: 'merge_group', pr: null }),
		failure('spread', { pr: 1 }),
		failure('spread', { pr: 2 }),
		failure('spread', { pr: 3 }),
	]);
	assert.deepEqual(
		flaky.map((entry) => entry.test),
		['spread', 're-run', 'queue'],
	);
});
