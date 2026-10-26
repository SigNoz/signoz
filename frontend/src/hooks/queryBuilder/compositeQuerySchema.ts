import {
	initialQueryBuilderFormValuesMap,
	initialQueryState,
} from 'constants/queryBuilder';
import { cloneDeep, isEqual, omitBy } from 'lodash-es';
import { IBuilderQuery, Query } from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';
import { BuilderQuerySource, DataSource } from 'types/common/queryBuilder';
import { v5 as uuidv5 } from 'uuid';
import { z } from 'zod';

const COMPOSITE_QUERY_ID_NAMESPACE = '2f1c6a4e-9b3d-4c57-8e21-7a0d5f6b9c13';

export type QueryConstraints = {
	dataSource: DataSource;
	source?: BuilderQuerySource;
	traceOperator: boolean;
	queryTypes?: EQueryType[];
};

export type NormalizedQuery = {
	query: Query;
	changed: boolean;
};

const fallback = (value: unknown) => (): never => cloneDeep(value) as never;

const builderItemSchema = z
	.looseObject({
		dataSource: z.enum(DataSource).optional().catch(undefined),
		source: z.string().optional().catch(undefined),
	})
	.transform((item) => omitBy(item, (value) => value === undefined));

const textItemSchema = z.looseObject({ query: z.string().catch('') });

const builderSchema = z.looseObject({
	queryData: z
		.array(builderItemSchema)
		.min(1)
		.catch(fallback(initialQueryState.builder.queryData)),
	queryFormulas: z.unknown().transform((value) => value ?? []),
	queryTraceOperator: z.unknown().transform((value) => value ?? []),
});

const compositeQuerySchema = z.looseObject({
	queryType: z.enum(EQueryType).catch(fallback(EQueryType.QUERY_BUILDER)),
	builder: builderSchema.catch(fallback(initialQueryState.builder)),
	promql: z.array(textItemSchema).catch(fallback(initialQueryState.promql)),
	clickhouse_sql: z
		.array(textItemSchema)
		.catch(fallback(initialQueryState.clickhouse_sql)),
});

const mustBeEmpty = (value: unknown): z.ZodType =>
	z.array(z.looseObject({ query: z.literal('') })).catch(fallback(value));

export function buildPageQuerySchema(
	constraints: QueryConstraints,
): z.ZodType<unknown> {
	const { queryTypes } = constraints;
	const itemDefault: IBuilderQuery = {
		...initialQueryBuilderFormValuesMap[constraints.dataSource],
		source: constraints.source ?? '',
	};
	const allows = (type: EQueryType): boolean =>
		!queryTypes || queryTypes.includes(type);

	const pageItemSchema = builderItemSchema
		.transform((item) => ({
			...item,
			dataSource: item.dataSource ?? constraints.dataSource,
			...(constraints.source && { source: item.source ?? constraints.source }),
		}))
		.refine(
			(item) =>
				item.dataSource === constraints.dataSource &&
				(item.source ?? '') === (constraints.source ?? ''),
		)
		.catch(({ input }): never => {
			const { queryName, expression } = input as Partial<IBuilderQuery>;
			return {
				...cloneDeep(itemDefault),
				queryName: queryName ?? itemDefault.queryName,
				expression: expression ?? itemDefault.expression,
			} as never;
		});

	return compositeQuerySchema.extend({
		queryType: queryTypes
			? z
					.enum(EQueryType)
					.refine((type) => queryTypes.includes(type))
					.catch(fallback(queryTypes[0]))
			: compositeQuerySchema.shape.queryType,
		promql: allows(EQueryType.PROM)
			? compositeQuerySchema.shape.promql
			: mustBeEmpty(initialQueryState.promql),
		clickhouse_sql: allows(EQueryType.CLICKHOUSE)
			? compositeQuerySchema.shape.clickhouse_sql
			: mustBeEmpty(initialQueryState.clickhouse_sql),
		builder: builderSchema
			.extend({
				queryData: z
					.array(pageItemSchema)
					.min(1)
					.catch(fallback([itemDefault])),
				queryTraceOperator: constraints.traceOperator
					? builderSchema.shape.queryTraceOperator
					: z.array(z.never()).catch(fallback([])),
			})
			.catch(fallback({ ...initialQueryState.builder, queryData: [itemDefault] })),
	});
}

export function normalizeCompositeQuery(
	raw: unknown,
	pageSchema?: z.ZodType<unknown>,
): NormalizedQuery {
	const base = compositeQuerySchema.parse(raw) as unknown as Query;
	base.id ??= uuidv5(JSON.stringify(raw), COMPOSITE_QUERY_ID_NAMESPACE);
	const query = (pageSchema ? pageSchema.parse(base) : base) as Query;
	return { query, changed: !isEqual(query, raw) };
}
