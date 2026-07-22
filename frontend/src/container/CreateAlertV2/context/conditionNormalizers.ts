import { AlertThresholdMatchType, AlertThresholdOperator } from './types';

// Mirrors the backend's CompareOperator.Normalize() in
// pkg/types/ruletypes/compare.go. Maps any accepted alias to the enum value
// the dropdown understands. Returns undefined for aliases the UI does not
// expose (e.g. above_or_equal, below_or_equal) so callers can keep the raw
// value on screen instead of silently rewriting it.
export function normalizeOperator(
	raw: string | undefined,
): AlertThresholdOperator | undefined {
	switch (raw) {
		case '1':
		case 'above':
		case '>':
			return AlertThresholdOperator.IS_ABOVE;
		case '2':
		case 'below':
		case '<':
			return AlertThresholdOperator.IS_BELOW;
		case '3':
		case 'equal':
		case 'eq':
		case '=':
			return AlertThresholdOperator.IS_EQUAL_TO;
		case '4':
		case 'not_equal':
		case 'not_eq':
		case '!=':
			return AlertThresholdOperator.IS_NOT_EQUAL_TO;
		case '7':
		case 'outside_bounds':
			return AlertThresholdOperator.ABOVE_BELOW;
		default:
			return undefined;
	}
}

// Mirrors the backend's MatchType.Normalize() in pkg/types/ruletypes/match.go.
export function normalizeMatchType(
	raw: string | undefined,
): AlertThresholdMatchType | undefined {
	switch (raw) {
		case '1':
		case 'at_least_once':
			return AlertThresholdMatchType.AT_LEAST_ONCE;
		case '2':
		case 'all_the_times':
			return AlertThresholdMatchType.ALL_THE_TIME;
		case '3':
		case 'on_average':
		case 'avg':
			return AlertThresholdMatchType.ON_AVERAGE;
		case '4':
		case 'in_total':
		case 'sum':
			return AlertThresholdMatchType.IN_TOTAL;
		case '5':
		case 'last':
			return AlertThresholdMatchType.LAST;
		default:
			return undefined;
	}
}
