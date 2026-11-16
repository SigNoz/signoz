#!/usr/bin/env node
import { pathToFileURL } from 'node:url';

const API = 'https://api.github.com';
const ISSUE_TITLE = 'Flaky Jest tests: weekly report';
const TEST_JOB = /^test-shard \(\d+\)$|^test \/ js$/;
const MIN_PRS = 3;

export function parseFailures(log) {
	const lines = log.split('\n').map((line) =>
		line
			// eslint-disable-next-line no-control-regex
			.replace(/\x1b\[[0-9;]*m/g, '')
			.replace(/^\d{4}-\d\d-\d\dT[\d:.]+Z /, ''),
	);
	const failures = new Map();
	let file = null;
	lines.forEach((line, index) => {
		const failedFile = line.match(/^\s*FAIL\s+(\S+)/);
		if (failedFile) {
			[, file] = failedFile;
			return;
		}
		const failedTest = line.match(/^\s*● (.+ › .+)$/);
		if (!failedTest || !file) {
			return;
		}
		const test = failedTest[1].trim();
		const key = `${file}\0${test}`;
		if (!failures.has(key)) {
			const error =
				lines
					.slice(index + 1, index + 8)
					.map((next) => next.trim())
					.find(Boolean) ?? '';
			failures.set(key, { file, test, error });
		}
	});
	return [...failures.values()];
}

export function findFlaky(failures) {
	const byTest = new Map();
	failures.forEach((failure) => {
		const key = `${failure.file}\0${failure.test}`;
		const entry = byTest.get(key) ?? {
			file: failure.file,
			test: failure.test,
			error: failure.error,
			failures: 0,
			prs: new Set(),
			passedOnRerun: 0,
			mergeQueue: 0,
		};
		entry.failures += 1;
		if (failure.pr) {
			entry.prs.add(failure.pr);
		}
		entry.passedOnRerun += failure.passedOnRerun ? 1 : 0;
		entry.mergeQueue += failure.event === 'merge_group' ? 1 : 0;
		byTest.set(key, entry);
	});
	return [...byTest.values()]
		.filter(
			(entry) =>
				entry.passedOnRerun > 0 ||
				entry.mergeQueue > 0 ||
				entry.prs.size >= MIN_PRS,
		)
		.sort((a, b) => b.failures - a.failures);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function gh(path, init = {}, attempt = 1) {
	const retry = !init.method && attempt < 4;
	let response;
	try {
		response = await fetch(path.startsWith('http') ? path : API + path, {
			...init,
			headers: {
				accept: 'application/vnd.github+json',
				authorization: `Bearer ${process.env.GH_TOKEN}`,
				...init.headers,
			},
		});
	} catch (error) {
		if (!retry) {
			throw error;
		}
		await sleep(attempt * 2000);
		return gh(path, init, attempt + 1);
	}
	if (retry && response.status >= 500) {
		await sleep(attempt * 2000);
		return gh(path, init, attempt + 1);
	}
	if (!response.ok) {
		throw new Error(`${response.status} ${init.method ?? 'GET'} ${path}`);
	}
	return response;
}

async function mapLimit(items, limit, fn) {
	const results = [];
	let next = 0;
	await Promise.all(
		Array.from({ length: limit }, async () => {
			while (next < items.length) {
				const index = next;
				next += 1;
				results[index] = await fn(items[index]);
			}
		}),
	);
	return results;
}

async function paginate(path, key) {
	const items = [];
	let next = API + path;
	while (next) {
		const response = await gh(next);
		const body = await response.json();
		items.push(...(key ? body[key] : body));
		next = response.headers.get('link')?.match(/<([^>]+)>; rel="next"/)?.[1];
	}
	return items;
}

async function runFailures(repo, run) {
	const jobs = (
		await paginate(
			`/repos/${repo}/actions/runs/${run.id}/jobs?filter=all&per_page=100`,
			'jobs',
		)
	).filter((job) => TEST_JOB.test(job.name));
	const failures = [];
	for (const job of jobs.filter((j) => j.conclusion === 'failure')) {
		const passedOnRerun = jobs.some(
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
		parseFailures(log).forEach((failure) =>
			failures.push({
				...failure,
				event: run.event,
				pr:
					run.event === 'merge_group'
						? null
						: (run.pull_requests[0]?.number ?? run.head_branch),
				passedOnRerun,
			}),
		);
	}
	return failures;
}

async function collectFailures(repo, since) {
	const runs = await paginate(
		`/repos/${repo}/actions/workflows/jsci.yaml/runs?created=>=${since}&per_page=100`,
		'workflow_runs',
	);
	const candidates = runs.filter(
		(run) => run.run_attempt > 1 || run.conclusion === 'failure',
	);
	return (await mapLimit(candidates, 8, (run) => runFailures(repo, run))).flat();
}

async function lastChange(repo, file) {
	const [commit] = await (
		await gh(`/repos/${repo}/commits?path=frontend/${file}&per_page=1`)
	).json();
	if (!commit) {
		return 'unknown';
	}
	const who = commit.author?.login ?? commit.commit.author.name;
	const when = commit.commit.author.date.slice(0, 10);
	return `${who}, ${when}, [${commit.sha.slice(0, 7)}](${commit.html_url})`;
}

function signal(entry) {
	return [
		entry.passedOnRerun && `passed on re-run (${entry.passedOnRerun})`,
		entry.mergeQueue && `merge queue (${entry.mergeQueue})`,
		entry.prs.size >= MIN_PRS && `${entry.prs.size} PRs`,
	]
		.filter(Boolean)
		.join(', ');
}

const cell = (text) => text.replace(/\|/g, '\\|');

async function report(repo, since, flaky) {
	const header = `## Flaky Jest tests since ${since}`;
	if (flaky.length === 0) {
		return `${header}\n\nNo flaky tests found.\n`;
	}
	const rows = await Promise.all(
		flaky.map(
			async (entry) =>
				`| ${cell(entry.test)} | \`${entry.file}\` | ${entry.failures} | ${signal(entry)} | ${cell(entry.error.slice(0, 80))} | ${await lastChange(repo, entry.file)} |`,
		),
	);
	return [
		header,
		'',
		'A test is listed when it failed and then passed on a re-run of the same commit, failed in the merge queue, or failed on 3 or more PRs.',
		'',
		'| Test | File | Failures | Signal | First error line | Last change |',
		'| --- | --- | --- | --- | --- | --- |',
		...rows,
		'',
	].join('\n');
}

async function postToIssue(repo, body) {
	const issues = await paginate(
		`/repos/${repo}/issues?state=open&creator=github-actions%5Bbot%5D&per_page=100`,
	);
	let issue = issues.find((candidate) => candidate.title === ISSUE_TITLE);
	if (!issue) {
		issue = await (
			await gh(`/repos/${repo}/issues`, {
				method: 'POST',
				body: JSON.stringify({
					title: ISSUE_TITLE,
					body: 'A weekly comment lists the Jest tests that looked flaky in CI.',
				}),
			})
		).json();
	}
	await gh(`/repos/${repo}/issues/${issue.number}/comments`, {
		method: 'POST',
		body: JSON.stringify({ body }),
	});
}

async function main() {
	const repo = process.env.GITHUB_REPOSITORY;
	const days = Number(process.env.DAYS ?? 7);
	const since = new Date(Date.now() - days * 864e5).toISOString().slice(0, 10);
	const flaky = findFlaky(await collectFailures(repo, since));
	const body = await report(repo, since, flaky);
	process.stdout.write(body);
	if (process.env.POST_ISSUE === 'true') {
		await postToIssue(repo, body);
	}
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
	await main();
}
