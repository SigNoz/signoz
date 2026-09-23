import { useNavigationType } from 'react-router';

import type { NavigationAction } from './types';

/**
 * The action that produced the current location — `POP` for browser back and
 * forward.
 */
export function useAppNavigationType(): NavigationAction {
	return useNavigationType();
}
