import { aliasField, expandField, expandPath, transformPath } from '../codec';
import {
	FIELD_ALIASES,
	FIELD_REVERSE,
	isOwnedKey,
	PREFIX_PATTERNS,
	PREFIX_REVERSE,
} from '../maps';

describe('qsAlias maps', () => {
	describe('FIELD_ALIASES — every key round-trips', () => {
		it.each(Object.entries(FIELD_ALIASES))(
			'%s ⇄ %s via aliasField / expandField',
			(field, alias) => {
				expect(aliasField(field)).toBe(alias);
				expect(expandField(alias)).toBe(field);
				expect({
					field,
					alias,
					aliased: aliasField(field),
					expanded: expandField(alias),
				}).toMatchSnapshot(`alias-${field}`);
			},
		);
	});

	describe('FIELD_ALIASES integrity', () => {
		it('alias values are unique (no two fields share an alias)', () => {
			const values = Object.values(FIELD_ALIASES);
			expect(new Set(values).size).toBe(values.length);
			expect(FIELD_ALIASES).toMatchSnapshot('all-aliases');
		});

		it('no alias contains "." (would corrupt path splitting)', () => {
			Object.values(FIELD_ALIASES).forEach((alias) => {
				expect(alias).not.toContain('.');
			});
		});

		it('FIELD_REVERSE is the exact inverse of FIELD_ALIASES', () => {
			expect(FIELD_REVERSE).toStrictEqual(
				Object.fromEntries(
					Object.entries(FIELD_ALIASES).map(([key, value]) => [value, key]),
				),
			);
			expect(FIELD_REVERSE).toMatchSnapshot('all-reverse');
		});
	});

	describe('PREFIX_PATTERNS — every prefix round-trips', () => {
		it.each(PREFIX_PATTERNS)(
			'$prefix ⇄ [$match] via transformPath / expandPath',
			({ match, prefix }) => {
				const fullPath = [...match, 0, 'someField'];
				const transformed = transformPath(fullPath);
				const expanded = expandPath(`${prefix}0.someField`);
				expect(transformed).toStrictEqual([`${prefix}0`, 'someField']);
				expect(expanded).toStrictEqual([...match, 0, 'someField']);
				expect({ prefix, match, transformed, expanded }).toMatchSnapshot(
					`prefix-${prefix}`,
				);
			},
		);

		it('handles multi-digit indices', () => {
			const { match, prefix } = PREFIX_PATTERNS[0];
			const transformed = transformPath([...match, 12, 'x']);
			const expanded = expandPath(`${prefix}12.x`);
			expect(transformed).toStrictEqual([`${prefix}12`, 'x']);
			expect(expanded).toStrictEqual([...match, 12, 'x']);
			expect({ prefix, transformed, expanded }).toMatchSnapshot('multi-digit');
		});
	});

	describe('PREFIX_REVERSE consistency', () => {
		it('mirrors PREFIX_PATTERNS one-to-one', () => {
			PREFIX_PATTERNS.forEach(({ match, prefix }) => {
				expect(PREFIX_REVERSE[prefix]).toStrictEqual(match);
			});
			expect(Object.keys(PREFIX_REVERSE).sort()).toStrictEqual(
				PREFIX_PATTERNS.map((pattern) => pattern.prefix).sort(),
			);
			expect(PREFIX_REVERSE).toMatchSnapshot('all-prefix-reverse');
		});
	});

	describe('alias / expand passthrough', () => {
		it('leaves numeric path segments untouched', () => {
			expect(aliasField(0)).toBe(0);
			expect(aliasField(7)).toBe(7);
			expect({ zero: aliasField(0), seven: aliasField(7) }).toMatchSnapshot(
				'numeric-passthrough',
			);
		});

		it('leaves unknown field names untouched', () => {
			expect(aliasField('unknownField')).toBe('unknownField');
			expect(expandField('zz')).toBe('zz');
			expect({
				aliasUnknown: aliasField('unknownField'),
				expandUnknown: expandField('zz'),
			}).toMatchSnapshot('unknown-passthrough');
		});

		it('leaves numeric-string segments untouched in expandField', () => {
			expect(expandField('0')).toBe('0');
			expect(expandField('42')).toBe('42');
			expect({
				zero: expandField('0'),
				fortyTwo: expandField('42'),
			}).toMatchSnapshot('numeric-string-passthrough');
		});
	});

	describe('isOwnedKey', () => {
		it('matches the tag key', () => {
			expect(isOwnedKey('_t')).toBe(true);
			expect({ _t: isOwnedKey('_t') }).toMatchSnapshot('tag-key');
		});

		it.each(PREFIX_PATTERNS.map((p) => p.prefix))(
			'matches %s prefix with index',
			(prefix) => {
				expect(isOwnedKey(`${prefix}0`)).toBe(true);
				expect(isOwnedKey(`${prefix}0.field`)).toBe(true);
				expect(isOwnedKey(`${prefix}12.nested.path`)).toBe(true);
				expect({
					[`${prefix}0`]: isOwnedKey(`${prefix}0`),
					[`${prefix}0.field`]: isOwnedKey(`${prefix}0.field`),
					[`${prefix}12.nested.path`]: isOwnedKey(`${prefix}12.nested.path`),
				}).toMatchSnapshot(`owned-${prefix}`);
			},
		);

		it('matches delete-prefixed keys', () => {
			expect(isOwnedKey('-query0.field')).toBe(true);
			expect(isOwnedKey('-formula0')).toBe(true);
			expect({
				'-query0.field': isOwnedKey('-query0.field'),
				'-formula0': isOwnedKey('-formula0'),
			}).toMatchSnapshot('delete-prefixed');
		});

		it('matches top-level query keys', () => {
			expect(isOwnedKey('id')).toBe(true);
			expect(isOwnedKey('queryType')).toBe(true);
			expect(isOwnedKey('qt')).toBe(true);
			expect(isOwnedKey('unit')).toBe(true);
			expect({
				id: isOwnedKey('id'),
				queryType: isOwnedKey('queryType'),
				qt: isOwnedKey('qt'),
				unit: isOwnedKey('unit'),
			}).toMatchSnapshot('top-level-keys');
		});

		it('rejects foreign params', () => {
			expect(isOwnedKey('panelTypes')).toBe(false);
			expect(isOwnedKey('startTime')).toBe(false);
			expect(isOwnedKey('endTime')).toBe(false);
			expect(isOwnedKey('compositeQuery')).toBe(false);
			expect({
				panelTypes: isOwnedKey('panelTypes'),
				startTime: isOwnedKey('startTime'),
				endTime: isOwnedKey('endTime'),
				compositeQuery: isOwnedKey('compositeQuery'),
			}).toMatchSnapshot('foreign-params');
		});

		it('rejects prefix without index', () => {
			expect(isOwnedKey('query')).toBe(false);
			expect(isOwnedKey('formula')).toBe(false);
			expect({
				query: isOwnedKey('query'),
				formula: isOwnedKey('formula'),
			}).toMatchSnapshot('prefix-without-index');
		});
	});
});
