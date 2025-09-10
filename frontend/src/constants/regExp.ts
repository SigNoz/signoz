import { TRACE_OPERATOR_QUERY_NAME } from './queryBuilder';

export const FORMULA_REGEXP = /F\d+/;

export const HAVING_FILTER_REGEXP = /^[-\d.,\s]+$/;

export const TYPE_ADDON_REGEXP = /_(.+)/;

export const SPLIT_FIRST_UNDERSCORE = /(?<!^)_/;

export const TRACE_OPERATOR_REGEXP = new RegExp(TRACE_OPERATOR_QUERY_NAME);
