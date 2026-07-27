/**
 * Stitches sequentially-fetched export parts (Blobs) into one downloadable
 * Blob. Pure blob surgery — parts are never parsed and `Blob.slice`/`new Blob`
 * are zero-copy, so nothing here scales with the data size except the final
 * browser-managed blob itself.
 */

const HEADER_SNIFF_BYTES = 8192;
const NEWLINE_BYTE = 0x0a;

/** Byte offset just past the first newline, or -1 when the blob has none. */
async function findFirstNewlineEnd(blob: Blob): Promise<number> {
	let sniffBytes = HEADER_SNIFF_BYTES;
	for (;;) {
		// eslint-disable-next-line no-await-in-loop
		const bytes = new Uint8Array(await blob.slice(0, sniffBytes).arrayBuffer());
		const newlineIdx = bytes.indexOf(NEWLINE_BYTE);
		if (newlineIdx !== -1) {
			return newlineIdx + 1;
		}
		if (sniffBytes >= blob.size) {
			return -1;
		}
		sniffBytes *= 2;
	}
}

async function endsWithNewline(blob: Blob): Promise<boolean> {
	const lastByte = new Uint8Array(await blob.slice(blob.size - 1).arrayBuffer());
	return lastByte[0] === NEWLINE_BYTE;
}

async function stitchParts(
	parts: Blob[],
	{
		stripHeaderAfterFirst,
		mime,
	}: { stripHeaderAfterFirst: boolean; mime: string },
): Promise<Blob> {
	const pieces: (Blob | string)[] = [];

	for (let index = 0; index < parts.length; index += 1) {
		let piece = parts[index];

		if (stripHeaderAfterFirst && index > 0) {
			// Every part re-sends the header row; drop it on parts 2..N. Byte-level
			// search (not text) so multi-byte characters can't skew the offset.
			// ASSUMPTION: the first newline byte ends the header row — i.e. no
			// column name contains an embedded (RFC 4180 quoted) newline. Header
			// cells are telemetry field names, which can't carry newlines; quoted
			// newlines in DATA rows are fine (we only search from byte 0).
			// eslint-disable-next-line no-await-in-loop
			const headerEnd = await findFirstNewlineEnd(piece);
			// A part without any newline is header-only — nothing to keep.
			piece = headerEnd === -1 ? piece.slice(piece.size) : piece.slice(headerEnd);
		}

		if (piece.size === 0) {
			continue;
		}

		pieces.push(piece);
		// Guard the seam: without a trailing newline the next part's first row
		// would concatenate onto this part's last row.
		// eslint-disable-next-line no-await-in-loop
		if (!(await endsWithNewline(piece))) {
			pieces.push('\n');
		}
	}

	return new Blob(pieces, { type: mime });
}

/** Combines CSV parts: part 1 keeps its header, parts 2..N are decapitated. */
export async function stitchCsvParts(parts: Blob[]): Promise<Blob> {
	return stitchParts(parts, { stripHeaderAfterFirst: true, mime: 'text/csv' });
}

/** Combines JSONL parts: plain concatenation with a newline guard per seam. */
export async function stitchJsonlParts(parts: Blob[]): Promise<Blob> {
	return stitchParts(parts, {
		stripHeaderAfterFirst: false,
		mime: 'application/x-ndjson',
	});
}
