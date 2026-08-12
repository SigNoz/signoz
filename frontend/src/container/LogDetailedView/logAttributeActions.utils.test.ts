import { MetricsType } from 'container/MetricsApplication/constant';

import {
	buildLogFilterTarget,
	toTypedFilterValue,
} from './logAttributeActions.utils';

describe('buildLogFilterTarget', () => {
	describe('attributes / resources / scope / top-level scalars', () => {
		it('maps a top-level scalar to its bare key with =/!=, groupable', () => {
			const t = buildLogFilterTarget(['severity_text'], 'ERROR', true);
			expect(t).toMatchObject({
				fieldKey: 'severity_text',
				filterInOperator: '=',
				filterOutOperator: '!=',
				groupBySupported: true,
				groupByKey: 'severity_text',
				isRestricted: false,
			});
			expect(t.metricsType).toBeUndefined();
		});

		it('strips the `attributes` root to a bare dotted key + Tag type', () => {
			expect(
				buildLogFilterTarget(['attributes', 'http.method'], 'GET', true),
			).toMatchObject({
				fieldKey: 'http.method',
				filterInOperator: '=',
				metricsType: MetricsType.Tag,
				groupBySupported: true,
			});
		});

		it('maps `resources` with Resource type', () => {
			expect(
				buildLogFilterTarget(['resources', 'service.name'], 'api', true),
			).toMatchObject({
				fieldKey: 'service.name',
				metricsType: MetricsType.Resource,
			});
		});

		it('maps `scope` with Scope type', () => {
			expect(
				buildLogFilterTarget(['scope', 'name'], 'my-scope', true),
			).toMatchObject({ fieldKey: 'name', metricsType: MetricsType.Scope });
		});

		it('offers group-by for attributes now', () => {
			expect(
				buildLogFilterTarget(['attributes', 'k'], 'v', true).groupBySupported,
			).toBe(true);
		});
	});

	describe('restricted fields (timestamp / id)', () => {
		it.each(['timestamp', 'id'])(
			'marks %s restricted with no group-by',
			(key) => {
				const t = buildLogFilterTarget([key], 'v', true);
				expect(t.isRestricted).toBe(true);
				expect(t.groupBySupported).toBe(false);
				expect(t.groupByKey).toBeUndefined();
			},
		);
	});

	describe('body scalars', () => {
		it('maps a top-level body scalar to body.<key> with =/!=, groupable when json body on', () => {
			const t = buildLogFilterTarget(['body', 'message'], 'hello', true);
			expect(t).toMatchObject({
				fieldKey: 'body.message',
				filterInOperator: '=',
				filterOutOperator: '!=',
				groupBySupported: true,
				groupByKey: 'body.message',
				isRestricted: false,
			});
			expect(t.dataType).toBeDefined();
			expect(t.metricsType).toBeUndefined();
		});

		it('maps a nested body scalar to a dotted body key', () => {
			expect(buildLogFilterTarget(['body', 'a', 'b'], 'x', true)).toMatchObject({
				fieldKey: 'body.a.b',
				groupBySupported: true,
				groupByKey: 'body.a.b',
			});
		});

		it('does not offer group-by when USE_JSON_BODY is off', () => {
			const t = buildLogFilterTarget(['body', 'message'], 'hello', false);
			expect(t.groupBySupported).toBe(false);
			expect(t.groupByKey).toBeUndefined();
			expect(t.fieldKey).toBe('body.message');
		});

		it('filters the whole `body` field when body is an unparsed string leaf', () => {
			expect(buildLogFilterTarget(['body'], 'raw text', true)).toMatchObject({
				fieldKey: 'body',
				filterInOperator: '=',
				groupBySupported: false,
			});
		});

		it('restricts a body leaf named `timestamp` (no filter / group-by)', () => {
			const t = buildLogFilterTarget(['body', 'timestamp'], '2026-01-01', true);
			expect(t.fieldKey).toBe('body.timestamp');
			expect(t.isRestricted).toBe(true);
			expect(t.groupBySupported).toBe(false);
			expect(t.groupByKey).toBeUndefined();
		});

		it('restricts a nested body leaf named `timestamp`', () => {
			const t = buildLogFilterTarget(['body', 'obj', 'timestamp'], 'x', true);
			expect(t.isRestricted).toBe(true);
			expect(t.groupBySupported).toBe(false);
		});

		it('restricts body leaves named `id` and `date` too (uses RESTRICTED_SELECTED_FIELDS)', () => {
			expect(buildLogFilterTarget(['body', 'id'], 'abc', true).isRestricted).toBe(
				true,
			);
			expect(
				buildLogFilterTarget(['body', 'date'], '2026-01-01', true).isRestricted,
			).toBe(true);
		});

		it('does not restrict an ordinary body leaf', () => {
			expect(
				buildLogFilterTarget(['body', 'message'], 'hello', true).isRestricted,
			).toBe(false);
		});
	});

	describe('body arrays', () => {
		it('uses has()/!has() on the array key for a primitive array element', () => {
			const t = buildLogFilterTarget(['body', 'tags', 0], 'urgent', true);
			expect(t).toMatchObject({
				fieldKey: 'body.tags',
				filterInOperator: 'has',
				groupBySupported: false,
			});
			expect(t.filterOutOperator).toContain('has');
			expect(t.filterOutOperator).not.toBe('has');
		});

		it('collapses deep array-element paths to a []-marked has() key', () => {
			expect(
				buildLogFilterTarget(
					['body', 'config', 'features', 1, 'items', 0, 'variants', 2],
					'ballpen',
					true,
				),
			).toMatchObject({
				fieldKey: 'body.config.features[].items[].variants',
				filterInOperator: 'has',
			});
		});

		it('maps a field nested inside an array element with =/!= and a []-marked key, no group-by', () => {
			expect(
				buildLogFilterTarget(['body', 'items', 2, 'sku'], 'ABC', true),
			).toMatchObject({
				fieldKey: 'body.items[].sku',
				filterInOperator: '=',
				filterOutOperator: '!=',
				groupBySupported: false,
			});
		});

		it('uses the [*] string-body marker for an array element when USE_JSON_BODY is off', () => {
			expect(
				buildLogFilterTarget(['body', 'tags', 0], 'urgent', false),
			).toMatchObject({ fieldKey: 'body.tags[*]', filterInOperator: 'has' });
		});

		it('uses [*] for a field nested inside an array element when USE_JSON_BODY is off', () => {
			expect(
				buildLogFilterTarget(['body', 'items', 2, 'sku'], 'ABC', false),
			).toMatchObject({ fieldKey: 'body.items[*].sku', filterInOperator: '=' });
		});
	});
});

describe('toTypedFilterValue', () => {
	const run = (value: unknown): unknown => toTypedFilterValue(value);

	it('keeps numbers/booleans as their JS type (so the expression stays unquoted)', () => {
		expect(run(848)).toBe(848);
		expect(typeof run(848)).toBe('number');
		expect(run(1.1)).toBe(1.1);
		expect(run(true)).toBe(true);
		expect(typeof run(true)).toBe('boolean');
	});

	it('passes strings through unchanged (no numeric inference)', () => {
		expect(run('unknown_service')).toBe('unknown_service');
		expect(typeof run('12345')).toBe('string');
	});
});
