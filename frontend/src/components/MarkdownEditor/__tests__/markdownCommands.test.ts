import { insertText, MARKDOWN_COMMANDS } from '../markdownCommands';
import type { EditorSnapshot, EditorTransform } from '../types';

const commandById = (id: string): EditorTransform => {
	const command = MARKDOWN_COMMANDS.find((entry) => entry.id === id);
	if (!command) {
		throw new Error(`unknown command: ${id}`);
	}
	return command.run;
};

const heading = commandById('heading');
const bold = commandById('bold');
const italic = commandById('italic');
const bulletedList = commandById('bulleted-list');
const numberedList = commandById('numbered-list');
const link = commandById('link');
const code = commandById('code');
const table = commandById('table');

/** `|` marks a caret, `[...]` a range, so expectations read like the editor looks. */
const snapshot = (marked: string): EditorSnapshot => {
	if (marked.includes('|')) {
		const caret = marked.indexOf('|');
		return {
			text: marked.replace('|', ''),
			selectionStart: caret,
			selectionEnd: caret,
		};
	}
	const start = marked.indexOf('[');
	const end = marked.indexOf(']') - 1;
	return {
		text: marked.replace('[', '').replace(']', ''),
		selectionStart: start,
		selectionEnd: end,
	};
};

const selectionOf = (result: EditorSnapshot): string =>
	result.text.slice(result.selectionStart, result.selectionEnd);

describe('heading', () => {
	it('prefixes the caret line and keeps the caret on the same character', () => {
		const result = heading(snapshot('Chec|kout'));

		expect(result.text).toBe('## Checkout');
		expect(result.selectionStart).toBe(7);
	});

	it('strips the prefix when every selected line already has one', () => {
		const result = heading({
			text: '## one\n### two',
			selectionStart: 0,
			selectionEnd: 13,
		});

		expect(result.text).toBe('one\ntwo');
	});

	it('adds the prefix when only some selected lines have one', () => {
		const result = heading({
			text: '## one\ntwo',
			selectionStart: 0,
			selectionEnd: 10,
		});

		expect(result.text).toBe('## ## one\n## two');
	});

	it('does not pull in the line after a selection ending on a line break', () => {
		const result = heading({
			text: 'one\ntwo',
			selectionStart: 0,
			selectionEnd: 4,
		});

		expect(result.text).toBe('## one\ntwo');
	});
});

describe('bulleted list', () => {
	it('bullets every line of a multi-line selection', () => {
		const result = bulletedList({
			text: 'one\ntwo',
			selectionStart: 0,
			selectionEnd: 7,
		});

		expect(result.text).toBe('- one\n- two');
		expect(selectionOf(result)).toBe('- one\n- two');
	});

	it('unbullets a list written with a different marker', () => {
		const result = bulletedList({
			text: '* one\n+ two',
			selectionStart: 0,
			selectionEnd: 11,
		});

		expect(result.text).toBe('one\ntwo');
	});
});

describe('numbered list', () => {
	it('numbers each line of the selection in order', () => {
		const result = numberedList({
			text: 'one\ntwo\nthree',
			selectionStart: 0,
			selectionEnd: 13,
		});

		expect(result.text).toBe('1. one\n2. two\n3. three');
	});

	it('unnumbers a list whose numbering is not sequential', () => {
		const result = numberedList({
			text: '1. one\n5. two',
			selectionStart: 0,
			selectionEnd: 13,
		});

		expect(result.text).toBe('one\ntwo');
	});
});

describe('switching between list kinds', () => {
	it('converts bullets to numbers rather than marking them twice', () => {
		const result = numberedList({
			text: '- one\n- two',
			selectionStart: 0,
			selectionEnd: 11,
		});

		expect(result.text).toBe('1. one\n2. two');
	});

	it('converts numbers to bullets', () => {
		const result = bulletedList({
			text: '1. one\n2. two',
			selectionStart: 0,
			selectionEnd: 13,
		});

		expect(result.text).toBe('- one\n- two');
	});

	it('keeps indentation so nested items stay nested', () => {
		const result = numberedList({
			text: 'one\n    - nested',
			selectionStart: 0,
			selectionEnd: 16,
		});

		expect(result.text).toBe('1. one\n    2. nested');
	});
});

describe('bold and italic', () => {
	it('wraps the selection and keeps the original text selected', () => {
		const result = bold(snapshot('a [word] b'));

		expect(result.text).toBe('a **word** b');
		expect(selectionOf(result)).toBe('word');
	});

	it('unwraps when the markers sit inside the selection', () => {
		const result = bold({
			text: 'a **word** b',
			selectionStart: 2,
			selectionEnd: 10,
		});

		expect(result.text).toBe('a word b');
		expect(selectionOf(result)).toBe('word');
	});

	it('unwraps when the markers sit just outside the selection', () => {
		const result = bold({
			text: 'a **word** b',
			selectionStart: 4,
			selectionEnd: 8,
		});

		expect(result.text).toBe('a word b');
		expect(selectionOf(result)).toBe('word');
	});

	it('leaves the caret between the markers when nothing is selected', () => {
		const result = italic(snapshot('a |b'));

		expect(result.text).toBe('a __b');
		expect(result.selectionStart).toBe(3);
		expect(result.selectionEnd).toBe(3);
	});

	it('does not mistake a leading document boundary for a marker', () => {
		const result = bold(snapshot('[word] tail'));

		expect(result.text).toBe('**word** tail');
	});
});

describe('link', () => {
	it('selects the url when the label came from the selection', () => {
		const result = link(snapshot('see [docs] now'));

		expect(result.text).toBe('see [docs](https://) now');
		expect(selectionOf(result)).toBe('https://');
	});

	it('selects the label placeholder when nothing was selected', () => {
		const result = link(snapshot('see |'));

		expect(result.text).toBe('see [text](https://)');
		expect(selectionOf(result)).toBe('text');
	});
});

describe('code', () => {
	it('uses backticks for a single-line selection', () => {
		const result = code(snapshot('run [npm] here'));

		expect(result.text).toBe('run `npm` here');
	});

	it('fences a multi-line selection and selects its content', () => {
		const result = code({
			text: 'one\ntwo',
			selectionStart: 0,
			selectionEnd: 7,
		});

		expect(result.text).toBe('```\none\ntwo\n```');
		expect(selectionOf(result)).toBe('one\ntwo');
	});
});

describe('table', () => {
	it('starts the skeleton on its own line and selects the first header cell', () => {
		const result = table(snapshot('intro|'));

		expect(result.text).toBe(
			'intro\n| Column | Column |\n| --- | --- |\n|  |  |',
		);
		expect(selectionOf(result)).toBe('Column');
	});
});

describe('insertText', () => {
	it('replaces the selection and leaves the caret after the insertion', () => {
		const result = insertText(snapshot('env is [old]'), '{{env}}');

		expect(result.text).toBe('env is {{env}}');
		expect(result.selectionStart).toBe(14);
		expect(result.selectionEnd).toBe(14);
	});
});
