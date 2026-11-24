import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
	findFlaky,
	parseFailures,
	prOf,
	slackMessage,
} from '../flaky-jest-report.mjs';

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

test('findFlaky keeps re-run and multi-PR failures only', () => {
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
		failure('queue once', { event: 'merge_group', pr: 7 }),
		failure('spread', { pr: 1 }),
		failure('spread', { event: 'merge_group', pr: 2 }),
		failure('spread', { pr: 3 }),
	]);
	assert.deepEqual(
		flaky.map((entry) => entry.test),
		['spread', 're-run'],
	);
});

test('prOf reads the PR number from a merge queue branch', () => {
	assert.equal(
		prOf({
			event: 'merge_group',
			head_branch: 'gh-readonly-queue/main/pr-13616-0a1ca00c27f1',
		}),
		13616,
	);
	assert.equal(
		prOf({ event: 'pull_request', pull_requests: [{ number: 42 }] }),
		42,
	);
});

test('slackMessage escapes test names and lists the top 10 with a link to the run', () => {
	const entry = (index) => ({
		file: `src/t${index}.test.tsx`,
		test: `T${index} › shows <Empty> & more`,
		failures: 20 - index,
		passedOnRerun: 1,
		mergeQueue: 0,
		prs: new Set([1]),
		change: { who: 'dev' },
	});
	const message = slackMessage(
		'SigNoz/signoz',
		'2026-11-17',
		Array.from({ length: 12 }, (_, index) => entry(index)),
		'https://github.com/SigNoz/signoz/actions/runs/1',
	);

	assert.equal(message.text, '12 flaky Jest tests since 2026-11-17');
	const sections = message.blocks.filter((block) => block.type === 'section');
	assert.equal(sections.length, 10);
	assert.equal(
		sections[0].text.text,
		'*20 failures* <https://github.com/SigNoz/signoz/blob/main/frontend/src/t0.test.tsx|T0 › shows &lt;Empty&gt; &amp; more>\npassed on re-run (1), last changed by dev',
	);
	assert.equal(
		message.blocks.at(-1).elements[0].text,
		'<https://github.com/SigNoz/signoz/actions/runs/1|All tests and their first error line>',
	);
});
