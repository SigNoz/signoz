#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { mkdir, rename, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import os from 'node:os';

import {
	CONFIG_KEYS,
	hasMagick,
	settingsLine,
	stamp,
} from './story-shots-caption.mjs';

/**
 * The wall clock every shot is taken at, passed to the preview as `storyClock`.
 * `.storybook/preview-head.html` freezes the same instant by itself, so a
 * Chromatic build reads the clock this run does.
 */
const FROZEN_CLOCK = '2026-06-15T12:00:00.000Z';

const { values: opts, positionals } = parseArgs({
	allowPositionals: true,
	options: {
		out: { type: 'string', short: 'o' },
		stories: { type: 'string', multiple: true, default: [] },
		title: { type: 'string', default: '' },
		name: { type: 'string', default: '' },
		theme: { type: 'string', multiple: true, default: [] },
		args: { type: 'string', multiple: true, default: [] },
		port: { type: 'string', default: process.env.SB_PORT ?? '6006' },
		width: { type: 'string', default: '1680' },
		height: { type: 'string', default: '1200' },
		'max-height': { type: 'string', default: '8000' },
		grow: { type: 'string', default: 'scrollers' },
		settle: { type: 'string', default: '1500' },
		clock: { type: 'string', default: FROZEN_CLOCK },
		motion: { type: 'boolean', default: false },
		ignore: { type: 'string', multiple: true, default: [] },
		flat: { type: 'boolean', default: false },
		'no-caption': { type: 'boolean', default: false },
		list: { type: 'boolean', default: false },
		help: { type: 'boolean', short: 'h', default: false },
	},
});

const outDir = opts.out ?? positionals[0];
const themes = opts.theme.flatMap((value) => value.split(',')).filter(Boolean);
const storyArgs = opts.args.filter(Boolean).join(';');

if (opts.help || (!outDir && !opts.list)) {
	console.log(`usage: node scripts/story-shots.mjs <out-dir> [options]

  --stories <match>   only stories whose id or title/name path contains <match>
                      (repeatable, comma-separated; default: every story)
  --title <prefix>    only stories whose title starts with <prefix>
  --name <match>      only stories whose name contains <match>
  --theme <themes>    themes to shoot, e.g. dark,light (default: story default)
  --args <k:v;k2:v2>  arg overrides, storybook's own ?args= syntax (repeatable).
                      A value containing a dot is dropped by storybook itself
  --port <port>       storybook dev server port (default 6006, or $SB_PORT)
  --width <px>        viewport width, the only fixed dimension (default 1680)
  --height <px>       shortest the viewport may be (default 1200)
  --max-height <px>   tallest the viewport may grow to (default 8000)
  --grow <what>       scrollers (default) grows the viewport until the page's
                      own scrollers fit, document only follows the document
                      height (a no-op on any page with the app shell), none
                      keeps --height
  --settle <ms>       wait after the page goes quiet (default 1500)
  --clock <iso|live>  wall clock the page reads (default ${FROZEN_CLOCK})
  --motion            keep animations and transitions running
  --ignore <selector> hide matching elements, on top of [data-shot-ignore]
  --flat              write <out>/<id>.png instead of <out>/<theme>/<id>.png
  --no-caption        do not stamp the story and the run settings on the shot
  --list              print the matched stories and exit

Screenshots land in <out-dir>/<theme>/<story-id>.png, alongside a shots.json
recording what each shot is, how the run was configured, and how tall the
caption on it is. story-shots-diff.mjs reads that to crop the caption off before
comparing, so two runs never diff their own captions.

Captioning needs ImageMagick; without it the shots are written bare.

Playwright is looked up in tests/e2e, then in the global install; override with
PLAYWRIGHT_MODULE. The browser is playwright's own chromium, else an installed
Chrome; override with CHROME_PATH.`);
	process.exit(opts.help ? 0 : 1);
}

const base = `http://localhost:${opts.port}`;

// `index.json` carries raw control characters from story jsdoc, so it is read as
// text rather than piped through anything that revalidates it.
const index = JSON.parse(await (await fetch(`${base}/index.json`)).text());

const matches = opts.stories
	.flatMap((value) => value.split(','))
	.filter(Boolean);

const stories = Object.values(index.entries)
	.filter((entry) => {
		if (entry.type !== 'story') {
			return false;
		}
		if (opts.title && !entry.title.startsWith(opts.title)) {
			return false;
		}
		if (
			opts.name &&
			!entry.name.toLowerCase().includes(opts.name.toLowerCase())
		) {
			return false;
		}
		if (!matches.length) {
			return true;
		}

		const haystack = `${entry.id} ${entry.title}/${entry.name}`.toLowerCase();
		return matches.some((match) => haystack.includes(match.toLowerCase()));
	})
	.sort((a, b) => a.id.localeCompare(b.id));

if (opts.list) {
	stories.forEach((story) =>
		console.log(`${story.id}\t${story.title}/${story.name}`),
	);
	console.log(`${stories.length} stories`);
	process.exit(0);
}

if (!stories.length) {
	console.error('no story matched');
	process.exit(1);
}

const ignoreSelectors = opts.ignore
	.flatMap((value) => value.split(','))
	.map((value) => value.trim())
	.filter(Boolean);

if (opts.clock !== 'live' && Number.isNaN(Date.parse(opts.clock))) {
	console.error(`--clock: not a date: ${opts.clock}`);
	process.exit(1);
}

/**
 * `[data-shot-ignore]` and `--ignore` hide what cannot be settled, the local
 * half of Chromatic's `data-chromatic="ignore"`. Everything else the shot needs
 * held still - the frozen clock, the parked animations, the lists snapped onto
 * their bottom - is done by the preview itself, so a Chromatic build and a shot
 * from here see the same page.
 */
const ignoreCss = (
	ignore,
) => `[data-shot-ignore], [data-chromatic='ignore']${ignore
	.map((selector) => `, ${selector}`)
	.join('')} {
	visibility: hidden !important;
}`;

/**
 * Playwright is not a frontend dependency: it lives in `tests/e2e`, or globally,
 * or wherever `$PLAYWRIGHT_MODULE` points. `@playwright/test` re-exports
 * `chromium`, so an e2e install alone is enough.
 */
const resolvePlaywright = () => {
	const specifiers = process.env.PLAYWRIGHT_MODULE
		? [process.env.PLAYWRIGHT_MODULE]
		: ['playwright', '@playwright/test'];

	const find = (roots) => {
		for (const specifier of specifiers) {
			for (const root of roots) {
				try {
					return createRequire(path.join(root, '-')).resolve(specifier);
				} catch {
					/* next candidate */
				}
			}
		}
		return null;
	};

	const local = find([
		import.meta.dirname,
		path.resolve(import.meta.dirname, '../../tests/e2e'),
	]);
	if (local) {
		return local;
	}

	// `npm root -g` prints the global node_modules; resolution starts a level up.
	const globalRoot = spawnSync('npm', ['root', '-g'], { encoding: 'utf8' });
	const global =
		globalRoot.status === 0 && find([path.dirname(globalRoot.stdout.trim())]);
	if (global) {
		return global;
	}

	console.error(
		'playwright not found. Install it (pnpm -C tests/e2e install, or npm i -g playwright) or set PLAYWRIGHT_MODULE.',
	);
	return process.exit(1);
};

const pwModule = await import(pathToFileURL(resolvePlaywright()).href);
const pw = pwModule.chromium ? pwModule : pwModule.default;

console.log(
	`${stories.length} stories x ${themes.length || 1} theme(s) -> ${outDir}`,
);

/**
 * A playwright install carries no browser of its own, and the revision it wants
 * is often not the one that was downloaded, so an installed Chrome is the
 * fallback before giving up.
 */
const launch = async () => {
	if (process.env.CHROME_PATH) {
		return pw.chromium.launch({ executablePath: process.env.CHROME_PATH });
	}
	try {
		return await pw.chromium.launch();
	} catch (error) {
		try {
			return await pw.chromium.launch({ channel: 'chrome' });
		} catch {
			console.error(
				`${error.message.split('\n')[0]}\nRun 'playwright install chromium' or set CHROME_PATH to a browser binary.`,
			);
			return process.exit(1);
		}
	}
};

const browser = await launch();

const failures = [];
const shots = [];

const runConfig = {
	args: storyArgs,
	clock: opts.clock,
	width: opts.width,
	height: opts.height,
	grow: opts.grow,
	motion: opts.motion ? 'live' : 'still',
	settle: opts.settle,
	ignore: ignoreSelectors.join(', '),
};

const captioning = !opts['no-caption'] && hasMagick();

if (!opts['no-caption'] && !captioning) {
	console.error('ImageMagick not found: shots are written without a caption.');
}

const configLine = settingsLine(runConfig, CONFIG_KEYS);

for (const theme of themes.length ? themes : [null]) {
	const dir = opts.flat ? outDir : path.join(outDir, theme ?? 'default');
	await mkdir(dir, { recursive: true });
	if (theme) {
		console.log(`\n[${theme}]`);
	}

	for (const story of stories) {
		// A context per story: reusing one page loses the msw worker
		// re-registration race after a few navigations and the story then dies on
		// a missing worker.
		const context = await browser.newContext({
			viewport: { width: Number(opts.width), height: Number(opts.height) },
			reducedMotion: opts.motion ? 'no-preference' : 'reduce',
		});
		const page = await context.newPage();

		// react-query retries and msw both keep requests going long after load, so
		// the settle waits on the page being quiet rather than on a fixed delay.
		let inFlight = 0;
		let lastActivity = Date.now();
		page.on('request', () => {
			inFlight += 1;
			lastActivity = Date.now();
		});
		const done = () => {
			inFlight = Math.max(inFlight - 1, 0);
			lastActivity = Date.now();
		};
		page.on('requestfinished', done);
		page.on('requestfailed', done);

		// The height the rounds had reached when the page turned out to grow with
		// the viewport, kept only to flag the story in the log.
		let chasing = 0;

		const url = new URL(`${base}/iframe.html`);
		url.searchParams.set('viewMode', 'story');
		url.searchParams.set('id', story.id);
		// The preview owns the clock and the motion state, so both are asked for in
		// the URL rather than injected here: a Chromatic build gets the defaults.
		url.searchParams.set('storyClock', opts.clock);
		const globals = [theme && `theme:${theme}`, opts.motion && 'motion:live']
			.filter(Boolean)
			.join(';');
		if (globals) {
			url.searchParams.set('globals', globals);
		}
		if (storyArgs) {
			url.searchParams.set('args', storyArgs);
		}

		try {
			await page.goto(url.href, { waitUntil: 'domcontentloaded' });

			// Storybook's own render phase is the readiness signal: it reaches
			// `finished` only once the loaders, the decorators and the story's `play`
			// are all done, which a DOM check cannot see. The dev server transforms
			// each page module on first visit, so this is the slow wait.
			await page.waitForFunction(
				() =>
					(window.__STORYBOOK_PREVIEW__?.storyRenders ?? []).some((render) =>
						['finished', 'errored', 'aborted'].includes(render.phase),
					) || document.body.classList.contains('sb-show-errordisplay'),
				undefined,
				{ timeout: 120_000 },
			);

			await page.addStyleTag({ content: ignoreCss(ignoreSelectors) });
			if (!opts.motion) {
				// Videos and GIFs are parked on their first frame, as Chromatic does.
				await page.evaluate(() =>
					document.querySelectorAll('video').forEach((video) => video.pause?.()),
				);
			}

			// Text reflows when a webfont lands, so the shot waits for the faces the
			// page asked for. Some stories keep a request open by design, hence the
			// cap on the quiet wait rather than a plain networkidle.
			await page.evaluate(() => document.fonts.ready);
			const quietUntil = Date.now() + 15_000;
			while (
				Date.now() < quietUntil &&
				(inFlight > 0 || Date.now() - lastActivity < 600)
			) {
				await page.waitForTimeout(200);
			}
			await page.waitForTimeout(Number(opts.settle));

			// The width is the fixed dimension and the height follows the page, the
			// way a Chromatic viewport does. `src/styles.scss` pins
			// `html, body, #root` to `height: 100%; overflow: hidden`, so the
			// document can never outgrow the viewport and its height says nothing
			// about what is on the page: what overflows are the shell's inner
			// scrollers. `scrollers` grows the viewport until the tallest of those
			// fits, so nothing is cut off and no scrollbar is left in the shot.
			// Growing changes the layout, hence the rounds. A page that sizes a panel
			// in `vh` grows its own content as the viewport grows, so no height ever
			// fits it and the rounds only chase: `.alert-chart-container` is `57vh`,
			// which puts Create Alert's fixed point at 4344px with an empty band on
			// top. Such a page is shot at `--height` with its own scrollbar instead,
			// which is what it looks like in a browser.
			if (opts.grow !== 'none') {
				const maximum = Number(opts['max-height']);
				const requested = Number(opts.height);
				let height = requested;
				let fits = false;
				for (let round = 0; round < 3 && !fits; round += 1) {
					const needed = Math.min(
						maximum,
						await page.evaluate((withScrollers) => {
							const document_ = Math.max(
								document.documentElement.scrollHeight,
								document.body.scrollHeight,
							);
							if (!withScrollers) {
								return document_;
							}

							// Popups are skipped: they are out of the flow, and a tall
							// dropdown or tooltip would otherwise drag the shot to a
							// height nothing on the page itself needs.
							const inFlow = (element) => {
								for (
									let node = element;
									node && node !== document.documentElement;
									node = node.parentElement
								) {
									const { position } = getComputedStyle(node);
									if (position === 'fixed' || position === 'absolute') {
										return false;
									}
								}
								return true;
							};

							return [...document.querySelectorAll('*')].reduce((tallest, element) => {
								const { overflowY } = getComputedStyle(element);
								if (
									!['auto', 'scroll', 'overlay'].includes(overflowY) ||
									element.scrollHeight - element.clientHeight <= 1 ||
									!inFlow(element)
								) {
									return tallest;
								}

								const box = element.getBoundingClientRect();
								const above = box.top + window.scrollY;
								const below = Math.max(0, document_ - (box.bottom + window.scrollY));
								return Math.max(tallest, above + element.scrollHeight + below);
							}, document_);
						}, opts.grow === 'scrollers'),
					);
					fits = needed <= height;
					if (fits) {
						break;
					}

					height = needed;
					await page.setViewportSize({ width: Number(opts.width), height });
					await page.waitForTimeout(Number(opts.settle));
				}

				if (!fits && height !== requested) {
					chasing = height;
					height = requested;
					await page.setViewportSize({ width: Number(opts.width), height });
					await page.waitForTimeout(Number(opts.settle));
				}
			}

			// The preview snapped its bottom-pinned lists at `afterEach`, before the
			// page went quiet; a virtuoso list is usually still measuring then.
			await page.evaluate(() => window.__signozSnapPinnedScrollers?.());

			// A page that is still moving — a list scrolling itself to the bottom, a
			// monaco editor re-measuring, a tooltip being repositioned — is shot
			// twice in a row until two frames come back identical, since what the
			// page is waiting on is not observable from here.
			let shot = await page.screenshot();
			let stable = false;
			for (let attempt = 0; attempt < 8 && !stable; attempt += 1) {
				await page.waitForTimeout(400);
				const next = await page.screenshot();
				stable = next.equals(shot);
				shot = next;
			}

			const file = path.join(dir, `${story.id}.png`);
			await writeFile(file, shot);

			// The band goes on the shot itself so a single screenshot says what it
			// is, and its height is recorded so a diff can take it back off.
			let caption = 0;
			if (captioning) {
				const temporary = path.join(
					os.tmpdir(),
					`story-shots-caption-${process.pid}.png`,
				);
				caption = stamp({
					lines: [
						`${story.title}/${story.name}`,
						[story.id, theme ?? 'default', stable ? '' : '(busy)']
							.filter(Boolean)
							.join('  '),
						configLine,
					].filter(Boolean),
					from: file,
					to: temporary,
					theme: theme ?? 'dark',
				});
				await rename(temporary, file);
			}

			shots.push({
				file: path.posix.join(
					opts.flat ? '' : (theme ?? 'default'),
					`${story.id}.png`,
				),
				id: story.id,
				title: story.title,
				name: story.name,
				theme: theme ?? 'default',
				status: stable ? 'ok' : 'busy',
				caption,
			});
			console.log(
				`  ${stable ? 'ok  ' : 'busy'} ${story.id}${
					chasing ? ` (viewport-sized content, stopped chasing ${chasing}px)` : ''
				}`,
			);
		} catch (error) {
			failures.push(`${theme ?? 'default'}/${story.id}`);
			console.log(`  FAIL ${story.id}: ${error.message.split('\n')[0]}`);
		} finally {
			await context.close();
		}
	}
}

await browser.close();

// The diff script captions its output from this, so the run's own settings sit
// next to the shots they produced rather than only in the shell history.
await writeFile(
	path.join(outDir, 'shots.json'),
	`${JSON.stringify({ config: runConfig, shots }, null, '\t')}\n`,
);

if (failures.length) {
	console.error(`\n${failures.length} failed: ${failures.join(', ')}`);
	process.exit(1);
}
