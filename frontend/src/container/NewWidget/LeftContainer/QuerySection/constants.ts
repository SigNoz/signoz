/* eslint-disable  */
// @ts-ignore
// @ts-nocheck

import { EQueryType } from 'types/common/dashboard';

import { EQueryTypeToQueryKeyMapping } from './types';

export const WIDGET_PROMQL_QUERY_KEY_NAME: EQueryTypeToQueryKeyMapping.PROM =
	EQueryTypeToQueryKeyMapping[EQueryType[EQueryType.PROM]];

export const WIDGET_CLICKHOUSE_QUERY_KEY_NAME: EQueryTypeToQueryKeyMapping.CLICKHOUSE = EQueryTypeToQueryKeyMapping[
	EQueryType[EQueryType.CLICKHOUSE]
] as string;

export const WIDGET_QUERY_BUILDER_QUERY_KEY_NAME: EQueryTypeToQueryKeyMapping.QUERY_BUILDER = EQueryTypeToQueryKeyMapping[
	EQueryType[EQueryType.QUERY_BUILDER]
] as string;

type TFormulas = 'formulas';
export const WIDGET_QUERY_BUILDER_FORMULA_KEY_NAME: TFormulas = 'formulas';
