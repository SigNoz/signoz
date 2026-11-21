import type { UseQueryStateReturn } from 'nuqs';
import { parseAsStringEnum, useQueryState } from 'nuqs';

import { TraceDetailsTab } from '../constants';

export function useTraceDetailsTab(): UseQueryStateReturn<
	TraceDetailsTab,
	TraceDetailsTab
> {
	return useQueryState(
		'tab',
		parseAsStringEnum(Object.values(TraceDetailsTab)).withDefault(
			TraceDetailsTab.Overview,
		),
	);
}
