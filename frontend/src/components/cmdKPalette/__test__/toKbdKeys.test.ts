import { toKbdKeys } from '../utils';

describe('toKbdKeys', () => {
	it('returns no keys without a shortcut', () => {
		expect(toKbdKeys(undefined)).toStrictEqual([]);
		expect(toKbdKeys([])).toStrictEqual([]);
		expect(toKbdKeys(['  '])).toStrictEqual([]);
	});

	it('names the modifier and keeps the letter', () => {
		expect(toKbdKeys(['shift+s'])).toStrictEqual(['Shift', 's']);
	});

	it('keeps every key of a chord in order', () => {
		expect(toKbdKeys(['shift+g+n'])).toStrictEqual(['Shift', 'g', 'n']);
	});

	it('maps cmd and meta to the platform key', () => {
		expect(toKbdKeys(['cmd+j'])).toStrictEqual(['Mod', 'j']);
		expect(toKbdKeys(['meta+j'])).toStrictEqual(['Mod', 'j']);
	});

	it('maps ctrl and control to Control, and alt to Alt', () => {
		expect(toKbdKeys(['ctrl+alt+x'])).toStrictEqual(['Control', 'Alt', 'x']);
		expect(toKbdKeys(['control+x'])).toStrictEqual(['Control', 'x']);
	});

	it('ignores case and spaces', () => {
		expect(toKbdKeys([' Shift + S '])).toStrictEqual(['Shift', 's']);
	});

	it('uses the first non-empty combo', () => {
		expect(toKbdKeys(['', 'shift+d', 'shift+a'])).toStrictEqual(['Shift', 'd']);
	});
});
