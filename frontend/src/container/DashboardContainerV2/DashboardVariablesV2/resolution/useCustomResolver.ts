import { useMemo } from 'react';
import { commaValuesParser } from 'lib/dashboardVariables/customCommaValuesParser';

import { success, type ResolvedValues } from './types';

/**
 * CUSTOM variables: the comma-separated user input is the value list.
 * No network call, purely client-side.
 */
export function useCustomResolver(customValue: string): ResolvedValues {
	return useMemo(
		() => success(commaValuesParser(customValue).map((v) => String(v))),
		[customValue],
	);
}
