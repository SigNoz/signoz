import { normalizeFilterExpression } from './normalize';

describe('normalizeFilterExpression', () => {
	it('returns empty string for empty input', () => {
		expect(normalizeFilterExpression('')).toBe('');
	});

	it('returns empty string for whitespace-only input', () => {
		expect(normalizeFilterExpression('   \t  ')).toBe('');
	});

	it('strips whitespace around operators', () => {
		expect(normalizeFilterExpression('  a = 1  ')).toBe('a=1');
		expect(normalizeFilterExpression('a   =    1')).toBe('a=1');
		expect(normalizeFilterExpression('a=1')).toBe('a=1');
	});

	it('lowercases AND / OR / NOT outside quotes', () => {
		expect(normalizeFilterExpression('A AND B OR NOT C')).toBe('AandBornotC');
	});

	it('lowercases IN / LIKE / ILIKE / CONTAINS', () => {
		expect(normalizeFilterExpression('host IN [1, 2] AND name LIKE "foo"')).toBe(
			'hostin[1,2]andnamelike"foo"',
		);
	});

	it('lowercases REGEXP', () => {
		expect(normalizeFilterExpression('path REGEXP "foo"')).toBe(
			'pathregexp"foo"',
		);
		expect(normalizeFilterExpression('path REGEXP "foo"')).toBe(
			normalizeFilterExpression('path regexp "foo"'),
		);
	});

	it('lowercases HAS / HASANY / HASALL / HASTOKEN function names', () => {
		expect(normalizeFilterExpression('HAS(tags, "x")')).toBe(
			normalizeFilterExpression('has(tags, "x")'),
		);
		expect(normalizeFilterExpression('HASANY(tags, ["a","b"])')).toBe(
			normalizeFilterExpression('hasAny(tags, ["a","b"])'),
		);
		expect(normalizeFilterExpression('HASALL(tags, ["a","b"])')).toBe(
			normalizeFilterExpression('hasAll(tags, ["a","b"])'),
		);
		expect(normalizeFilterExpression('HASTOKEN(msg, "err")')).toBe(
			normalizeFilterExpression('hasToken(msg, "err")'),
		);
	});

	it('lowercases TRUE / FALSE boolean literals', () => {
		expect(normalizeFilterExpression('active = TRUE')).toBe(
			normalizeFilterExpression('active = true'),
		);
		expect(normalizeFilterExpression('active = FALSE')).toBe(
			normalizeFilterExpression('active = false'),
		);
	});

	it('preserves whitespace and casing inside single-quoted strings', () => {
		expect(normalizeFilterExpression("a = 'X  Y'")).toBe("a='X  Y'");
	});

	it('preserves whitespace and casing inside double-quoted strings', () => {
		expect(normalizeFilterExpression('a   =   "X  Y"')).toBe('a="X  Y"');
	});

	it('does not lowercase keyword-looking substrings inside quotes', () => {
		expect(normalizeFilterExpression("msg = 'AND ERROR'")).toBe(
			"msg='AND ERROR'",
		);
	});

	it('handles escaped quotes inside strings', () => {
		expect(normalizeFilterExpression("msg = 'a\\'b' AND x = 1")).toBe(
			"msg='a\\'b'andx=1",
		);
	});

	it('treats two formattings of the same expression as identical', () => {
		const a = normalizeFilterExpression(
			'service.name = "frontend" AND severity = error',
		);
		const b = normalizeFilterExpression(
			'service.name="frontend"   and  severity=error',
		);
		expect(a).toBe(b);
	});

	it('preserves unquoted value casing (treats them as identifiers)', () => {
		expect(normalizeFilterExpression('status = OK')).toBe('status=OK');
	});

	it('handles mixed quotes in one expression', () => {
		expect(normalizeFilterExpression(`a = 'X' AND b = "Y"`)).toBe(
			`a='X'andb="Y"`,
		);
	});
});
