import { useEffect } from 'react';
import { parseAsString, useQueryStates } from 'nuqs';
import { getUnstableCurrentSearchParams } from 'utils/getUnstableCurrentSearchParams';

import {
	ALL_ENDPOINTS_EXPRESSION_KEY,
	ENDPOINT_STATS_EXPRESSION_KEY,
} from '../../../filterParamKeys';
import {
	getLegacyFilterExpressions,
	useApiMonitoringParams,
} from '../../../queryParams';

/**
 * Moves the filters an older link keeps inside `apiMonitoringParams` into the
 * drawer's own params, then rewrites `apiMonitoringParams` without them, so it
 * happens once.
 */
export function useConvertLegacyFilterLinks(): void {
	const [, setParams] = useApiMonitoringParams();
	const [, setDrawerFilters] = useQueryStates({
		[ALL_ENDPOINTS_EXPRESSION_KEY]: parseAsString,
		[ENDPOINT_STATS_EXPRESSION_KEY]: parseAsString,
	});

	useEffect(() => {
		const legacy = getLegacyFilterExpressions(
			`?${getUnstableCurrentSearchParams().toString()}`,
		);
		if (
			legacy.allEndpoints === undefined &&
			legacy.endPointDetails === undefined
		) {
			return;
		}
		void setDrawerFilters({
			[ALL_ENDPOINTS_EXPRESSION_KEY]: legacy.allEndpoints || null,
			[ENDPOINT_STATS_EXPRESSION_KEY]: legacy.endPointDetails || null,
		});
		setParams({}, true);
	}, [setParams, setDrawerFilters]);
}
