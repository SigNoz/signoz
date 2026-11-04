import { useLocation } from 'react-router';

import type { AppLocation } from './types';

export function useAppLocation<S = unknown>(): AppLocation<S> {
	return useLocation() as AppLocation<S>;
}
