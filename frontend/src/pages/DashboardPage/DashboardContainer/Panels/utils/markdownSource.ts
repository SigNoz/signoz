/** Fenced regions, whose markup is source text rather than a rendered construct. */
const FENCE = /^([ \t]*)(`{3,}|~{3,})[^\n]*\n[\s\S]*?(?:\n\1\2[^\n]*|$)/gm;

/**
 * Blanks fenced code, preserving length so offsets still line up. A construct
 * inside a fence renders as text, so counting it would misalign the rest.
 */
export function maskFencedCode(markdown: string): string {
	return markdown.replace(FENCE, (block) => block.replace(/[^\n]/g, ' '));
}

/** Offsets of every match of `pattern` in `markdown`, ignoring fenced code. */
export function matchOffsets(
	markdown: string,
	pattern: RegExp,
	/** Offset within the match of the span the rewrite targets. */
	spanOffset: (match: RegExpExecArray) => number,
): number[] {
	const masked = maskFencedCode(markdown);
	const scan = new RegExp(pattern.source, pattern.flags);
	const offsets: number[] = [];
	let match = scan.exec(masked);
	while (match !== null) {
		offsets.push(match.index + spanOffset(match));
		match = scan.exec(masked);
	}
	return offsets;
}

/**
 * A markdown construct whose rendered element writes back to the source. Add one
 * of these plus an element override in `MarkdownContent` to make another element
 * interactive.
 */
export interface EditableConstruct<T> {
	/** Offset of each occurrence's editable span, in document order. */
	offsets: (markdown: string) => number[];
	/** Rewrites the span at `offset` to `value`. */
	rewrite: (markdown: string, offset: number, value: T) => string;
}

/**
 * Maps a rendered element back to the same ordinal in the source and rewrites it.
 *
 * Variables are interpolated before parsing, so a rendered offset is not a source
 * offset. The ordinal only holds while both bodies carry the same number of the
 * construct — a variable value with one of its own shifts everything after it —
 * so a mismatch returns `null` rather than editing the wrong occurrence.
 */
export function editRenderedOccurrence<T>(
	construct: EditableConstruct<T>,
	{
		source,
		rendered,
		renderedOffset,
		value,
	}: { source: string; rendered: string; renderedOffset: number; value: T },
): string | null {
	const sourceOffsets = construct.offsets(source);
	const renderedOffsets = construct.offsets(rendered);
	if (sourceOffsets.length !== renderedOffsets.length) {
		return null;
	}

	const ordinal = renderedOffsets.filter(
		(start) => start < renderedOffset,
	).length;
	const target = sourceOffsets[ordinal];
	if (target === undefined) {
		return null;
	}
	return construct.rewrite(source, target, value);
}
