import { useCallback } from 'react';
import { useHistory } from 'react-router-dom';

import type { NavigateFn, NavigateOptions, To } from './types';
import { applyNavigate } from './utils';

/**
 * Hook-context imperative navigation, for `useHistory()` call sites that only
 * push or replace. Prefer `useSafeNavigate` when the call site wants same-URL
 * suppression or new-tab handling.
 */
export function useAppNavigate(): NavigateFn {
	const history = useHistory();

	return useCallback(
		(to: To, options?: NavigateOptions): void => {
			applyNavigate(history, to, options);
		},
		[history],
	);
}
