import { parseAsStringEnum, useQueryState, UseQueryStateReturn } from 'nuqs';

import { ThreadView } from '../types';

export function useThreadView(): UseQueryStateReturn<ThreadView, ThreadView> {
	return useQueryState(
		'view',
		parseAsStringEnum(Object.values(ThreadView)).withDefault(
			ThreadView.Formatted,
		),
	);
}
