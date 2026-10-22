import { ILog } from 'types/api/logs/log';

import { getLogFieldValue } from './flatLogData';

const asLog = (partial: Partial<ILog>): ILog => partial as unknown as ILog;

describe('getLogFieldValue', () => {
	it('resolves a nested body field by dotted key when use_json_body is on', () => {
		const log = asLog({ body: { a: { b: { c: 'deep' } } } });
		expect(getLogFieldValue(log, 'a.b.c', true)).toBe('deep');
	});

	it('ignores body when use_json_body is off', () => {
		const log = asLog({ body: { a: { b: { c: 'deep' } } } });
		expect(getLogFieldValue(log, 'a.b.c', false)).toBeUndefined();
	});

	it('ignores a stringified body even when use_json_body is on', () => {
		const log = asLog({ body: '{"a":{"b":1}}' });
		expect(getLogFieldValue(log, 'a.b', true)).toBeUndefined();
	});

	it('prefers the body value over attributes when the key exists in both (body first)', () => {
		const log = asLog({
			attributes_string: { 'a.b': 'attr' } as never,
			body: { a: { b: 'bodyval' } },
		});
		expect(getLogFieldValue(log, 'a.b', true)).toBe('bodyval');
	});

	it('falls back to attributes when the key is not in the body', () => {
		const log = asLog({
			attributes_string: { 'x.y': 'attr' } as never,
			body: { other: 1 },
		});
		expect(getLogFieldValue(log, 'x.y', true)).toBe('attr');
	});

	it('preserves falsy body values (0, false, empty string)', () => {
		const log = asLog({ body: { n: 0, flag: false, s: '' } });
		expect(getLogFieldValue(log, 'n', true)).toBe(0);
		expect(getLogFieldValue(log, 'flag', true)).toBe(false);
		expect(getLogFieldValue(log, 's', true)).toBe('');
	});

	it('returns undefined when the body path is missing', () => {
		const log = asLog({ body: { x: 1 } });
		expect(getLogFieldValue(log, 'nope', true)).toBeUndefined();
	});

	it('returns undefined when a mid path segment is not an object', () => {
		const log = asLog({ body: { a: { b: 'leaf' } } });
		expect(getLogFieldValue(log, 'a.b.c', true)).toBeUndefined();
	});
});
