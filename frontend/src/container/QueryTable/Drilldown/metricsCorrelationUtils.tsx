/* eslint-disable sonarjs/cognitive-complexity */
/* eslint-disable no-continue */
import { formatValueForExpression } from 'components/QueryBuilderV2/utils';
import { getOperatorValue } from 'container/QueryBuilder/filters/QueryBuilderSearch/utils';
import { IQueryPair } from 'types/antlrQueryTypes';
import { extractQueryPairs } from 'utils/queryContextUtils';
import { isQuoted, unquote } from 'utils/stringUtils';
import { isFunctionOperator, isNonValueOperator } from 'utils/tokenUtils';

type KeyValueMapping = {
	attribute: string;
	newAttribute: string;
	valueMappings: Record<string, string>;
};

export const METRIC_TO_LOGS_TRACES_MAPPINGS: KeyValueMapping[] = [
	{
		attribute: 'operation',
		newAttribute: 'name',
		valueMappings: {},
	},
	{
		attribute: 'span.kind',
		newAttribute: 'kind_string',
		valueMappings: {
			SPAN_KIND_INTERNAL: 'Internal',
			SPAN_KIND_SERVER: 'Server',
			SPAN_KIND_CLIENT: 'Client',
			SPAN_KIND_PRODUCER: 'Producer',
			SPAN_KIND_CONSUMER: 'Consumer',
		},
	},
	{
		attribute: 'status.code',
		newAttribute: 'status_code_string',
		valueMappings: {
			STATUS_CODE_UNSET: 'Unset',
			STATUS_CODE_OK: 'Ok',
			STATUS_CODE_ERROR: 'Error',
		},
	},
];

// Logic for rewriting key/values in an expression using provided mappings.
function modifyKeyVal(pair: IQueryPair, mapping: KeyValueMapping): string {
	const newKey = mapping.newAttribute;
	const op = pair.operator;

	const operator = pair.hasNegation
		? getOperatorValue(`NOT_${pair.operator}`.toUpperCase())
		: getOperatorValue(pair.operator.toUpperCase());

	// Map a single value token using valueMappings, skipping variables
	const mapOne = (val: string | undefined): string | undefined => {
		if (val == null) {
			return val;
		}
		const t = String(val).trim();
		// Skip variables for now. We will handle them later.
		if (t.startsWith('$')) {
			return t;
		}
		const raw = isQuoted(t) ? unquote(t) : t;
		return mapping.valueMappings[raw] ?? raw;
	};

	// Function-style operator: op(newKey, value?)
	if (isFunctionOperator(op)) {
		let mapped: string | string[] | undefined;
		if (pair.isMultiValue && Array.isArray(pair.valueList)) {
			mapped = pair.valueList.map((v) => mapOne(v) as string);
		} else if (typeof pair.value !== 'undefined') {
			mapped = mapOne(pair.value);
		}
		const hasValue =
			typeof mapped !== 'undefined' &&
			!(Array.isArray(mapped) && mapped.length === 0);
		if (!hasValue) {
			return `${op}(${newKey})`;
		}
		const formatted = formatValueForExpression(mapped as any, op);
		return `${op}(${newKey}, ${formatted})`;
	}

	// Non-value operator: e.g., exists / not exists
	if (isNonValueOperator(op)) {
		return `${newKey} ${operator}`;
	}

	// Standard key-operator-value
	let mapped: string | string[] | undefined;
	if (pair.isMultiValue && Array.isArray(pair.valueList)) {
		mapped = pair.valueList.map((v) => mapOne(v) as string);
	} else if (typeof pair.value !== 'undefined') {
		mapped = mapOne(pair.value);
	}
	const formatted = formatValueForExpression(mapped as any, op);
	return `${newKey} ${operator} ${formatted}`;
}

// Replace keys/values in an expression using provided mappings.
// wires parsing, ordering, and reconstruction.
export function replaceKeysAndValuesInExpression(
	expression: string,
	mappingList: KeyValueMapping[],
): string {
	if (!expression || !mappingList || mappingList.length === 0) {
		return expression;
	}

	const attributeToMapping = new Map<string, KeyValueMapping>(
		mappingList.map((m) => [m.attribute.trim().toLowerCase(), m]),
	);

	const pairs: IQueryPair[] = extractQueryPairs(expression);

	type PairWithBounds = {
		pair: IQueryPair;
		start: number;
		end: number;
	};

	const withBounds: PairWithBounds[] = [];

	for (let i = 0; i < pairs.length; i += 1) {
		const pair = pairs[i];
		// Require complete positions for safe slicing
		if (!pair?.position) {
			continue;
		}
		const start =
			pair.position.keyStart ??
			pair.position.operatorStart ??
			pair.position.valueStart;
		const end =
			pair.position.valueEnd ?? pair.position.operatorEnd ?? pair.position.keyEnd;

		if (
			typeof start === 'number' &&
			typeof end === 'number' &&
			start >= 0 &&
			end >= start
		) {
			withBounds.push({ pair, start, end });
		}
	}

	// Process in source order
	withBounds.sort((a, b) => a.start - b.start);

	let startIdx = 0;
	const resultParts: string[] = [];

	for (let i = 0; i < withBounds.length; i += 1) {
		const item = withBounds[i];
		const sourceKey = item.pair?.key?.trim().toLowerCase();
		if (!sourceKey) {
			continue;
		}

		const mapping = attributeToMapping.get(sourceKey);
		if (!mapping) {
			continue;
		}

		// Add unchanged prefix up to the start of this pair
		resultParts.push(expression.slice(startIdx, item.start));

		// Replacement produced by modifyKeyVal
		const replacement = modifyKeyVal(item.pair, mapping);

		resultParts.push(replacement);

		// Advance cursor past this pair
		startIdx = item.end + 1;
	}

	// Append the remainder of the expression
	resultParts.push(expression.slice(startIdx));

	return resultParts.join('');
}
