import { TelemetrytypesSourceDTO } from 'api/generated/services/sigNoz.schemas';
import ROUTES from 'constants/routes';
import { QueryMode } from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';
import { DataSource } from 'types/common/queryBuilder';
import { z } from 'zod';

import { buildPageQuerySchema, QueryConstraints } from './compositeQuerySchema';

const PAGE_QUERY_CONSTRAINTS: Partial<Record<string, QueryConstraints>> = {
	[ROUTES.LOGS_EXPLORER]: {
		queryTypes: [EQueryType.QUERY_BUILDER],
		dataSource: DataSource.LOGS,
	},
	[ROUTES.TRACES_EXPLORER]: {
		queryTypes: [EQueryType.QUERY_BUILDER],
		dataSource: DataSource.TRACES,
		traceOperator: true,
	},
	[ROUTES.AI_OBSERVABILITY_EXPLORER]: {
		queryTypes: [EQueryType.QUERY_BUILDER],
		dataSource: DataSource.TRACES,
		builderQueryType: QueryMode.AI_QUERY_BUILDER,
	},
	[ROUTES.METRICS_EXPLORER_EXPLORER]: {
		queryTypes: [EQueryType.QUERY_BUILDER],
		dataSource: DataSource.METRICS,
	},
	[ROUTES.METER_EXPLORER]: {
		queryTypes: [EQueryType.QUERY_BUILDER],
		dataSource: DataSource.METRICS,
		source: TelemetrytypesSourceDTO.meter,
	},
};

const pageSchemas = new Map<string, z.ZodType<unknown>>(
	Object.entries(PAGE_QUERY_CONSTRAINTS).map(([route, constraints]) => [
		route,
		buildPageQuerySchema(constraints as QueryConstraints),
	]),
);

export const pageQuerySchemaFor = (
	pathname: string,
): z.ZodType<unknown> | undefined => pageSchemas.get(pathname);
