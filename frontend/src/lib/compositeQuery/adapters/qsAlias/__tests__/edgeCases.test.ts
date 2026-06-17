import { initialQueriesMap } from 'constants/queryBuilder';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

import { qsAliasAdapter } from '../index';

const STABLE_ID = 'test-stable-id';

const clone = (query: Query): Query =>
	JSON.parse(JSON.stringify(query)) as Query;

const normalizeId = (query: Query): Query => ({ ...query, id: STABLE_ID });

const normalizeUrl = (url: string): string =>
	url.replace(/id=[^&]+/, `id=${STABLE_ID}`);

const roundTrip = (query: Query): Query =>
	qsAliasAdapter.decode(qsAliasAdapter.encode(query));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const makeFilterItem = (value: string): any => ({
	key: {
		key: 'severity_text',
		dataType: 'string',
		type: 'tag',
		isColumn: false,
		isJSON: false,
	},
	id: `item-${value}`,
	op: '=',
	value,
});

describe('qsAliasAdapter edge cases', () => {
	describe('baseline field deletion', () => {
		it('emits a delete token and decode drops the field', () => {
			const query = clone(initialQueriesMap.logs);
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			delete (query.builder.queryData[0] as any).aggregateOperator;

			const wire = qsAliasAdapter.encode(query).toString();
			expect(wire).toContain('-query0.aggOp');
			expect(normalizeUrl(wire)).toMatchSnapshot('url');

			const decoded = roundTrip(query);
			expect('aggregateOperator' in decoded.builder.queryData[0]).toBe(false);
			expect(decoded).toStrictEqual(query);
			expect(normalizeId(decoded)).toMatchSnapshot('decoded');
		});
	});

	describe('array growth', () => {
		it('round-trips multiple added filter items element-wise', () => {
			const query = clone(initialQueriesMap.logs);
			query.builder.queryData[0].filters = {
				op: 'AND',
				items: [makeFilterItem('a'), makeFilterItem('b')],
			};

			const wire = qsAliasAdapter.encode(query).toString();
			expect(wire).toContain('query0.filters.items.0.');
			expect(wire).toContain('query0.filters.items.1.');
			expect(normalizeUrl(wire)).toMatchSnapshot('url');

			const decoded = roundTrip(query);
			expect(decoded).toStrictEqual(query);
			expect(normalizeId(decoded)).toMatchSnapshot('decoded');
		});
	});

	describe('null and empty containers', () => {
		it('round-trips a null leaf', () => {
			const query = clone(initialQueriesMap.logs);
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(query.builder.queryData[0] as any).legend = null;
			const wire = qsAliasAdapter.encode(query).toString();
			expect(normalizeUrl(wire)).toMatchSnapshot('url');
			const decoded = roundTrip(query);
			expect(decoded).toStrictEqual(query);
			expect(normalizeId(decoded)).toMatchSnapshot('decoded');
		});

		it('round-trips an empty-object leaf', () => {
			const query = clone(initialQueriesMap.logs);
			query.builder.queryData[0].filter =
				{} as Query['builder']['queryData'][0]['filter'];
			const wire = qsAliasAdapter.encode(query).toString();
			expect(normalizeUrl(wire)).toMatchSnapshot('url');
			const decoded = roundTrip(query);
			expect(decoded).toStrictEqual(query);
			expect(normalizeId(decoded)).toMatchSnapshot('decoded');
		});

		it('round-trips an empty-array leaf', () => {
			const query = clone(initialQueriesMap.logs);
			query.builder.queryData[0].groupBy = [];
			const wire = qsAliasAdapter.encode(query).toString();
			expect(normalizeUrl(wire)).toMatchSnapshot('url');
			const decoded = roundTrip(query);
			expect(decoded).toStrictEqual(query);
			expect(normalizeId(decoded)).toMatchSnapshot('decoded');
		});
	});

	describe('undefined values', () => {
		it('does not break decode when fields are undefined', () => {
			const query = clone(initialQueriesMap.logs);
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(query.builder.queryData[0] as any).aggregateOperator = undefined;
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(query.builder.queryData[0] as any).source = undefined;

			const wire = qsAliasAdapter.encode(query).toString();
			expect(normalizeUrl(wire)).toMatchSnapshot('url');

			expect(() => roundTrip(query)).not.toThrow();
			const decoded = roundTrip(query);
			expect(decoded).not.toBeNull();
			expect(normalizeId(decoded)).toMatchSnapshot('decoded');
		});
	});

	/**
	 * The wire type-tags non-strings (`_123`, `_true`, `_null`) and emits strings
	 * verbatim, while qs percent-encodes values. Every scalar therefore
	 * round-trips losslessly — including strings that look like numbers/booleans
	 * or contain query-string delimiters.
	 */
	describe('tricky scalar values (lossless)', () => {
		it('keeps a numeric-looking string as a string', () => {
			const query = clone(initialQueriesMap.logs);
			query.builder.queryData[0].legend = '123';
			const wire = qsAliasAdapter.encode(query).toString();
			expect(normalizeUrl(wire)).toMatchSnapshot('url');
			const decoded = roundTrip(query);
			expect(decoded).toStrictEqual(query);
			expect(normalizeId(decoded)).toMatchSnapshot('decoded');
		});

		it('keeps "true" / "false" / "null" string values as strings', () => {
			['true', 'false', 'null'].forEach((literal) => {
				const query = clone(initialQueriesMap.logs);
				query.builder.queryData[0].legend = literal;
				const wire = qsAliasAdapter.encode(query).toString();
				expect(normalizeUrl(wire)).toMatchSnapshot(`url-${literal}`);
				const decoded = roundTrip(query);
				expect(decoded).toStrictEqual(query);
				expect(normalizeId(decoded)).toMatchSnapshot(`decoded-${literal}`);
			});
		});

		it('preserves a value containing the ampersand delimiter', () => {
			const query = clone(initialQueriesMap.logs);
			query.builder.queryData[0].legend = 'x&y';
			const wire = qsAliasAdapter.encode(query).toString();
			expect(normalizeUrl(wire)).toMatchSnapshot('url');
			const decoded = roundTrip(query);
			expect(decoded).toStrictEqual(query);
			expect(normalizeId(decoded)).toMatchSnapshot('decoded');
		});

		it('preserves assorted wire-special characters', () => {
			const query = clone(initialQueriesMap.logs);
			query.builder.queryData[0].legend = 'a=b&c#d%e+f.g';
			const wire = qsAliasAdapter.encode(query).toString();
			expect(normalizeUrl(wire)).toMatchSnapshot('url');
			const decoded = roundTrip(query);
			expect(decoded).toStrictEqual(query);
			expect(normalizeId(decoded)).toMatchSnapshot('decoded');
		});

		it('preserves a string that begins with the type-tag char', () => {
			const query = clone(initialQueriesMap.logs);
			query.builder.queryData[0].legend = '_underscored';
			const wire = qsAliasAdapter.encode(query).toString();
			expect(normalizeUrl(wire)).toMatchSnapshot('url');
			const decoded = roundTrip(query);
			expect(decoded).toStrictEqual(query);
			expect(normalizeId(decoded)).toMatchSnapshot('decoded');
		});
	});

	describe('scalar type fidelity', () => {
		it('keeps number and look-alike string distinct', () => {
			const query = clone(initialQueriesMap.logs);
			query.builder.queryData[0].stepInterval = 300;
			query.builder.queryData[0].legend = '300';

			const wire = qsAliasAdapter.encode(query).toString();
			expect(normalizeUrl(wire)).toMatchSnapshot('url');

			const decoded = roundTrip(query);
			expect(decoded.builder.queryData[0].stepInterval).toBe(300);
			expect(decoded.builder.queryData[0].legend).toBe('300');
			expect(decoded).toStrictEqual(query);
			expect(normalizeId(decoded)).toMatchSnapshot('decoded');
		});

		it('keeps boolean and look-alike string distinct', () => {
			const query = clone(initialQueriesMap.logs);
			query.builder.queryData[0].disabled = true;
			query.builder.queryData[0].legend = 'true';

			const wire = qsAliasAdapter.encode(query).toString();
			expect(normalizeUrl(wire)).toMatchSnapshot('url');

			const decoded = roundTrip(query);
			expect(decoded.builder.queryData[0].disabled).toBe(true);
			expect(decoded.builder.queryData[0].legend).toBe('true');
			expect(decoded).toStrictEqual(query);
			expect(normalizeId(decoded)).toMatchSnapshot('decoded');
		});
	});
});
