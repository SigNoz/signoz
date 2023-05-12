import { EQueryType } from 'types/common/dashboard';

export const WIDGET_PROMQL_QUERY_KEY_NAME = EQueryType.PROM;

export const WIDGET_CLICKHOUSE_QUERY_KEY_NAME = EQueryType.CLICKHOUSE;

export const WIDGET_QUERY_BUILDER_QUERY_KEY_NAME = EQueryType.QUERY_BUILDER;

type TFormulas = 'formulas';
export const WIDGET_QUERY_BUILDER_FORMULA_KEY_NAME: TFormulas = 'formulas';
