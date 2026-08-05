import { useEffect, useRef } from 'react';
import { useQueryClient } from 'react-query';

import type { OverrideState } from './types';

type Overrides = Record<string, OverrideState>;

export function useAuthZQueryInvalidation(overrides: Overrides): void {
	const queryClient = useQueryClient();
	const prevOverridesRef = useRef<Overrides>(overrides);

	useEffect(() => {
		const prevOverrides = prevOverridesRef.current;
		prevOverridesRef.current = overrides;

		const allKeys = new Set([
			...Object.keys(prevOverrides),
			...Object.keys(overrides),
		]);

		for (const key of allKeys) {
			if (prevOverrides[key] !== overrides[key]) {
				// Reset query to initial state and trigger refetch for active observers
				void queryClient.resetQueries(['authz', key]);
			}
		}
	}, [overrides, queryClient]);
}
