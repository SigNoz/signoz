import {
	editRenderedOccurrence,
	maskFencedCode,
	matchOffsets,
} from '../markdownSource';
import { TASK_LIST } from '../taskList';

const CHECKLIST = ['- [ ] first', '- [x] second', '- [ ] third'].join('\n');

function toggle(
	source: string,
	renderedOffset: number,
	value: boolean,
	rendered = source,
): string | null {
	return editRenderedOccurrence(TASK_LIST, {
		source,
		rendered,
		renderedOffset,
		value,
	});
}

describe('maskFencedCode', () => {
	it('blanks a fence without moving anything after it', () => {
		const markdown = ['a', '```', '- [ ] not a task', '```', '- [ ] task'].join(
			'\n',
		);
		const masked = maskFencedCode(markdown);

		expect(masked).toHaveLength(markdown.length);
		expect(masked.indexOf('- [ ] task')).toBe(markdown.indexOf('- [ ] task'));
		expect(masked).not.toContain('not a task');
	});

	it('handles tilde fences and an unterminated one', () => {
		expect(maskFencedCode('~~~\n- [ ] x\n~~~')).not.toContain('[ ]');
		expect(maskFencedCode('```\n- [ ] x')).not.toContain('[ ]');
	});
});

describe('matchOffsets', () => {
	it('finds every task marker, in document order', () => {
		expect(TASK_LIST.offsets(CHECKLIST)).toStrictEqual([
			CHECKLIST.indexOf('[ ]') + 1,
			CHECKLIST.indexOf('[x]') + 1,
			CHECKLIST.lastIndexOf('[ ]') + 1,
		]);
	});

	it('ignores markers inside a fence', () => {
		const markdown = ['- [ ] real', '```', '- [ ] fenced', '```'].join('\n');

		expect(TASK_LIST.offsets(markdown)).toHaveLength(1);
	});

	it('reads ordered lists and the alternate bullets', () => {
		const markdown = ['1. [ ] a', '2) [ ] b', '* [ ] c', '+ [ ] d'].join('\n');

		expect(TASK_LIST.offsets(markdown)).toHaveLength(4);
	});

	it('is repeatable', () => {
		expect(TASK_LIST.offsets(CHECKLIST)).toStrictEqual(
			TASK_LIST.offsets(CHECKLIST),
		);
	});

	it('does not treat a bare bracket as a marker', () => {
		expect(TASK_LIST.offsets('- [] no')).toHaveLength(0);
	});

	it('scans with the pattern it is given', () => {
		const offsets = matchOffsets('a1 b2', /\d/g, () => 0);

		expect(offsets).toStrictEqual([1, 4]);
	});
});

describe('editRenderedOccurrence', () => {
	it('checks the marker the clicked checkbox belongs to', () => {
		const next = toggle(CHECKLIST, CHECKLIST.lastIndexOf('[ ]'), true);

		expect(next).toBe(['- [ ] first', '- [x] second', '- [x] third'].join('\n'));
	});

	it('unchecks one without touching its neighbours', () => {
		const next = toggle(CHECKLIST, CHECKLIST.indexOf('[x]'), false);

		expect(next).toBe(['- [ ] first', '- [ ] second', '- [ ] third'].join('\n'));
	});

	it('leaves the rest of the body byte-identical', () => {
		const source = ['# Title', '', '- [ ] one', '', 'Prose after.'].join('\n');
		const next = toggle(source, source.indexOf('[ ]'), true);

		expect(next).toBe(source.replace('[ ]', '[x]'));
	});

	it('maps a rendered offset back through an expanded variable', () => {
		const source = ['- [ ] $env first', '- [ ] second'].join('\n');
		const rendered = ['- [ ] production first', '- [ ] second'].join('\n');

		const next = toggle(source, rendered.lastIndexOf('[ ]'), true, rendered);

		expect(next).toBe(['- [ ] $env first', '- [x] second'].join('\n'));
	});

	it('refuses when the two bodies disagree on how many there are', () => {
		const source = ['- [ ] $tasks', '- [ ] last'].join('\n');
		const rendered = ['- [ ] one', '- [ ] injected', '- [ ] last'].join('\n');

		expect(
			toggle(source, rendered.lastIndexOf('[ ]'), true, rendered),
		).toBeNull();
	});

	it('refuses when the source has no such occurrence', () => {
		expect(toggle('no tasks here', 0, true)).toBeNull();
	});
});
