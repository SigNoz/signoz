// eslint-disable-next-line no-restricted-imports -- React Context required for scoped store pattern
import { createContext, useContext } from 'react';

import type { QuerySearchV2ContextValue } from './QuerySearchV2.store';

export const QuerySearchV2Context =
	createContext<QuerySearchV2ContextValue | null>(null);

export function useQuerySearchV2Context(): QuerySearchV2ContextValue {
	const context = useContext(QuerySearchV2Context);
	if (!context) {
		throw new Error(
			'useQuerySearchV2Context must be used within a QuerySearchV2Provider',
		);
	}
	return context;
}
