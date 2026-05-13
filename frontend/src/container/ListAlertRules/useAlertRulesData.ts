import { useEffect, useMemo, useRef } from 'react';
import logEvent from 'api/common/logEvent';
import { useListRules } from 'api/generated/services/rules';
import { searchByLabels } from 'components/Alerts/utils';
import type { SortState } from 'components/TanStackTableView/types';
import { isUndefined } from 'lodash-es';

import type { AlertRule } from './types';
import { filterRulesByFilters, sortRules } from './utils';

interface UseAlertRulesDataReturn {
	allRules: AlertRule[];
	filteredRules: AlertRule[];
	isFetching: boolean;
	isError: boolean;
	refetch: () => void;
}

export function useAlertRulesData(
	orderBy: SortState | null,
	searchText = '',
	filters: string[] = [],
): UseAlertRulesDataReturn {
	const hasLoggedEvent = useRef(false);

	const rulesResponse = useListRules();

	const allRules = useMemo(
		() => rulesResponse.data?.data ?? [],
		[rulesResponse.data],
	);

	useEffect(() => {
		if (!hasLoggedEvent.current && !isUndefined(rulesResponse.data?.data)) {
			void logEvent('Alert: List page visited', {
				number: allRules.length,
			});
			hasLoggedEvent.current = true;
		}
	}, [rulesResponse.data, allRules.length]);

	const filteredRules = useMemo(() => {
		const filtered = filterRulesByFilters(allRules, filters);
		const searched = searchByLabels(filtered, searchText, (r) => r.alert ?? '');
		return sortRules(searched, orderBy);
	}, [allRules, filters, searchText, orderBy]);

	return {
		allRules,
		filteredRules,
		isFetching: rulesResponse.isFetching,
		isError: rulesResponse.isError,
		refetch: rulesResponse.refetch,
	};
}
