import { parseAggregations } from '../aggregationExpression';

describe('parseAggregations', () => {
	it.each([
		['duration_nano', [{ expression: 'duration_nano' }]],
		['attribute.queue_depth', [{ expression: 'attribute.queue_depth' }]],
		['attribute.queue-depth', [{ expression: 'attribute.queue-depth' }]],
		['body.latency as lat', [{ expression: 'body.latency', alias: 'lat' }]],
		[
			"count() as 'total' avg(code.lineno)",
			[
				{ expression: 'count()', alias: 'total' },
				{ expression: 'avg(code.lineno)' },
			],
		],
		// Words beside a call are not aggregations of their own.
		['count() AS total', [{ expression: 'count()' }]],
		['p99(duration_nano) by service', [{ expression: 'p99(duration_nano)' }]],
		['sum(a', []],
	])('parses %s', (input, expected) => {
		expect(parseAggregations(input, undefined, true)).toStrictEqual(expected);
	});

	it('leaves a field out unless asked to read one', () => {
		expect(parseAggregations('duration_nano')).toStrictEqual([]);
	});
});
