import { initialQueriesMap } from 'constants/queryBuilder';
import type { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

import {
	getDistributionFieldPlaceholder,
	setDistributionField,
	toDistributionAggregation,
	fromDistributionAggregation,
} from '../distributionField';

const queryOf = (
	dataSource: DataSource,
	expressions: string[],
): IBuilderQuery => ({
	...(initialQueriesMap[dataSource].builder.queryData[0] as IBuilderQuery),
	aggregations: expressions.map((expression) => ({ expression })),
});

describe('getDistributionFieldPlaceholder', () => {
	it.each([
		[DataSource.TRACES, 'Numeric field to bucket, e.g. duration_nano'],
		[DataSource.LOGS, 'Numeric field to bucket'],
	])('%s → %s', (dataSource, expected) => {
		expect(getDistributionFieldPlaceholder(dataSource)).toBe(expected);
	});
});

describe('toDistributionAggregation', () => {
	it.each([DataSource.TRACES, DataSource.LOGS])(
		'clears a %s count() for the user to pick a field',
		(dataSource) => {
			expect(
				toDistributionAggregation(queryOf(dataSource, ['count()'])).aggregations,
			).toStrictEqual([{ expression: '' }]);
		},
	);

	it.each(['attribute.batch_size', 'attribute.queue-depth'])(
		'keeps the bare field %s',
		(field) => {
			const query = queryOf(DataSource.LOGS, [field]);
			expect(toDistributionAggregation(query)).toBe(query);
		},
	);

	it('keeps the field of a one-argument call', () => {
		expect(
			toDistributionAggregation(
				queryOf(DataSource.LOGS, ['avg(attribute.latency)']),
			).aggregations,
		).toStrictEqual([{ expression: 'attribute.latency' }]);
	});

	it.each(['count_distinct(service.name)', 'countIf(status>=500)'])(
		'clears the field rather than bucket the argument of %s',
		(expression) => {
			expect(
				toDistributionAggregation(queryOf(DataSource.TRACES, [expression]))
					.aggregations,
			).toStrictEqual([{ expression: '' }]);
		},
	);

	it('keeps a field with an alias', () => {
		const query = queryOf(DataSource.LOGS, ['body.latency as lat']);
		expect(toDistributionAggregation(query)).toBe(query);
	});

	it('renames an order on the aggregation alias to the field', () => {
		const query = {
			...queryOf(DataSource.TRACES, []),
			aggregations: [{ expression: 'p99(duration_nano)', alias: 'lat' }],
			orderBy: [{ columnName: 'lat', order: 'desc' }],
		};
		expect(toDistributionAggregation(query).orderBy).toStrictEqual([
			{ columnName: 'duration_nano', order: 'desc' },
		]);
	});

	it('keeps the field of an inline-aliased call and moves the order on its alias', () => {
		const query = {
			...queryOf(DataSource.TRACES, ["p99(duration_nano) as 'lat'"]),
			orderBy: [{ columnName: 'lat', order: 'desc' }],
		};
		const next = toDistributionAggregation(query);
		expect(next.aggregations).toStrictEqual([{ expression: 'duration_nano' }]);
		expect(next.orderBy).toStrictEqual([
			{ columnName: 'duration_nano', order: 'desc' },
		]);
	});

	it('drops the order on an aggregation it clears', () => {
		const query = {
			...queryOf(DataSource.LOGS, ['count()']),
			orderBy: [
				{ columnName: 'count()', order: 'desc' },
				{ columnName: 'timestamp', order: 'asc' },
			],
		};
		expect(toDistributionAggregation(query).orderBy).toStrictEqual([
			{ columnName: 'timestamp', order: 'asc' },
		]);
	});

	it('drops orders on every aggregation it clears', () => {
		const query = {
			...queryOf(DataSource.TRACES, [
				'avg(duration_nano) max(attribute.quantity)',
				'count() as total',
			]),
			orderBy: [
				{ columnName: 'max(attribute.quantity)', order: 'desc' },
				{ columnName: 'total', order: 'asc' },
				{ columnName: 'timestamp', order: 'asc' },
			],
		};
		expect(toDistributionAggregation(query).orderBy).toStrictEqual([
			{ columnName: 'timestamp', order: 'asc' },
		]);
	});

	it('renames an order on the aggregation to the field', () => {
		const query = {
			...queryOf(DataSource.TRACES, ['p99(duration_nano)']),
			orderBy: [{ columnName: 'p99(duration_nano)', order: 'desc' }],
		};
		expect(toDistributionAggregation(query).orderBy).toStrictEqual([
			{ columnName: 'duration_nano', order: 'desc' },
		]);
	});

	it('leaves a metrics query alone', () => {
		const query = initialQueriesMap.metrics.builder.queryData[0];
		expect(toDistributionAggregation(query)).toBe(query);
	});
});

describe('fromDistributionAggregation', () => {
	it.each([
		['duration_nano', 'p90(duration_nano)'],
		['', 'count()'],
	])('turns the field %j into %s', (field, expression) => {
		expect(
			fromDistributionAggregation(queryOf(DataSource.TRACES, [field]))
				.aggregations,
		).toStrictEqual([{ expression }]);
	});

	it('drops the alias out of the field', () => {
		expect(
			fromDistributionAggregation(
				queryOf(DataSource.LOGS, ['body.latency as lat']),
			).aggregations,
		).toStrictEqual([{ expression: 'p90(body.latency)' }]);
	});

	it('renames an order on the field to the new aggregation', () => {
		const query = {
			...queryOf(DataSource.TRACES, ['duration_nano']),
			orderBy: [{ columnName: 'duration_nano', order: 'asc' }],
		};
		expect(fromDistributionAggregation(query).orderBy).toStrictEqual([
			{ columnName: 'p90(duration_nano)', order: 'asc' },
		]);
	});

	it.each([['count()'], ['count()', 'avg(x)']])(
		'leaves function aggregations %j alone',
		(...expressions) => {
			const query = queryOf(DataSource.LOGS, expressions);
			expect(fromDistributionAggregation(query)).toBe(query);
		},
	);
});

describe('setDistributionField', () => {
	const sorted = {
		...queryOf(DataSource.TRACES, ['duration_nano']),
		orderBy: [{ columnName: 'duration_nano', order: 'desc' }],
	};

	it('moves the sort on the old field to the new one', () => {
		expect(setDistributionField(sorted, 'attribute.quantity')).toMatchObject({
			aggregations: [{ expression: 'attribute.quantity' }],
			orderBy: [{ columnName: 'attribute.quantity', order: 'desc' }],
		});
	});

	it('drops the sort when the field is cleared', () => {
		expect(setDistributionField(sorted, '').orderBy).toStrictEqual([]);
	});
});
