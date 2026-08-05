import { useMemo, useState } from 'react';
import { useListLLMPricingRules } from 'api/generated/services/llmpricingrules';
import useDebounce from 'hooks/useDebounce';

import {
	RULE_OPTIONS_LIMIT,
	SEARCH_DEBOUNCE_MS,
} from 'container/LLMObservability/Settings/ModelPricing/constants';
import type { PricingRule } from 'container/LLMObservability/Settings/ModelPricing/types';

interface UseMapToBillingModelSearch {
	searchText: string;
	setSearchText: (value: string) => void;
	rules: PricingRule[];
	// Fetched rules keyed by id, so a pick can resolve to its full rule object.
	rulesById: Map<string, PricingRule>;
	isFetching: boolean;
}

// Server-side search for the per-row "Map to billing model" dropdown. Only
// RULE_OPTIONS_LIMIT rules are fetched at a time; typing narrows the set via the
// rules API's `q` param instead of filtering client-side. The fetch is gated on
// `enabled` (the dropdown's open state) so closed rows don't fetch, and
// react-query dedupes identical query keys so rows sharing a term hit the network
// once.
export function useMapToBillingModelSearch(
	enabled: boolean,
): UseMapToBillingModelSearch {
	const [searchText, setSearchText] = useState('');
	const debouncedSearch = useDebounce(searchText, SEARCH_DEBOUNCE_MS);

	const { data, isFetching } = useListLLMPricingRules(
		{ offset: 0, limit: RULE_OPTIONS_LIMIT, q: debouncedSearch || undefined },
		{ query: { enabled } },
	);

	const rules = useMemo<PricingRule[]>(() => data?.data?.items || [], [data]);
	const rulesById = useMemo(
		() => new Map(rules.map((rule) => [rule.id, rule])),
		[rules],
	);

	return { searchText, setSearchText, rules, rulesById, isFetching };
}
