import { useQuery, UseQueryOptions, UseQueryResult } from 'react-query';
import {
	getListRulesV3QueryKey,
	listRulesV3,
} from 'api/generated/services/rules';
import type { RuletypesListableRuleDTO } from 'api/generated/services/sigNoz.schemas';
import { range } from 'lodash-es';

// The list API clamps any larger limit to 200.
const PAGE_SIZE = 200;

export const LIST_ALL_RULES_QUERY_KEY = [...getListRulesV3QueryKey(), 'all'];

function fetchPage(offset: number): ReturnType<typeof listRulesV3> {
	return listRulesV3({ limit: PAGE_SIZE, offset });
}

// TODO(AshwinBhatkal): temporary. Replace with server-side search plus a lookup of saved rules by ID once
// /api/v3/rules can filter by IDs: https://github.com/SigNoz/pulse-pod/issues/715
async function fetchAllRules(): Promise<RuletypesListableRuleDTO[]> {
	const first = await fetchPage(0);
	const rest = await Promise.all(
		range(PAGE_SIZE, first.data.total, PAGE_SIZE).map(fetchPage),
	);

	return [...first.data.rules, ...rest.flatMap((page) => page.data.rules)];
}

export function useListAllRules(
	options?: Omit<
		UseQueryOptions<RuletypesListableRuleDTO[], Error>,
		'queryKey' | 'queryFn'
	>,
): UseQueryResult<RuletypesListableRuleDTO[], Error> {
	return useQuery<RuletypesListableRuleDTO[], Error>({
		queryKey: LIST_ALL_RULES_QUERY_KEY,
		queryFn: fetchAllRules,
		...options,
	});
}
