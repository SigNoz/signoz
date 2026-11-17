import { useCallback } from 'react';
import { useNavigate } from 'react-router';

import type { NavigateFn, NavigateOptions, To } from './types';

/**
 * Hook-context imperative navigation, for the call sites that only push or
 * replace. Prefer `useSafeNavigate` when the call site wants same-URL
 * suppression or new-tab handling.
 */
export function useAppNavigate(): NavigateFn {
	const navigate = useNavigate();

	return useCallback(
		(to: To, options?: NavigateOptions): void => {
			navigate(to, { replace: options?.replace, state: options?.state });
		},
		[navigate],
	);
}
