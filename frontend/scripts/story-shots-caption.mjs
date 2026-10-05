import { spawnSync } from 'node:child_process';

/**
 * The caption band both story-shots.mjs and story-shots-diff.mjs stamp on their
 * output, and the ImageMagick plumbing under it. A shot records the band's
 * height in `shots.json` so the diff can crop it back off before comparing:
 * otherwise two runs whose captions differ would report the caption as a change.
 */
export const CONFIG_KEYS = [
	'args',
	'clock',
	'width',
	'height',
	'grow',
	'motion',
	'settle',
	'ignore',
];

let tools;

const detect = () =>
	(tools ??= {
		seven: spawnSync('magick', ['-version']).status === 0,
		six: spawnSync('convert', ['-version']).status === 0,
	});

export const hasMagick = () => {
	const { seven, six } = detect();
	return seven || six;
};

export const requireMagick = () => {
	if (hasMagick()) {
		return;
	}
	console.error(
		'ImageMagick not found. Install it (brew install imagemagick, apt install imagemagick).',
	);
	process.exit(1);
};

export const magick = (args, input) => {
	// ImageMagick 6 has no `magick`: its tools are separate binaries.
	const [command, ...rest] = detect().seven
		? ['magick', ...args]
		: ['identify', 'montage'].includes(args[0])
			? args
			: ['convert', ...args];
	const result = spawnSync(command, rest, {
		input,
		maxBuffer: 1024 * 1024 * 1024,
	});
	if (result.status !== 0) {
		throw new Error(`${command} ${rest.join(' ')}: ${result.stderr}`);
	}
	return result.stdout;
};

/**
 * ImageMagick's built-in default is a serif that reads as a book, not as a
 * screenshot label, so the band asks for what is installed: a sans for the
 * heading, a mono for the lines that carry ids, args and numbers. An
 * unrecognised name is fatal to `convert`, hence the check against the list it
 * reports; a machine with none of them keeps the default.
 */
const FONTS = {
	heading: [
		'Helvetica-Bold',
		'DejaVu-Sans-Bold',
		'Liberation-Sans-Bold',
		'Arial-Bold',
		'Noto-Sans-Bold',
		'DejaVu-Sans',
		'Liberation-Sans',
	],
	body: [
		'Menlo',
		'DejaVu-Sans-Mono',
		'Liberation-Mono',
		'JetBrainsMono-NF-Regular',
		'Courier',
	],
};

let installed;

const fontArgs = (role) => {
	installed ??= new Set(
		[
			...magick(['-list', 'font'])
				.toString()
				.matchAll(/^\s*Font:\s*(\S+)/gm),
		].map(([, name]) => name),
	);
	const font = FONTS[role].find((name) => installed.has(name));
	return font ? ['-font', font] : [];
};

/** Readable at fit-to-width, whatever the image is. */
export const pointsize = (width) =>
	Math.min(Math.max(Math.round(width / 45), 24), 140);

// `label:` expands ImageMagick's own escapes and reads a file when the text
// starts with @, so story names and arg values go through neither.
export const bodyFont = () => fontArgs('body');

export const literal = (text) => text.replaceAll('%', '%%').replace(/^@/, ' @');

/** The gutter is the opposite of the theme, so the band keeps an edge. */
export const palette = (theme) =>
	theme === 'light'
		? { background: '#101014', foreground: '#f4f4f5' }
		: { background: '#f4f4f5', foreground: '#101014' };

export const settingsLine = (config, keys = CONFIG_KEYS) =>
	keys
		.filter((key) => config?.[key])
		.map((key) => `${key}:${config[key]}`)
		.join('  ');

const heightOf = (file) => Number(magick(['identify', '-format', '%h', file]));

/**
 * Writes `from` to `to` with `lines` above it, and returns how many rows that
 * added — which is what a reader has to crop off to get the original back, so
 * the band must never change the width. Each line is a `caption:` at the
 * image's own width, wrapping instead of widening the canvas: a run whose
 * caption is longer must still produce a shot the next run's shot pairs with.
 * Type size follows the width, since a three-tile montage of 1680px shots is
 * over 5000px wide and is read at fit-to-width.
 */
export const stamp = ({ lines, from, to, theme }) => {
	const { background, foreground } = palette(theme);
	const width = Number(magick(['identify', '-format', '%w', from]));
	const heading = pointsize(width);
	const before = heightOf(from);
	const spacer = [
		'-size',
		`${width}x${Math.round(heading * 0.4)}`,
		`xc:${background}`,
	];

	magick([
		'-background',
		background,
		'-fill',
		foreground,
		'-gravity',
		'center',
		...spacer,
		...lines.flatMap((line, index) => [
			...fontArgs(index ? 'body' : 'heading'),
			'-size',
			`${width}x`,
			'-pointsize',
			String(index ? Math.round(heading * 0.62) : heading),
			`caption:${literal(line)}`,
		]),
		...spacer,
		from,
		'-append',
		to,
	]);

	return heightOf(to) - before;
};
