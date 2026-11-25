#!/usr/bin/env node
import { pathToFileURL } from 'node:url';

import {
	artifactFile,
	artifactsSince,
	gh,
	mapLimit,
	paginate,
} from './github-api.mjs';
import {
	parseJest,
	parsePlaywright,
	parsePlaywrightReport,
} from './test-log-parsers.mjs';
import { report, slackMessages } from './flaky-test-format.mjs';

const MIN_PRS = 3;
const PARALLEL_RUNS = 8;
const DAY_MS = 24 * 60 * 60 * 1000;

const SUITES = [
	{
		name: 'Jest',
		workflow: 'jsci.yaml',
		job: /^test-shard \(\d+\)$|^test \/ js$/,
		root: 'frontend/',
		parse: parseJest,
	},
	{
		name: 'Storybook',
		workflow: 'jsci.yaml',
		job: /^storybook \(\d+\)$/,
		root: 'frontend/',
		parse: parseJest,
	},
	{
		name: 'E2E',
		workflow: 'e2eci.yaml',
		job: /^test \(/,
		root: 'tests/e2e/',
		parse: parsePlaywright,
		// Uploaded by e2eci's upload-flaky step, only for shards with a test that passed on retry.
		artifact: { prefix: 'e2e-flaky-', file: 'results.json' },
		parseArtifact: parsePlaywrightReport,
	},
];

export function findFlaky(failures) {
	const byTest = new Map();
	failures.forEach((failure) => {
		const key = `${failure.suite.name}\0${failure.file}\0${failure.test}`;
		const entry = byTest.get(key) ?? {
			suite: failure.suite,
			file: failure.file,
			test: failure.test,
			error: failure.error,
			failures: 0,
			prs: new Set(),
			passedOnRerun: 0,
			passedOnRetry: 0,
			mergeQueue: 0,
		};
		entry.failures += 1;
		if (failure.pr) {
			entry.prs.add(failure.pr);
		}
		entry.passedOnRerun += failure.passedOnRerun ? 1 : 0;
		entry.passedOnRetry += failure.retried ? 1 : 0;
		entry.mergeQueue += failure.event === 'merge_group' ? 1 : 0;
		byTest.set(key, entry);
	});
	return [...byTest.values()]
		.filter(
			(entry) =>
				entry.passedOnRerun > 0 ||
				entry.passedOnRetry > 0 ||
				entry.prs.size >= MIN_PRS,
		)
		.sort((a, b) => b.failures - a.failures);
}

// Merge queue branches are named gh-readonly-queue/<base>/pr-<number>-<sha>.
export function prOf(run) {
	if (run.event === 'merge_group') {
		return Number(run.head_branch.match(/\/pr-(\d+)-/)?.[1]) || run.head_branch;
	}
	return run.pull_requests[0]?.number ?? run.head_branch;
}

async function runFailures(repo, run, suites) {
	const jobs = await paginate(
		`/repos/${repo}/actions/runs/${run.id}/jobs?filter=all&per_page=100`,
		'jobs',
	);
	const failures = [];
	for (const suite of suites) {
		const suiteJobs = jobs.filter((job) => suite.job.test(job.name));
		for (const job of suiteJobs.filter(
			(failed) => failed.conclusion === 'failure',
		)) {
			const passedOnRerun = suiteJobs.some(
				(later) =>
					later.name === job.name &&
					later.run_attempt > job.run_attempt &&
					later.conclusion === 'success',
			);
			let log;
			try {
				log = await (await gh(`/repos/${repo}/actions/jobs/${job.id}/logs`)).text();
			} catch (error) {
				process.stderr.write(`skipped job ${job.id}: ${error.message}\n`);
				continue;
			}
			suite.parse(log).forEach((failure) =>
				failures.push({
					...failure,
					suite,
					event: run.event,
					pr: prOf(run),
					passedOnRerun,
				}),
			);
		}
	}
	return failures;
}

async function collectFailures(repo, since) {
	const workflows = [...new Set(SUITES.map((suite) => suite.workflow))];
	const failures = await Promise.all(
		workflows.map(async (workflow) => {
			const suites = SUITES.filter((suite) => suite.workflow === workflow);
			const runs = await paginate(
				`/repos/${repo}/actions/workflows/${workflow}/runs?created=>=${since}&per_page=100`,
				'workflow_runs',
			);
			const candidates = runs.filter(
				(run) => run.run_attempt > 1 || run.conclusion === 'failure',
			);
			const fromLogs = await mapLimit(candidates, PARALLEL_RUNS, (run) =>
				runFailures(repo, run, suites),
			);
			const fromArtifacts = await Promise.all(
				suites
					.filter((suite) => suite.artifact)
					.map((suite) => artifactFailures(repo, since, suite, runs)),
			);
			return [...fromLogs, ...fromArtifacts].flat(2);
		}),
	);
	return failures.flat();
}

async function artifactFailures(repo, since, suite, runs) {
	const runsById = new Map(runs.map((run) => [run.id, run]));
	const artifacts = (await artifactsSince(repo, since)).filter(
		(artifact) =>
			artifact.name.startsWith(suite.artifact.prefix) &&
			!artifact.expired &&
			runsById.has(artifact.workflow_run.id),
	);
	return mapLimit(artifacts, PARALLEL_RUNS, async (artifact) => {
		const run = runsById.get(artifact.workflow_run.id);
		let report;
		try {
			report = JSON.parse(
				await artifactFile(repo, artifact.id, suite.artifact.file),
			);
		} catch (error) {
			process.stderr.write(`skipped artifact ${artifact.id}: ${error.message}\n`);
			return [];
		}
		return suite.parseArtifact(report).map((failure) => ({
			...failure,
			suite,
			event: run.event,
			pr: prOf(run),
			passedOnRerun: false,
		}));
	});
}

async function lastChange(repo, path) {
	const [commit] = await (
		await gh(`/repos/${repo}/commits?path=${path}&per_page=1`)
	).json();
	if (!commit) {
		return null;
	}
	return {
		who: commit.author?.login ?? commit.commit.author.name,
		when: commit.commit.author.date.slice(0, 10),
		sha: commit.sha.slice(0, 7),
		url: commit.html_url,
	};
}

async function postToSlack(webhook, message) {
	const response = await fetch(webhook, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(message),
	});
	if (!response.ok) {
		throw new Error(`${response.status} POST Slack webhook`);
	}
}

async function main() {
	const repo = process.env.GITHUB_REPOSITORY;
	const days = Number(process.env.DAYS ?? 7);
	const since = new Date(Date.now() - days * DAY_MS).toISOString().slice(0, 10);
	const flaky = await Promise.all(
		findFlaky(await collectFailures(repo, since)).map(async (entry) => ({
			...entry,
			change: await lastChange(repo, entry.suite.root + entry.file),
		})),
	);
	process.stdout.write(report(since, SUITES, flaky));
	const webhook = process.env.SLACK_WEBHOOK_URL;
	if (webhook) {
		const runUrl = `${process.env.GITHUB_SERVER_URL}/${repo}/actions/runs/${process.env.GITHUB_RUN_ID}`;
		for (const message of slackMessages(repo, since, SUITES, flaky, runUrl)) {
			await postToSlack(webhook, message);
		}
	}
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
	await main();
}
