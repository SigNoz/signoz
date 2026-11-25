const SLACK_LIMIT = 10;

function signal(entry) {
	return [
		entry.passedOnRetry && `passed on retry (${entry.passedOnRetry})`,
		entry.passedOnRerun && `passed on re-run (${entry.passedOnRerun})`,
		entry.mergeQueue && `merge queue (${entry.mergeQueue})`,
		entry.prs.size > 1 && `${entry.prs.size} PRs`,
	]
		.filter(Boolean)
		.join(', ');
}

const cell = (text) => text.replace(/\|/g, '\\|');

const changeCell = (change) =>
	change
		? `${change.who}, ${change.when}, [${change.sha}](${change.url})`
		: 'unknown';

function suiteTable(suite, flaky) {
	const rows = flaky
		.filter((entry) => entry.suite === suite)
		.map(
			(entry) =>
				`| ${cell(entry.test)} | \`${entry.file}\` | ${entry.failures} | ${signal(entry)} | ${cell(entry.error.slice(0, 80))} | ${changeCell(entry.change)} |`,
		);
	if (rows.length === 0) {
		return [`### ${suite.name}`, '', 'No flaky tests found.', ''];
	}
	return [
		`### ${suite.name}`,
		'',
		'| Test | File | Failures | Signal | First error line | Last change |',
		'| --- | --- | --- | --- | --- | --- |',
		...rows,
		'',
	];
}

export function report(since, suites, flaky) {
	return [
		`## Flaky tests since ${since}`,
		'',
		"A test is listed when it failed and then passed on a re-run of the same commit or on Playwright's own retry, or failed on 3 or more PRs. A merge queue run counts for the PR it was merging.",
		'',
		...suites.flatMap((suite) => suiteTable(suite, flaky)),
	].join('\n');
}

// Slack mrkdwn treats these three as control characters.
const slackEscape = (text) =>
	text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function slackMessage(repo, since, flaky, runUrl) {
	const title = `${flaky.length} flaky tests since ${since}`;
	return {
		text: title,
		blocks: [
			{ type: 'header', text: { type: 'plain_text', text: title } },
			...flaky.slice(0, SLACK_LIMIT).map((entry) => ({
				type: 'section',
				text: {
					type: 'mrkdwn',
					text: `${entry.suite.name}, *${entry.failures} failures* <https://github.com/${repo}/blob/main/${entry.suite.root}${entry.file}|${slackEscape(entry.test)}>\n${signal(entry)}, last changed by ${slackEscape(entry.change?.who ?? 'unknown')}`,
				},
			})),
			{
				type: 'context',
				elements: [
					{
						type: 'mrkdwn',
						text: `<${runUrl}|All tests and their first error line>`,
					},
				],
			},
		],
	};
}
