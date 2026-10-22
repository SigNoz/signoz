import 'tests/blob-polyfill';

import { stitchCsvParts, stitchJsonlParts } from '../stitchParts';

const blob = (content: string): Blob => new Blob([content]);

describe('stitchCsvParts', () => {
	it('keeps a single part as-is', async () => {
		const out = await stitchCsvParts([blob('h1,h2\na,b\n')]);
		await expect(out.text()).resolves.toBe('h1,h2\na,b\n');
		expect(out.type).toBe('text/csv');
	});

	it('strips the header row from parts after the first', async () => {
		const out = await stitchCsvParts([
			blob('h1,h2\na,b\n'),
			blob('h1,h2\nc,d\n'),
			blob('h1,h2\ne,f\n'),
		]);
		await expect(out.text()).resolves.toBe('h1,h2\na,b\nc,d\ne,f\n');
	});

	it('handles CRLF line endings (the \\r dies with the header)', async () => {
		const out = await stitchCsvParts([
			blob('h1,h2\r\na,b\r\n'),
			blob('h1,h2\r\nc,d\r\n'),
		]);
		await expect(out.text()).resolves.toBe('h1,h2\r\na,b\r\nc,d\r\n');
	});

	it('inserts a newline at the seam when a part lacks a trailing one', async () => {
		const out = await stitchCsvParts([blob('h1,h2\na,b'), blob('h1,h2\nc,d')]);
		await expect(out.text()).resolves.toBe('h1,h2\na,b\nc,d\n');
	});

	it('preserves multi-byte characters around the header boundary', async () => {
		const out = await stitchCsvParts([
			blob('höader,h2\naä,b\n'),
			blob('höader,h2\ncö,d\n'),
		]);
		await expect(out.text()).resolves.toBe('höader,h2\naä,b\ncö,d\n');
	});

	it('strips headers longer than the initial 8KB sniff window', async () => {
		// Forces findFirstNewlineEnd through its window-doubling path.
		const hugeHeader = Array.from({ length: 1200 }, (_, i) => `column_${i}`).join(
			',',
		);
		expect(hugeHeader.length).toBeGreaterThan(8192);
		const out = await stitchCsvParts([
			blob(`${hugeHeader}\na,b\n`),
			blob(`${hugeHeader}\nc,d\n`),
		]);
		await expect(out.text()).resolves.toBe(`${hugeHeader}\na,b\nc,d\n`);
	});

	it('skips empty and header-only parts', async () => {
		const out = await stitchCsvParts([
			blob('h1,h2\na,b\n'),
			blob(''),
			blob('h1,h2\n'),
			blob('h1,h2'),
			blob('h1,h2\nc,d\n'),
		]);
		await expect(out.text()).resolves.toBe('h1,h2\na,b\nc,d\n');
	});

	it('returns an empty blob for no parts', async () => {
		const out = await stitchCsvParts([]);
		expect(out.size).toBe(0);
	});
});

describe('stitchJsonlParts', () => {
	it('concatenates parts without stripping anything', async () => {
		const out = await stitchJsonlParts([
			blob('{"a":1}\n{"a":2}\n'),
			blob('{"a":3}\n'),
		]);
		await expect(out.text()).resolves.toBe('{"a":1}\n{"a":2}\n{"a":3}\n');
		expect(out.type).toBe('application/x-ndjson');
	});

	it('guards the seam when a part lacks a trailing newline', async () => {
		const out = await stitchJsonlParts([blob('{"a":1}'), blob('{"a":2}')]);
		const text = await out.text();
		expect(text).toBe('{"a":1}\n{"a":2}\n');
		// Every line must stay independently parseable.
		const lines = text.trim().split('\n');
		expect(lines.map((line) => JSON.parse(line))).toStrictEqual([
			{ a: 1 },
			{ a: 2 },
		]);
	});

	it('skips empty parts', async () => {
		const out = await stitchJsonlParts([blob(''), blob('{"a":1}\n'), blob('')]);
		await expect(out.text()).resolves.toBe('{"a":1}\n');
	});
});
