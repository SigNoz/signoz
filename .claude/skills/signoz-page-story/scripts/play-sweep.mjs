import { realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const frontend = fileURLToPath(new URL('../../../../frontend/', import.meta.url));
const require = createRequire(
	realpathSync(`${frontend}node_modules/@storybook/test-runner/package.json`),
);
const { chromium } = require('playwright');

const { values: opts, positionals } = parseArgs({
	allowPositionals: true,
	options: {
		url: { type: 'string', default: 'http://localhost:6006' },
		story: { type: 'string' },
		concurrency: { type: 'string', default: '6' },
	},
});
const target = positionals[0];
if (!target) {
	console.error(
		'usage: play-sweep.mjs <title or id prefix> [--story <id part>] [--url <storybook>] [--concurrency <n>]',
	);
	process.exit(2);
}
const prefix = `${target.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}--`;

// Storybook drops URL args whose string values fall outside this set.
const URL_SAFE = /^[a-zA-Z0-9 _-]*$/;

const urlValue = (value) =>
	typeof value === 'boolean' ? `!${value}` : String(value);

const edgeValues = (argType) => {
	const type = argType.control?.type;
	if (argType.control?.disable) {
		return [];
	}
	if (['select', 'radio', 'inline-radio'].includes(type)) {
		return argType.options ?? [];
	}
	if (type === 'boolean') {
		return [true, false];
	}
	if (type === 'number' || type === 'range') {
		return [argType.control.min ?? 0, argType.control.max].filter(
			(v) => v !== undefined,
		);
	}
	return [];
};

const variants = ({ argTypes, initialArgs }) =>
	Object.entries(argTypes).flatMap(([name, argType]) =>
		edgeValues(argType)
			.filter((value) => value !== initialArgs[name])
			.filter((value) => typeof value !== 'string' || URL_SAFE.test(value))
			.map((value) => `${name}:${urlValue(value)}`),
	);

const index = await (await fetch(`${opts.url}/index.json`)).json();
const ids = Object.values(index.entries)
	.filter((entry) => entry.type === 'story' && entry.id.startsWith(prefix))
	.filter((entry) => !opts.story || entry.id.includes(opts.story))
	.map((entry) => entry.id);
if (ids.length === 0) {
	console.error(`no stories under ${prefix}`);
	process.exit(2);
}

const browser = await chromium.launch();
const storyUrl = (id, args) =>
	`${opts.url}/iframe.html?id=${id}&viewMode=story${args ? `&args=${args}` : ''}`;

const describe = async (id) => {
	const page = await browser.newPage();
	await page.goto(storyUrl(id));
	await page.waitForFunction(() => window.__STORYBOOK_PREVIEW__?.storyStoreValue);
	const story = await page.evaluate(async (storyId) => {
		const loaded =
			await window.__STORYBOOK_PREVIEW__.storyStoreValue.loadStory({ storyId });
		return {
			hasPlay: Boolean(loaded.playFunction),
			argTypes: JSON.parse(JSON.stringify(loaded.argTypes)),
			initialArgs: JSON.parse(JSON.stringify(loaded.initialArgs)),
		};
	}, id);
	await page.close();
	return story;
};

const run = async (id, args) => {
	const page = await browser.newPage();
	await page.addInitScript(() => {
		window.__playSweep = { error: '', finished: false };
		const hook = () => {
			const channel = window.__STORYBOOK_ADDONS_CHANNEL__;
			if (!channel) {
				setTimeout(hook, 20);
				return;
			}
			const emit = channel.emit.bind(channel);
			// A play that throws still ends on `storyFinished` with status success;
			// only this event reports it.
			channel.emit = (event, ...payload) => {
				if (event === 'playFunctionThrewException' || event === 'storyErrored') {
					window.__playSweep.error ||= String(
						payload[0]?.message ?? payload[0]?.title ?? event,
					).split('\n')[0];
				}
				if (event === 'storyFinished') {
					window.__playSweep.finished = true;
				}
				return emit(event, ...payload);
			};
		};
		hook();
	});
	try {
		await page.goto(storyUrl(id, args));
		await page
			.waitForFunction(() => window.__playSweep?.finished, null, {
				timeout: 60_000,
			})
			.catch(() => {});
		const result = await page.evaluate(() => window.__playSweep);
		return result.finished ? result.error : 'never finished within 60s';
	} catch (error) {
		return `could not load: ${error.message.split('\n')[0]}`;
	} finally {
		await page.close();
	}
};

const jobs = [];
for (const id of ids) {
	const story = await describe(id);
	if (story.hasPlay) {
		jobs.push({ id, args: '' }, ...variants(story).map((args) => ({ id, args })));
	}
}

const failures = [];
let next = 0;
let done = 0;
await Promise.all(
	Array.from({ length: Number(opts.concurrency) }, async () => {
		while (next < jobs.length) {
			const job = jobs[next++];
			const error = await run(job.id, job.args);
			if (error) {
				failures.push({ ...job, error });
			}
			done += 1;
			if (done % 50 === 0) {
				console.error(`${done}/${jobs.length} runs, ${failures.length} failed`);
			}
		}
	}),
);
await browser.close();

for (const { id, args, error } of failures.sort((a, b) =>
	`${a.id}${a.args}`.localeCompare(`${b.id}${b.args}`),
)) {
	console.log(`FAIL ${id.slice(prefix.length)} ${args || '(story args)'}: ${error}`);
}
console.log(
	`${jobs.length - failures.length}/${jobs.length} play runs passed across ${new Set(jobs.map((j) => j.id)).size} stories with a play`,
);
process.exit(failures.length ? 1 : 0);
