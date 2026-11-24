import assert from 'node:assert/strict';
import { test } from 'node:test';

import { findFlaky, prOf, slackMessage } from '../flaky-test-report.mjs';
import { rateLimitWait } from '../github-api.mjs';
import { parseJest, parsePlaywright } from '../test-log-parsers.mjs';

const JEST_LOG = [
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

const STORYBOOK_LOG = [
	'2026-11-24T14:52:01.9166715Z \x1b[0m\x1b[7m\x1b[1m\x1b[31m FAIL \x1b[39m\x1b[22m\x1b[27m\x1b[0m \x1b[0m\x1b[7m\x1b[33m browser: chromium \x1b[39m\x1b[27m\x1b[0m \x1b[2msrc/q/stories/\x1b[22m\x1b[1mQ.stories.tsx\x1b[22m (\x1b[0m',
	'2026-11-24T14:52:01.9168486Z \x1b[1m\x1b[31m  \x1b[1m● \x1b[22m\x1b[1mComponents/Q › WhereClauseSuggestions › play-test\x1b[39m\x1b[22m',
	'2026-11-24T14:52:01.9168487Z     [error] AssertionError: expected 0 to be greater than 0',
	'2026-11-24T14:54:46.4233854Z \x1b[0m\x1b[7m\x1b[1m\x1b[31m FAIL \x1b[39m\x1b[22m\x1b[27m\x1b[0m \x1b[2mfrontend/src/q/stories/\x1b[22m\x1b[1mQ.stories.tsx\x1b[22m (34.267 s)',
	'2026-11-24T14:54:46.4236531Z \x1b[1m\x1b[31m  \x1b[1m● \x1b[22m\x1b[1mComponents/Q › WhereClauseSuggestions › play-test\x1b[39m\x1b[22m',
].join('\n');

const PLAYWRIGHT_LOG = [
	'2026-11-24T17:12:13.5413743Z   ✓  55 [chromium] › tests/s/detail.spec.ts:70:6 › Services, detail › TC-04 tabs render (retry #1) (18.3s)',
	'2026-11-24T17:15:01.8981922Z   1) [chromium] › tests/s/list.spec.ts:32:6 › Services, list › TC-02 opens the overview ',
	'2026-11-24T17:15:01.8982565Z ',
	'2026-11-24T17:15:01.8982929Z     Error: \x1b[2mexpect(\x1b[22mreceived).toEqual(expected) // deep equality',
	'2026-11-24T17:15:01.9025205Z   2) [chromium] › tests/s/detail.spec.ts:70:6 › Services, detail › TC-04 tabs render ',
	'2026-11-24T17:15:01.9025206Z     Error: locator.click: Timeout 15000ms exceeded.',
	'2026-11-24T17:15:01.9032403Z   1 failed',
	'2026-11-24T17:15:01.9032812Z     [chromium] › tests/s/list.spec.ts:32:6 › Services, list › TC-02 opens the overview ',
	'2026-11-24T17:15:01.9033155Z   1 flaky',
	'2026-11-24T17:15:01.9033637Z     [chromium] › tests/s/detail.spec.ts:70:6 › Services, detail › TC-04 tabs render ',
	'2026-11-24T17:15:01.9034012Z   77 passed (7.4m)',
].join('\n');

const JEST = { name: 'Jest', root: 'frontend/' };
const E2E = { name: 'E2E', root: 'tests/e2e/' };

test('parseJest reads each failing test once with its first error line', () => {
	assert.deepEqual(parseJest(JEST_LOG), [
		{
			file: 'src/a/A.test.tsx',
			test: 'A › saves the form',
			error: 'thrown: "Exceeded timeout of 5000 ms for a test.',
			retried: false,
		},
		{
			file: 'src/b/B.test.tsx',
			test: 'B › shows the error',
			error: 'expect(received).toBe(expected)',
			retried: false,
		},
	]);
});

test('parseJest reads the storybook runner file under both of its prefixes', () => {
	assert.deepEqual(parseJest(STORYBOOK_LOG), [
		{
			file: 'src/q/stories/Q.stories.tsx',
			test: 'Components/Q › WhereClauseSuggestions › play-test',
			error: '[error] AssertionError: expected 0 to be greater than 0',
			retried: false,
		},
	]);
});

test('parsePlaywright reads failed and flaky tests from the closing summary', () => {
	assert.deepEqual(parsePlaywright(PLAYWRIGHT_LOG), [
		{
			file: 'tests/s/list.spec.ts',
			test: 'Services, list › TC-02 opens the overview',
			error: 'Error: expect(received).toEqual(expected) // deep equality',
			retried: false,
		},
		{
			file: 'tests/s/detail.spec.ts',
			test: 'Services, detail › TC-04 tabs render',
			error: 'Error: locator.click: Timeout 15000ms exceeded.',
			retried: true,
		},
	]);
});

test('findFlaky keeps retry, re-run and multi-PR failures only', () => {
	const failure = (test, extra) => ({
		suite: JEST,
		file: 'src/x.test.tsx',
		test,
		error: '',
		retried: false,
		event: 'pull_request',
		pr: 1,
		passedOnRerun: false,
		...extra,
	});
	const flaky = findFlaky([
		failure('one PR only'),
		failure('one PR only'),
		failure('re-run', { passedOnRerun: true }),
		failure('retry', { suite: E2E, retried: true }),
		failure('queue once', { event: 'merge_group', pr: 7 }),
		failure('spread', { pr: 1 }),
		failure('spread', { event: 'merge_group', pr: 2 }),
		failure('spread', { pr: 3 }),
		failure('spread', { suite: E2E, pr: 4 }),
	]);
	assert.deepEqual(
		flaky.map((entry) => `${entry.suite.name} ${entry.test}`),
		['Jest spread', 'Jest re-run', 'E2E retry'],
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

test('rateLimitWait waits for retry-after or the hourly reset, and nothing else', () => {
	const response = (status, headers) => ({
		status,
		headers: new Headers(headers),
	});
	const now = 1_000_000;
	assert.equal(
		rateLimitWait(response(429, { 'retry-after': '30' }), now),
		30_000,
	);
	assert.equal(
		rateLimitWait(
			response(403, { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': '1060' }),
			now,
		),
		61_000,
	);
	assert.equal(
		rateLimitWait(response(403, { 'x-ratelimit-remaining': '12' }), now),
		null,
	);
	assert.equal(rateLimitWait(response(500, {}), now), null);
});

test('slackMessage escapes test names and lists the top 10 with a link to the run', () => {
	const entry = (index) => ({
		suite: index === 0 ? E2E : JEST,
		file: `src/t${index}.test.tsx`,
		test: `T${index} › shows <Empty> & more`,
		failures: 20 - index,
		passedOnRerun: 1,
		passedOnRetry: 0,
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

	assert.equal(message.text, '12 flaky tests since 2026-11-17');
	const sections = message.blocks.filter((block) => block.type === 'section');
	assert.equal(sections.length, 10);
	assert.equal(
		sections[0].text.text,
		'E2E, *20 failures* <https://github.com/SigNoz/signoz/blob/main/tests/e2e/src/t0.test.tsx|T0 › shows &lt;Empty&gt; &amp; more>\npassed on re-run (1), last changed by dev',
	);
	assert.equal(
		sections[1].text.text.split(' <')[1].split('|')[0],
		'https://github.com/SigNoz/signoz/blob/main/frontend/src/t1.test.tsx',
	);
	assert.equal(
		message.blocks.at(-1).elements[0].text,
		'<https://github.com/SigNoz/signoz/actions/runs/1|All tests and their first error line>',
	);
});
