import {
	computeDiff,
	DiffCode,
	DiffOp,
	diffArrays,
	diffNodes,
	diffObjects,
} from '../diff';

const noop = (): void => undefined;

const paths = (ops: DiffOp[]): string[] =>
	ops.map(([, path]) => path.join('.'));

describe('qsAlias/diff', () => {
	describe('DiffCode', () => {
		it('has stable wire-significant numeric codes', () => {
			// These leak onto the URL via the codec, so they must not drift.
			expect(DiffCode.Set).toBe(1);
			expect(DiffCode.Delete).toBe(2);
		});
	});

	describe('computeDiff on leaves', () => {
		it('returns no ops when scalars are equal', () => {
			expect(computeDiff('a', 'a')).toStrictEqual([]);
			expect(computeDiff(1, 1)).toStrictEqual([]);
			expect(computeDiff(true, true)).toStrictEqual([]);
			expect(computeDiff(null, null)).toStrictEqual([]);
		});

		it('emits a single Set rooted at [] when scalars differ', () => {
			expect(computeDiff(1, 2)).toStrictEqual([[DiffCode.Set, [], 2]]);
			expect(computeDiff('a', 'b')).toStrictEqual([[DiffCode.Set, [], 'b']]);
			expect(computeDiff(true, false)).toStrictEqual([[DiffCode.Set, [], false]]);
		});

		it('distinguishes null, false, 0 and empty string', () => {
			expect(computeDiff(null, false)).toStrictEqual([[DiffCode.Set, [], false]]);
			expect(computeDiff(0, '')).toStrictEqual([[DiffCode.Set, [], '']]);
			expect(computeDiff(0, null)).toStrictEqual([[DiffCode.Set, [], null]]);
		});
	});

	describe('computeDiff on objects', () => {
		it('returns no ops for deep-equal objects', () => {
			expect(
				computeDiff({ a: 1, b: { c: 2 } }, { a: 1, b: { c: 2 } }),
			).toStrictEqual([]);
		});

		it('emits Set for an added key', () => {
			expect(computeDiff({ a: 1 }, { a: 1, b: 2 })).toStrictEqual([
				[DiffCode.Set, ['b'], 2],
			]);
		});

		it('emits Delete (undefined value) for a removed key', () => {
			expect(computeDiff({ a: 1, b: 2 }, { a: 1 })).toStrictEqual([
				[DiffCode.Delete, ['b'], undefined],
			]);
		});

		it('emits Set at the nested path for a changed deep value', () => {
			expect(
				computeDiff({ a: { b: { c: 1 } } }, { a: { b: { c: 9 } } }),
			).toStrictEqual([[DiffCode.Set, ['a', 'b', 'c'], 9]]);
		});

		it('produces deterministic op order following base-then-query keys', () => {
			const base = { ds: 'logs', ag: [{ mn: 'x', ao: 'noop' }], gb: [] };
			const query = {
				ds: 'traces',
				ag: [{ mn: 'x', ao: 'sum' }, { mn: 'y' }],
				gb: [],
			};
			// Generic arrays use wholesale SET for added elements.
			// Template diffing only applies to known query builder arrays.
			expect(computeDiff(base, query)).toStrictEqual([
				[DiffCode.Set, ['ds'], 'traces'],
				[DiffCode.Set, ['ag', 0, 'ao'], 'sum'],
				[DiffCode.Set, ['ag', 1], { mn: 'y' }],
			]);
		});
	});

	describe('diffArrays', () => {
		it('defaults the path to [] and diffs element-wise', () => {
			expect(diffArrays([1, 2], [1, 9])).toStrictEqual([[DiffCode.Set, [1], 9]]);
		});

		it('Sets appended elements at their new index', () => {
			expect(diffArrays([1], [1, 2, 3])).toStrictEqual([
				[DiffCode.Set, [1], 2],
				[DiffCode.Set, [2], 3],
			]);
		});

		it('Deletes trailing elements removed from the query', () => {
			expect(diffArrays([1, 2, 3], [1])).toStrictEqual([
				[DiffCode.Delete, [1], undefined],
				[DiffCode.Delete, [2], undefined],
			]);
		});

		it('prefixes the supplied path onto every op', () => {
			expect(diffArrays([1], [2], ['items'])).toStrictEqual([
				[DiffCode.Set, ['items', 0], 2],
			]);
		});
	});

	describe('template diffing for query builder arrays', () => {
		const baseQuery = { qn: 'A', aggOp: 'count', ds: 'metrics' };

		it('uses template for builder.queryData path', () => {
			const base = [baseQuery];
			const query = [baseQuery, { qn: 'B', aggOp: 'avg', ds: 'metrics' }];
			const ops = diffArrays(base, query, ['builder', 'queryData']);

			// Should diff query[1] against query[0], not wholesale SET
			expect(ops).toStrictEqual([
				[DiffCode.Set, ['builder', 'queryData', 1, 'qn'], 'B'],
				[DiffCode.Set, ['builder', 'queryData', 1, 'aggOp'], 'avg'],
			]);
		});

		it('uses template for builder.queryFormulas path', () => {
			const baseFormula = { qn: 'F1', expression: 'A', disabled: false };
			const base = [baseFormula];
			const query = [
				baseFormula,
				{ qn: 'F2', expression: 'A+B', disabled: false },
			];
			const ops = diffArrays(base, query, ['builder', 'queryFormulas']);

			expect(ops).toStrictEqual([
				[DiffCode.Set, ['builder', 'queryFormulas', 1, 'qn'], 'F2'],
				[DiffCode.Set, ['builder', 'queryFormulas', 1, 'expression'], 'A+B'],
			]);
		});

		it('uses template for promql path', () => {
			const baseProm = { name: 'A', query: 'up', legend: '', disabled: false };
			const base = [baseProm];
			const query = [
				baseProm,
				{ name: 'B', query: 'down', legend: '', disabled: false },
			];
			const ops = diffArrays(base, query, ['promql']);

			expect(ops).toStrictEqual([
				[DiffCode.Set, ['promql', 1, 'name'], 'B'],
				[DiffCode.Set, ['promql', 1, 'query'], 'down'],
			]);
		});

		it('uses template for clickhouse_sql path', () => {
			const baseCh = { name: 'A', query: 'SELECT 1', legend: '', disabled: false };
			const base = [baseCh];
			const query = [
				baseCh,
				{ name: 'B', query: 'SELECT 2', legend: '', disabled: false },
			];
			const ops = diffArrays(base, query, ['clickhouse_sql']);

			expect(ops).toStrictEqual([
				[DiffCode.Set, ['clickhouse_sql', 1, 'name'], 'B'],
				[DiffCode.Set, ['clickhouse_sql', 1, 'query'], 'SELECT 2'],
			]);
		});

		it('does NOT use template for unknown paths', () => {
			const base = [{ a: 1 }];
			const query = [{ a: 1 }, { a: 2 }];
			const ops = diffArrays(base, query, ['unknown', 'path']);

			// Should emit wholesale SET, not field-level diff
			expect(ops).toStrictEqual([
				[DiffCode.Set, ['unknown', 'path', 1], { a: 2 }],
			]);
		});

		it('emits DELETE for fields removed vs template', () => {
			const base = [{ qn: 'A', aggOp: 'count', extra: 'field' }];
			const query = [base[0], { qn: 'B', aggOp: 'avg' }]; // no 'extra'
			const ops = diffArrays(base, query, ['builder', 'queryData']);

			expect(ops).toContainEqual([
				DiffCode.Delete,
				['builder', 'queryData', 1, 'extra'],
				undefined,
			]);
		});
	});

	describe('diffObjects', () => {
		it('defaults the path to [] and diffs by own keys', () => {
			expect(diffObjects({ a: 1 }, { a: 2 })).toStrictEqual([
				[DiffCode.Set, ['a'], 2],
			]);
		});

		it('prefixes the supplied path onto every op', () => {
			expect(diffObjects({ a: 1 }, { a: 2 }, ['root'])).toStrictEqual([
				[DiffCode.Set, ['root', 'a'], 2],
			]);
		});
	});

	describe('diffNodes shape transitions', () => {
		it('replaces a leaf with a container wholesale', () => {
			expect(diffNodes('a', { b: 1 })).toStrictEqual([
				[DiffCode.Set, [], { b: 1 }],
			]);
		});

		it('replaces a container with a leaf wholesale', () => {
			expect(diffNodes({ b: 1 }, 'a')).toStrictEqual([[DiffCode.Set, [], 'a']]);
		});

		it('walks empty-to-non-empty array element-wise (for prefix substitution)', () => {
			expect(diffNodes([], [1])).toStrictEqual([[DiffCode.Set, [0], 1]]);
		});

		it('emits SET [] when clearing a non-empty array (preserves empty array)', () => {
			expect(diffNodes([1], [])).toStrictEqual([[DiffCode.Set, [], []]]);
			expect(diffNodes([1, 2, 3], [])).toStrictEqual([[DiffCode.Set, [], []]]);
		});

		it('diffs array-vs-object key-wise (indices become string keys)', () => {
			expect(diffNodes([1, 2], { 0: 'a' })).toStrictEqual([
				[DiffCode.Set, ['0'], 'a'],
				[DiffCode.Delete, ['1'], undefined],
			]);
		});
	});

	describe('undefined data', () => {
		it('does not diff undefined against undefined', () => {
			expect(computeDiff(undefined, undefined)).toStrictEqual([]);
			expect(computeDiff({ a: undefined }, { a: undefined })).toStrictEqual([]);
		});

		it('Sets a real value over a baseline undefined', () => {
			expect(computeDiff({ a: undefined }, { a: 1 })).toStrictEqual([
				[DiffCode.Set, ['a'], 1],
			]);
		});

		it('Sets undefined over a baseline value', () => {
			expect(computeDiff({ a: 1 }, { a: undefined })).toStrictEqual([
				[DiffCode.Set, ['a'], undefined],
			]);
		});

		it('never throws when either whole input is undefined', () => {
			expect(() => computeDiff(undefined, { a: 1 })).not.toThrow();
			expect(() => computeDiff({ a: 1 }, undefined)).not.toThrow();
			expect(computeDiff(undefined, { a: 1 })).toStrictEqual([
				[DiffCode.Set, [], { a: 1 }],
			]);
		});
	});

	describe('unsupported / non-JSON values', () => {
		it('treats functions as leaves and never throws', () => {
			expect(() => computeDiff({ fn: noop }, { fn: noop })).not.toThrow();
			// Two functions both serialize to `undefined`, so they look equal.
			expect(computeDiff({ fn: noop }, { fn: noop })).toStrictEqual([]);
		});

		it('Sets a function over a scalar (treated as a differing leaf)', () => {
			const ops = computeDiff({ a: 1 }, { a: noop });
			expect(ops).toHaveLength(1);
			expect(ops[0][0]).toBe(DiffCode.Set);
			expect(ops[0][1]).toStrictEqual(['a']);
		});

		it('does not throw on NaN / Infinity leaves', () => {
			expect(() => computeDiff({ a: NaN }, { a: Infinity })).not.toThrow();
			// Both stringify to "null", so the diff cannot tell them apart.
			expect(computeDiff({ a: NaN }, { a: Infinity })).toStrictEqual([]);
		});
	});

	describe('prototype-pollution hardening', () => {
		afterEach(() => {
			// Guard against the test itself leaking pollution into later suites.
			delete (Object.prototype as Record<string, unknown>).polluted;
		});

		it('skips a JSON-injected own __proto__ key (emits no op for it)', () => {
			const malicious = JSON.parse(
				'{"safe":2,"__proto__":{"polluted":true}}',
			) as Record<string, unknown>;

			// Base must be a non-empty object so both sides reach diffObjects;
			// an empty `{}` is a leaf and would collapse to a wholesale Set.
			const ops = computeDiff({ safe: 1 }, malicious);

			expect(paths(ops)).toStrictEqual(['safe']);
			expect(paths(ops)).not.toContain('__proto__');
			expect(({} as Record<string, unknown>).polluted).toBeUndefined();
		});

		it('skips own constructor and prototype keys', () => {
			const ops = diffObjects({}, {
				constructor: 'x',
				prototype: 'y',
				safe: 1,
			} as Record<string, unknown>);

			expect(paths(ops)).toStrictEqual(['safe']);
		});

		it('emits no Delete op when the baseline carries a forbidden key', () => {
			const ops = diffObjects({ constructor: 'x' } as Record<string, unknown>, {});
			expect(ops).toStrictEqual([]);
		});

		it('skips a nested __proto__ key reached via recursion', () => {
			const malicious = JSON.parse(
				'{"a":{"keep":1,"__proto__":{"polluted":true}}}',
			) as Record<string, unknown>;

			const ops = computeDiff({ a: { keep: 1 } }, malicious);

			expect(ops).toStrictEqual([]);
			expect(({} as Record<string, unknown>).polluted).toBeUndefined();
		});
	});

	describe('op-list invariants', () => {
		it('produces a unique path per op (order-independent list)', () => {
			const base = { a: 1, b: [1, 2, 3], c: { d: 4 } };
			const query = { a: 9, b: [1], c: { d: 4, e: 5 }, f: 6 };
			const list = paths(computeDiff(base, query));
			expect(new Set(list).size).toBe(list.length);
		});
	});
});
