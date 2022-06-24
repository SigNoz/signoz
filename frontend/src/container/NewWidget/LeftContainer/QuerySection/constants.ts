import { EQueryType } from 'types/common/dashboard';

import { EQueryTypeToQueryKeyMapping } from './types';

export const WIDGET_PROMQL_QUERY_KEY_NAME: string = EQueryTypeToQueryKeyMapping[
	EQueryType[EQueryType.PROM]
] as string;

export const WIDGET_CLICKHOUSE_QUERY_KEY_NAME: string = EQueryTypeToQueryKeyMapping[
	EQueryType[EQueryType.CLICKHOUSE]
] as string;

export const WIDGET_QUERY_BUILDER_QUERY_KEY_NAME: string = EQueryTypeToQueryKeyMapping[
	EQueryType[EQueryType.QUERY_BUILDER]
] as string;

export const WIDGET_QUERY_BUILDER_FORMULA_KEY_NAME: string = 'formulas' as string;
