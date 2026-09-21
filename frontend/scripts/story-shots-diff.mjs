#!/usr/bin/env node
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import path from 'node:path';

import {
	bodyFont,
	CONFIG_KEYS,
	literal,
	magick,
	palette,
	pointsize,
	requireMagick,
	settingsLine,
	stamp,
} from './story-shots-caption.mjs';

/**
 * Pairs the PNGs of two story-shots.mjs runs by relative path and reports what
 * moved, per pair, largest first. A shot only one run has is reported too,
 * labelled with the side it is missing from and counted as changed in full.
 *
 * The comparison is Chromatic's: a pixel counts as changed when its YIQ
 * distance from the baseline pixel is over `threshold` of the largest distance
 * two colours can have, and pixels that are only antialiasing around an
 * otherwise identical edge do not count. `threshold` is their `diffThreshold`
 * and its default is theirs too.
 */
const MAX_YIQ_DELTA = 35_215;

const { values: opts, positionals } = parseArgs({
	allowPositionals: true,
	options: {
		mode: { type: 'string', default: 'green' },
		threshold: { type: 'string', default: '0.063' },
		'include-aa': { type: 'boolean', default: false },
		tint: { type: 'string', default: '' },
		'no-caption': { type: 'boolean', default: false },
		help: { type: 'boolean', short: 'h', default: false },
	},
});

const [baseDir, afterDir, outArg] = positionals;
const MODES = new Set(['green', 'green-parallel', 'red', 'red-parallel']);

if (opts.help || !baseDir || !afterDir || !MODES.has(opts.mode)) {
	console.log(`usage: node scripts/story-shots-diff.mjs <baseline-dir> <after-dir> [diff-dir]

  --mode green           the after shot, changed pixels painted over it (default)
  --mode green-parallel  previous | current | green diff, side by side and labelled
  --mode red             the after shot faded out, changed pixels painted red
  --mode red-parallel    previous | current | red diff, side by side and labelled
  --threshold <0..1>     YIQ distance a pixel must move to count (default 0.063)
  --include-aa           count antialiasing changes too (default: ignore them)
  --tint <#rrggbb>       override the mode's highlight colour
  --no-caption           do not stamp the story and the run settings on top

Prints "<changed pixels>  <relative path>", largest first; a shot only one run
has is printed as "(missing previous)" or "(missing current)". Needs ImageMagick.`);
	process.exit(opts.help ? 0 : 1);
}

const outDir = outArg ?? path.join(path.dirname(baseDir), 'diff');
const threshold = Number(opts.threshold);
const maxDelta = MAX_YIQ_DELTA * threshold * threshold;
const highlight = hexToRgb(
	opts.tint || (opts.mode.startsWith('green') ? '#00e05a' : '#ff003a'),
);

function hexToRgb(hex) {
	const value = Number.parseInt(hex.replace('#', ''), 16);
	return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

requireMagick();

/**
 * `top` rows are dropped: story-shots.mjs stamps a caption on its shots and
 * records how tall it is, and a caption is not part of what the two runs are
 * being compared on.
 */
const readRgba = (file, top = 0) => {
	const [width, height] = magick(['identify', '-format', '%w %h', file])
		.toString()
		.split(' ')
		.map(Number);
	const data = magick([file, '-depth', '8', 'RGBA:-']);
	return top > 0 && top < height
		? { width, height: height - top, data: data.subarray(top * width * 4) }
		: { width, height, data };
};

const writeRgba = ({ width, height, data }, file) =>
	writeFile(
		file,
		magick(
			['-depth', '8', '-size', `${width}x${height}`, 'RGBA:-', 'png:-'],
			data,
		),
	);

/* The pixelmatch colour maths, which is what Chromatic's threshold is scaled to. */
const y = (r, g, b) => r * 0.29889531 + g * 0.58662247 + b * 0.11448223;
const i = (r, g, b) => r * 0.59597799 - g * 0.2741761 - b * 0.32180189;
const q = (r, g, b) => r * 0.21147017 - g * 0.52261711 + b * 0.31114694;

/** Squared YIQ distance, signed by which pixel is brighter. */
const colorDelta = (a, b, posA, posB, yOnly = false) => {
	let r1 = a[posA];
	let g1 = a[posA + 1];
	let b1 = a[posA + 2];
	const a1 = a[posA + 3];
	let r2 = b[posB];
	let g2 = b[posB + 1];
	let b2 = b[posB + 2];
	const a2 = b[posB + 3];

	if (a1 === a2 && r1 === r2 && g1 === g2 && b1 === b2) {
		return 0;
	}

	// Anything translucent is composited over the same mid grey in both images,
	// so a difference in alpha alone still registers.
	if (a1 < 255) {
		const alpha = a1 / 255;
		r1 = r1 * alpha + 255 * (1 - alpha) * 0.5;
		g1 = g1 * alpha + 255 * (1 - alpha) * 0.5;
		b1 = b1 * alpha + 255 * (1 - alpha) * 0.5;
	}
	if (a2 < 255) {
		const alpha = a2 / 255;
		r2 = r2 * alpha + 255 * (1 - alpha) * 0.5;
		g2 = g2 * alpha + 255 * (1 - alpha) * 0.5;
		b2 = b2 * alpha + 255 * (1 - alpha) * 0.5;
	}

	const deltaY = y(r1, g1, b1) - y(r2, g2, b2);
	if (yOnly) {
		return deltaY;
	}

	const deltaI = i(r1, g1, b1) - i(r2, g2, b2);
	const deltaQ = q(r1, g1, b1) - q(r2, g2, b2);
	return (
		0.5053 * deltaY * deltaY + 0.299 * deltaI * deltaI + 0.1957 * deltaQ * deltaQ
	);
};

/**
 * True when the pixel sits on an edge that is drawn one subpixel over rather
 * than moved: it is the darkest or lightest of its neighbours in one image, and
 * the other image has a pixel around there doing the same job.
 */
const antialiased = (a, x1, y1, width, height, b) => {
	const x0 = Math.max(x1 - 1, 0);
	const y0 = Math.max(y1 - 1, 0);
	const x2 = Math.min(x1 + 1, width - 1);
	const y2 = Math.min(y1 + 1, height - 1);
	const pos = (y1 * width + x1) * 4;
	let zeroes = x1 === x0 || x1 === x2 || y1 === y0 || y1 === y2 ? 1 : 0;
	let min = 0;
	let max = 0;
	let minX = 0;
	let minY = 0;
	let maxX = 0;
	let maxY = 0;

	for (let x = x0; x <= x2; x += 1) {
		for (let yy = y0; yy <= y2; yy += 1) {
			if (x === x1 && yy === y1) {
				continue;
			}

			const delta = colorDelta(a, a, pos, (yy * width + x) * 4, true);
			if (delta === 0) {
				zeroes += 1;
				if (zeroes > 2) {
					return false;
				}
			} else if (delta < min) {
				min = delta;
				minX = x;
				minY = yy;
			} else if (delta > max) {
				max = delta;
				maxX = x;
				maxY = yy;
			}
		}
	}

	if (min === 0 || max === 0) {
		return false;
	}

	return (
		(hasManySiblings(a, minX, minY, width, height) &&
			hasManySiblings(b, minX, minY, width, height)) ||
		(hasManySiblings(a, maxX, maxY, width, height) &&
			hasManySiblings(b, maxX, maxY, width, height))
	);
};

/** Whether the pixel has at least three identical neighbours. */
const hasManySiblings = (img, x1, y1, width, height) => {
	const x0 = Math.max(x1 - 1, 0);
	const y0 = Math.max(y1 - 1, 0);
	const x2 = Math.min(x1 + 1, width - 1);
	const y2 = Math.min(y1 + 1, height - 1);
	const pos = (y1 * width + x1) * 4;
	let zeroes = x1 === x0 || x1 === x2 || y1 === y0 || y1 === y2 ? 1 : 0;

	for (let x = x0; x <= x2; x += 1) {
		for (let yy = y0; yy <= y2; yy += 1) {
			if (x === x1 && yy === y1) {
				continue;
			}

			const other = (yy * width + x) * 4;
			if (
				img[pos] === img[other] &&
				img[pos + 1] === img[other + 1] &&
				img[pos + 2] === img[other + 2] &&
				img[pos + 3] === img[other + 3]
			) {
				zeroes += 1;
				if (zeroes > 2) {
					return true;
				}
			}
		}
	}

	return false;
};

/**
 * The changed pixels of the pair, painted over the after shot. The `red` modes
 * fade the shot out first, the way a pixelmatch diff reads; the `green` ones
 * leave it alone, the way Chromatic's does.
 */
const diffPair = (base, after, mode) => {
	const width = Math.min(base.width, after.width);
	const height = Math.min(base.height, after.height);
	const out = Buffer.from(after.data);
	const fade = !mode.startsWith('green');
	let changed = 0;

	if (fade) {
		for (let pos = 0; pos < out.length; pos += 4) {
			const grey = y(out[pos], out[pos + 1], out[pos + 2]);
			const value = 255 + (grey - 255) * 0.1;
			out[pos] = value;
			out[pos + 1] = value;
			out[pos + 2] = value;
			out[pos + 3] = 255;
		}
	}

	for (let row = 0; row < height; row += 1) {
		for (let column = 0; column < width; column += 1) {
			const basePos = (row * base.width + column) * 4;
			const afterPos = (row * after.width + column) * 4;
			const delta = colorDelta(base.data, after.data, basePos, afterPos);
			if (Math.abs(delta) <= maxDelta) {
				continue;
			}
			if (
				!opts['include-aa'] &&
				(antialiased(base.data, column, row, base.width, base.height, after.data) ||
					antialiased(after.data, column, row, after.width, after.height, base.data))
			) {
				continue;
			}

			changed += 1;
			out[afterPos] = highlight[0];
			out[afterPos + 1] = highlight[1];
			out[afterPos + 2] = highlight[2];
			out[afterPos + 3] = 255;
		}
	}

	// A shot that grew or shrank has no counterpart for the extra rows and
	// columns, so all of them are a change.
	const extra =
		after.width * after.height -
		width * height +
		(base.width * base.height - width * height);

	return {
		data: out,
		width: after.width,
		height: after.height,
		changed: changed + extra,
	};
};

/**
 * What each run was and how it was configured, from the `shots.json`
 * story-shots.mjs leaves beside its output. A run shot before that existed, or
 * a directory assembled by hand, simply gets no caption.
 */
const manifest = async (dir) => {
	try {
		return JSON.parse(await readFile(path.join(dir, 'shots.json'), 'utf8'));
	} catch {
		return null;
	}
};

const [baseRun, afterRun] = await Promise.all([
	manifest(baseDir),
	manifest(afterDir),
]);

/** The settings the two runs disagree on: what a difference in the shots may be. */
const changedKeys = CONFIG_KEYS.filter(
	(key) => (baseRun?.config?.[key] ?? '') !== (afterRun?.config?.[key] ?? ''),
);

const settings = (run, keys) => settingsLine(run?.config, keys);

const shotOf = (run, rel) =>
	run?.shots?.find((shot) => shot.file === rel.split(path.sep).join('/'));

const captionOf = (run, rel) => shotOf(run, rel)?.caption ?? 0;

/** What the shot was shot in, falling back to the directory it sits in. */
const themeOf = (rel) =>
	(shotOf(afterRun, rel) ?? shotOf(baseRun, rel))?.theme ??
	rel.split(path.sep)[0];

/** ImageMagick's inline crop, so a tile shows the shot without its caption. */
const withoutCaption = (file, { width, height }, top) =>
	top > 0 ? `${file}[${width}x${height}+0+${top}]` : file;

/** Story, then the settings both runs shared. One line each, widest font first. */
const header = (rel) => {
	const shot = shotOf(afterRun, rel) ?? shotOf(baseRun, rel);
	const shared = settings(
		afterRun,
		CONFIG_KEYS.filter((key) => !changedKeys.includes(key)),
	);
	return [
		shot ? `${shot.title}/${shot.name}` : rel.replace(/\.png$/, ''),
		[shot?.id ?? '', shot?.theme ?? '', shot?.status === 'busy' ? '(busy)' : '']
			.filter(Boolean)
			.join('  '),
		shared,
	].filter(Boolean);
};

/** A tile's own line: which side it is, and where its run differed. */
const sideLabel = (side, run) =>
	[side, settings(run, changedKeys)].filter(Boolean).join('   ');

const captionLines = (rel, lines) =>
	opts['no-caption'] ? [] : [...header(rel), ...lines].filter(Boolean);

const pngs = async (dir, prefix = '') => {
	const entries = await readdir(path.join(dir, prefix), { withFileTypes: true });
	const files = [];
	for (const entry of entries) {
		const rel = path.join(prefix, entry.name);
		if (entry.isDirectory()) {
			files.push(...(await pngs(dir, rel)));
		} else if (entry.name.endsWith('.png')) {
			files.push(rel);
		}
	}
	return files;
};

const results = [];
await mkdir(outDir, { recursive: true });

/** The half-built tiles, under the output directory so nothing is left elsewhere. */
const scratch = Object.fromEntries(
	['body', 'diff', 'shot', 'missing'].map((name) => [
		name,
		path.join(outDir, `.story-shots-${process.pid}-${name}.png`),
	]),
);

/** One labelled tile of a parallel montage. */
const tile = (label, file, background) => [
	'(',
	`label:${literal(label)}`,
	file,
	'-gravity',
	'center',
	'-append',
	'-bordercolor',
	background,
	'-border',
	'12',
	')',
];

/** The tiles side by side under one caption. */
const montage = ({
	tiles,
	width,
	background,
	foreground,
	caption,
	target,
	theme,
}) => {
	magick([
		'-background',
		background,
		'-fill',
		foreground,
		...bodyFont(),
		'-pointsize',
		// The tiles end up side by side, so they are read at the montage's width.
		String(Math.round(pointsize(width * 3) * 0.62)),
		...tiles.flat(),
		'-gravity',
		'north',
		'+append',
		caption.length ? scratch.body : target,
	]);
	if (caption.length) {
		stamp({ lines: caption, from: scratch.body, to: target, theme });
	}
};

/**
 * A tile standing in for a shot the run does not have, sized like the one it
 * does. The gutter's colours are the theme's own inverted, so they go back the
 * other way here and the tile reads as a shot rather than as a hole.
 */
const placeholder = (
	file,
	{ width, height },
	text,
	{ background, foreground },
) =>
	magick([
		'-size',
		`${width}x${height}`,
		'-background',
		foreground,
		'-fill',
		background,
		'-gravity',
		'center',
		...bodyFont(),
		'-pointsize',
		String(pointsize(width * 3)),
		`label:${literal(text)}`,
		file,
	]);

const [baseFiles, afterFiles] = await Promise.all([
	pngs(baseDir),
	pngs(afterDir),
]);
const inBase = new Set(baseFiles);
const inAfter = new Set(afterFiles);

for (const rel of [...new Set([...baseFiles, ...afterFiles])].sort((a, b) =>
	a.localeCompare(b),
)) {
	const afterFile = path.join(afterDir, rel);
	const target = path.join(outDir, rel);
	await mkdir(path.join(outDir, path.dirname(rel)), { recursive: true });

	// A story added, removed or renamed since the baseline has nothing to
	// compare against, so the side that does have it is written out under the
	// label of the side that does not, and every one of its pixels counts.
	if (!inBase.has(rel) || !inAfter.has(rel)) {
		const gone = inAfter.has(rel) ? 'previous' : 'current';
		const held = gone === 'previous' ? 'current' : 'previous';
		const run = gone === 'previous' ? afterRun : baseRun;
		const image = readRgba(
			gone === 'previous' ? afterFile : path.join(baseDir, rel),
			captionOf(run, rel),
		);
		const theme = themeOf(rel);
		const colors = palette(theme);
		const caption = captionLines(rel, [`missing ${gone}`]);

		if (opts.mode.endsWith('-parallel')) {
			// The montage keeps its three tiles: the run that has the shot shows it,
			// and the run that does not, like the diff, says so in its place. There
			// is nothing to compare, so nothing is tinted.
			await writeRgba(image, scratch.shot);
			placeholder(scratch.missing, image, `missing ${gone}`, colors);

			const sides = {
				[held]: tile(sideLabel(held, run), scratch.shot, colors.background),
				[gone]: tile(
					sideLabel(gone, gone === 'previous' ? baseRun : afterRun),
					scratch.missing,
					colors.background,
				),
			};
			montage({
				tiles: [
					sides.previous,
					sides.current,
					tile('diff', scratch.missing, colors.background),
				],
				width: image.width,
				...colors,
				caption,
				target,
				theme,
			});
		} else {
			await writeRgba(image, caption.length ? scratch.body : target);
			if (caption.length) {
				stamp({ lines: caption, from: scratch.body, to: target, theme });
			}
		}

		results.push([image.width * image.height, rel, `missing ${gone}`]);
		continue;
	}

	const base = readRgba(path.join(baseDir, rel), captionOf(baseRun, rel));
	const after = readRgba(afterFile, captionOf(afterRun, rel));
	const diff = diffPair(base, after, opts.mode);
	const parallel = opts.mode.endsWith('-parallel');
	// With no tiles to label, a run's own settings go in the caption instead.
	const caption = captionLines(
		rel,
		parallel || !changedKeys.length
			? []
			: [sideLabel('previous', baseRun), sideLabel('current', afterRun)],
	);

	// The gutter is the opposite of the theme's own background, so the tiles and
	// the caption keep an edge instead of bleeding into it.
	const theme = themeOf(rel);
	const { background, foreground } = palette(theme);

	if (parallel) {
		await writeRgba(diff, scratch.diff);
		montage({
			tiles: [
				tile(
					sideLabel('previous', baseRun),
					withoutCaption(path.join(baseDir, rel), base, captionOf(baseRun, rel)),
					background,
				),
				tile(
					sideLabel('current', afterRun),
					withoutCaption(afterFile, after, captionOf(afterRun, rel)),
					background,
				),
				tile('diff', scratch.diff, background),
			],
			width: after.width,
			background,
			foreground,
			caption,
			target,
			theme,
		});
	} else {
		await writeRgba(diff, caption.length ? scratch.body : target);
		if (caption.length) {
			stamp({ lines: caption, from: scratch.body, to: target, theme });
		}
	}

	results.push([diff.changed, rel]);
}

await Promise.all(
	Object.values(scratch).map((file) => rm(file, { force: true })),
);

results
	.sort((a, b) => b[0] - a[0])
	.forEach(([changed, rel, note]) => {
		const suffix = note ? `  (${note})` : '';
		console.log(`${String(changed).padStart(10)}  ${rel}${suffix}`);
	});

console.error(`diffs in ${outDir}`);
