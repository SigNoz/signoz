import { Json } from '../diff/predicates';
import { decodeLeaf, encodeLeaf } from '../leaf';

describe('qsAlias leaf codec', () => {
	describe('encodeLeaf', () => {
		it('emits strings verbatim', () => {
			expect(encodeLeaf('traces')).toBe('traces');
			expect(encodeLeaf('service.name')).toBe('service.name');
			expect(encodeLeaf('')).toBe('');
			expect({
				traces: encodeLeaf('traces'),
				'service.name': encodeLeaf('service.name'),
				empty: encodeLeaf(''),
			}).toMatchSnapshot('encoded-strings');
		});

		it('type-tags non-string scalars with a leading underscore', () => {
			expect(encodeLeaf(123)).toBe('_123');
			expect(encodeLeaf(-4.5)).toBe('_-4.5');
			expect(encodeLeaf(true)).toBe('_true');
			expect(encodeLeaf(false)).toBe('_false');
			expect(encodeLeaf(null)).toBe('_null');
			expect({
				number: encodeLeaf(123),
				negative: encodeLeaf(-4.5),
				true: encodeLeaf(true),
				false: encodeLeaf(false),
				null: encodeLeaf(null),
			}).toMatchSnapshot('encoded-scalars');
		});

		it('type-tags empty containers', () => {
			expect(encodeLeaf([])).toBe('_[]');
			expect(encodeLeaf({})).toBe('_{}');
			expect({
				array: encodeLeaf([]),
				object: encodeLeaf({}),
			}).toMatchSnapshot('encoded-containers');
		});

		it('normalizes undefined to null', () => {
			expect(encodeLeaf(undefined)).toBe('_null');
			expect({ undefined: encodeLeaf(undefined) }).toMatchSnapshot(
				'encoded-undefined',
			);
		});

		it('escapes a string that begins with the tag char by doubling it', () => {
			expect(encodeLeaf('_x')).toBe('__x');
			expect(encodeLeaf('_')).toBe('__');
			expect(encodeLeaf('__name__')).toBe('___name__');
			expect({
				_x: encodeLeaf('_x'),
				_: encodeLeaf('_'),
				__name__: encodeLeaf('__name__'),
			}).toMatchSnapshot('encoded-escaped');
		});
	});

	describe('decodeLeaf', () => {
		it('returns untagged tokens as plain strings', () => {
			expect(decodeLeaf('traces')).toBe('traces');
			expect(decodeLeaf('123')).toBe('123');
			expect(decodeLeaf('true')).toBe('true');
			expect(decodeLeaf('null')).toBe('null');
			expect(decodeLeaf('')).toBe('');
			expect({
				traces: decodeLeaf('traces'),
				'123': decodeLeaf('123'),
				true: decodeLeaf('true'),
				null: decodeLeaf('null'),
				empty: decodeLeaf(''),
			}).toMatchSnapshot('decoded-strings');
		});

		it('parses tagged scalars back to their type', () => {
			expect(decodeLeaf('_123')).toBe(123);
			expect(decodeLeaf('_-4.5')).toBe(-4.5);
			expect(decodeLeaf('_true')).toBe(true);
			expect(decodeLeaf('_false')).toBe(false);
			expect(decodeLeaf('_null')).toBeNull();
			expect({
				number: decodeLeaf('_123'),
				negative: decodeLeaf('_-4.5'),
				true: decodeLeaf('_true'),
				false: decodeLeaf('_false'),
				null: decodeLeaf('_null'),
			}).toMatchSnapshot('decoded-scalars');
		});

		it('parses tagged empty containers', () => {
			expect(decodeLeaf('_[]')).toStrictEqual([]);
			expect(decodeLeaf('_{}')).toStrictEqual({});
			expect({
				array: decodeLeaf('_[]'),
				object: decodeLeaf('_{}'),
			}).toMatchSnapshot('decoded-containers');
		});

		it('unescapes a doubled-tag string', () => {
			expect(decodeLeaf('__x')).toBe('_x');
			expect(decodeLeaf('__')).toBe('_');
			expect(decodeLeaf('___name__')).toBe('__name__');
			expect({
				__x: decodeLeaf('__x'),
				__: decodeLeaf('__'),
				___name__: decodeLeaf('___name__'),
			}).toMatchSnapshot('decoded-escaped');
		});

		it('falls back to raw text on a malformed tagged token (never throws)', () => {
			expect(() => decodeLeaf('_not json')).not.toThrow();
			expect(decodeLeaf('_not json')).toBe('_not json');
			expect({ fallback: decodeLeaf('_not json') }).toMatchSnapshot(
				'decoded-fallback',
			);
		});
	});

	describe('round-trip', () => {
		const cases: Json[] = [
			'traces',
			'',
			'123',
			'true',
			'false',
			'null',
			'_leading',
			'_',
			'a=b&c#d%e+f.g',
			'service.name',
			0,
			123,
			-4.5,
			true,
			false,
			null,
			[],
			{},
		];

		it.each(cases.map((value) => [JSON.stringify(value), value] as const))(
			'%s survives encode → decode',
			(label, value) => {
				const encoded = encodeLeaf(value);
				const decoded = decodeLeaf(encoded);
				expect(decoded).toStrictEqual(value);
				expect({ input: value, encoded, decoded }).toMatchSnapshot(
					`roundtrip-${label}`,
				);
			},
		);
	});
});
