import type { EditorCommand, EditorSnapshot, EditorTransform } from './types';

const BOLD_MARKER = '**';
const ITALIC_MARKER = '_';
const INLINE_CODE_MARKER = '`';
const CODE_FENCE = '```';
const HEADING_PREFIX = '## ';
const BULLET_MARKER = '- ';

const HEADING_PATTERN = /^ {0,3}#{1,6} /;
const BULLET_LIST_PATTERN = /^[ \t]*[-*+] /;
const ORDERED_LIST_PATTERN = /^[ \t]*\d+\. /;
// Either kind of marker, matched after the indent has been split off.
const LIST_MARKER_PATTERN = /^(?:[-*+]|\d+\.) /;
const INDENT_PATTERN = /^[ \t]*/;

const LINK_LABEL_PLACEHOLDER = 'text';
const LINK_URL_PLACEHOLDER = 'https://';
const TABLE_CELL_PLACEHOLDER = 'Column';
const TABLE_SNIPPET = [
	`| ${TABLE_CELL_PLACEHOLDER} | ${TABLE_CELL_PLACEHOLDER} |`,
	'| --- | --- |',
	'|  |  |',
].join('\n');

interface LineRange {
	start: number;
	end: number;
}

// A selection ending exactly on a line break stops there rather than pulling in
// the next line, so "select the line, hit list" doesn't bullet the line below too.
function expandToLines(text: string, from: number, to: number): LineRange {
	const end = to > from && text[to - 1] === '\n' ? to - 1 : to;
	const breakBefore = from === 0 ? -1 : text.lastIndexOf('\n', from - 1);
	const breakAfter = text.indexOf('\n', end);
	return {
		start: breakBefore + 1,
		end: breakAfter === -1 ? text.length : breakAfter,
	};
}

/** Pads `block` so it starts and ends on its own line. */
function replaceWithBlock(
	snapshot: EditorSnapshot,
	block: string,
): { text: string; blockStart: number } {
	const { text, selectionStart, selectionEnd } = snapshot;
	const before = text.slice(0, selectionStart);
	const after = text.slice(selectionEnd);
	const lead = before === '' || before.endsWith('\n') ? '' : '\n';
	const trail = after === '' || after.startsWith('\n') ? '' : '\n';
	return {
		text: before + lead + block + trail + after,
		blockStart: before.length + lead.length,
	};
}

/** Rewrites every line the selection touches. */
function replaceLines(
	snapshot: EditorSnapshot,
	mapLines: (lines: string[]) => string[],
): EditorSnapshot {
	const { text, selectionStart, selectionEnd } = snapshot;
	const { start, end } = expandToLines(text, selectionStart, selectionEnd);
	const lines = text.slice(start, end).split('\n');
	const nextLines = mapLines(lines);
	const block = nextLines.join('\n');
	const nextText = text.slice(0, start) + block + text.slice(end);

	if (selectionStart !== selectionEnd) {
		return {
			text: nextText,
			selectionStart: start,
			selectionEnd: start + block.length,
		};
	}

	// Caret-only: the range covers one line, so shift by that line's delta.
	const shifted = selectionStart + nextLines[0].length - lines[0].length;
	const caret = Math.min(Math.max(shifted, start), start + nextLines[0].length);
	return { text: nextText, selectionStart: caret, selectionEnd: caret };
}

/** Strips `prefix` when every selected line already matches `pattern`, else adds it. */
function toggleLinePrefix(prefix: string, pattern: RegExp): EditorTransform {
	return (snapshot): EditorSnapshot =>
		replaceLines(snapshot, (lines) => {
			const isApplied = lines.every((line) => pattern.test(line));
			return lines.map((line) =>
				isApplied ? line.replace(pattern, '') : `${prefix}${line}`,
			);
		});
}

/**
 * Toggles this kind of list marker. A line carrying the *other* kind is converted
 * rather than marked twice, and indentation is preserved so nesting survives.
 * `markerAt` takes the line's position, which is what lets an ordered list number.
 */
function toggleList(
	pattern: RegExp,
	markerAt: (index: number) => string,
): EditorTransform {
	return (snapshot): EditorSnapshot =>
		replaceLines(snapshot, (lines) => {
			const isApplied = lines.every((line) => pattern.test(line));
			return lines.map((line, index) => {
				const indent = INDENT_PATTERN.exec(line)?.[0] ?? '';
				const body = line.slice(indent.length).replace(LIST_MARKER_PATTERN, '');
				return isApplied
					? `${indent}${body}`
					: `${indent}${markerAt(index)}${body}`;
			});
		});
}

/**
 * Unwraps when the markers are already there, whether they sit inside the selection
 * (`**bold**` selected whole) or just outside it (only `bold` selected).
 */
function toggleWrap(marker: string): EditorTransform {
	return ({ text, selectionStart, selectionEnd }): EditorSnapshot => {
		const selected = text.slice(selectionStart, selectionEnd);
		const width = marker.length;

		if (
			selected.length >= width * 2 &&
			selected.startsWith(marker) &&
			selected.endsWith(marker)
		) {
			const inner = selected.slice(width, -width);
			return {
				text: text.slice(0, selectionStart) + inner + text.slice(selectionEnd),
				selectionStart,
				selectionEnd: selectionStart + inner.length,
			};
		}

		if (
			selectionStart >= width &&
			text.slice(selectionStart - width, selectionStart) === marker &&
			text.slice(selectionEnd, selectionEnd + width) === marker
		) {
			return {
				text:
					text.slice(0, selectionStart - width) +
					selected +
					text.slice(selectionEnd + width),
				selectionStart: selectionStart - width,
				selectionEnd: selectionStart - width + selected.length,
			};
		}

		return {
			text:
				text.slice(0, selectionStart) +
				marker +
				selected +
				marker +
				text.slice(selectionEnd),
			selectionStart: selectionStart + width,
			selectionEnd: selectionStart + width + selected.length,
		};
	};
}

/** Lands the selection on whichever half is still a placeholder. */
const insertLink: EditorTransform = ({
	text,
	selectionStart,
	selectionEnd,
}): EditorSnapshot => {
	const selected = text.slice(selectionStart, selectionEnd);
	const label = selected || LINK_LABEL_PLACEHOLDER;
	const snippet = `[${label}](${LINK_URL_PLACEHOLDER})`;
	const nextText =
		text.slice(0, selectionStart) + snippet + text.slice(selectionEnd);
	// `[` + label + `](` is label.length + 3 characters.
	const target = selected
		? {
				from: selectionStart + label.length + 3,
				length: LINK_URL_PLACEHOLDER.length,
			}
		: { from: selectionStart + 1, length: label.length };

	return {
		text: nextText,
		selectionStart: target.from,
		selectionEnd: target.from + target.length,
	};
};

/** Backticks for a single-line selection, a fence for a multi-line one. */
const insertCode: EditorTransform = (snapshot): EditorSnapshot => {
	const { text, selectionStart, selectionEnd } = snapshot;
	const selected = text.slice(selectionStart, selectionEnd);
	if (!selected.includes('\n')) {
		return toggleWrap(INLINE_CODE_MARKER)(snapshot);
	}

	const { text: nextText, blockStart } = replaceWithBlock(
		snapshot,
		`${CODE_FENCE}\n${selected}\n${CODE_FENCE}`,
	);
	const contentStart = blockStart + CODE_FENCE.length + 1;
	return {
		text: nextText,
		selectionStart: contentStart,
		selectionEnd: contentStart + selected.length,
	};
};

/** Selects the first header cell, for immediate typing. */
const insertTable: EditorTransform = (snapshot): EditorSnapshot => {
	const { text, blockStart } = replaceWithBlock(snapshot, TABLE_SNIPPET);
	const firstCell = blockStart + TABLE_SNIPPET.indexOf(TABLE_CELL_PLACEHOLDER);
	return {
		text,
		selectionStart: firstCell,
		selectionEnd: firstCell + TABLE_CELL_PLACEHOLDER.length,
	};
};

/** Replaces the selection and leaves the caret after the insertion. */
export function insertText(
	snapshot: EditorSnapshot,
	value: string,
): EditorSnapshot {
	const { text, selectionStart, selectionEnd } = snapshot;
	const caret = selectionStart + value.length;
	return {
		text: text.slice(0, selectionStart) + value + text.slice(selectionEnd),
		selectionStart: caret,
		selectionEnd: caret,
	};
}

/** Display order. A new action is an entry here plus an icon in `EditorToolbar`. */
export const MARKDOWN_COMMANDS: EditorCommand[] = [
	{
		id: 'heading',
		label: 'Heading',
		run: toggleLinePrefix(HEADING_PREFIX, HEADING_PATTERN),
	},
	{
		id: 'bold',
		label: 'Bold',
		run: toggleWrap(BOLD_MARKER),
	},
	{
		id: 'italic',
		label: 'Italic',
		run: toggleWrap(ITALIC_MARKER),
	},
	{
		id: 'bulleted-list',
		label: 'Bulleted list',
		run: toggleList(BULLET_LIST_PATTERN, () => BULLET_MARKER),
	},
	{
		id: 'numbered-list',
		label: 'Numbered list',
		run: toggleList(ORDERED_LIST_PATTERN, (index) => `${index + 1}. `),
	},
	{ id: 'link', label: 'Link', run: insertLink },
	{ id: 'code', label: 'Code', run: insertCode },
	{ id: 'table', label: 'Table', run: insertTable },
];
