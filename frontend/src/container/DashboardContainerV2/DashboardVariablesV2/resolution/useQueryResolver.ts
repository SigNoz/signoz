import { useQuery } from 'react-query';
import dashboardVariablesQuery from 'api/dashboard/variables/dashboardVariablesQuery';
import type { PayloadVariables } from 'types/api/dashboard/variables/query';

import { substituteVariables } from '../substitution';
import type { SelectionsByName } from '../state/types';
import { failure, idle, loading, success, type ResolvedValues } from './types';

/**
 * Reduce the user's V2 selections to the V1 `PayloadVariables` shape the
 * variables/query endpoint expects (a plain name → selected-value map).
 */
function selectionsToPayload(
	selections: SelectionsByName,
): PayloadVariables {
	const out: PayloadVariables = {};
	Object.entries(selections).forEach(([name, sel]) => {
		if (!sel) return;
		if (sel.kind === 'text') {
			out[name] = sel.value;
		} else if (sel.allSelected) {
			// Endpoint understands `__ALL__`-style markers via the substitution
			// done client-side; leave the value out so server doesn't double up.
			// (Callers using IN ($var) expand via substituteVariables instead.)
		} else if (sel.values.length === 1) {
			out[name] = sel.values[0];
		} else {
			out[name] = sel.values;
		}
	});
	return out;
}

interface UseQueryResolverArgs {
	variableName: string;
	queryValue: string;
	selections: SelectionsByName;
	enabled: boolean;
}

/**
 * QUERY variables: substitute `$var` references using current selections,
 * then POST to `/api/v2/variables/query`. React Query caches per
 * (name, substitutedQuery) so re-render with the same inputs reuses results.
 */
export function useQueryResolver({
	variableName,
	queryValue,
	selections,
	enabled,
}: UseQueryResolverArgs): ResolvedValues {
	const substituted = substituteVariables(queryValue, selections);

	const { data, isLoading, isError, error } = useQuery({
		queryKey: ['v2-variable-query', variableName, substituted],
		queryFn: () =>
			dashboardVariablesQuery({
				query: substituted,
				variables: selectionsToPayload(selections),
			}),
		enabled: enabled && !!substituted,
		refetchOnWindowFocus: false,
	});

	if (!enabled || !substituted) return idle;
	if (isLoading) return loading;
	if (isError) {
		return failure(
			(error as { details?: { error?: string } })?.details?.error ??
				(error as Error)?.message ??
				'Variable query failed',
		);
	}
	const payload = (data as { payload?: { variableValues?: unknown[] } } | undefined)
		?.payload;
	const values = (payload?.variableValues ?? []).map((v) => String(v));
	return success(values);
}
