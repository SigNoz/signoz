import { useNavigationType } from 'react-router-dom-v5-compat';

import type { NavigationAction } from './types';

/**
 * The action that produced the current location — `POP` for browser back and
 * forward. v6 only; v5 exposes this as `history.action`.
 */
export function useAppNavigationType(): NavigationAction {
	return useNavigationType();
}
