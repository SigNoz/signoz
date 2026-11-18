import { useCallback, useEffect, useState } from 'react';

import { loadSubdivisions, SubdivisionSet } from '../geo/subdivisions';
import { SubdivisionCountry } from '../types';

export type SubdivisionStatus = 'idle' | 'loading' | 'ready' | 'failed';

export interface SubdivisionLoad {
	set: SubdivisionSet | null;
	status: SubdivisionStatus;
	retry: () => void;
}

interface Settled {
	key: string;
	set: SubdivisionSet | null;
}

/** A country's states, loaded on first use; `idle` when no country is asked for. */
export function useSubdivisionSet(
	country: SubdivisionCountry | undefined,
): SubdivisionLoad {
	const [attempt, setAttempt] = useState(0);
	const [settled, setSettled] = useState<Settled | null>(null);
	const key = `${country ?? ''}:${attempt}`;

	useEffect(() => {
		if (!country) {
			return undefined;
		}
		let cancelled = false;
		loadSubdivisions(country)
			.then((loaded) => {
				if (!cancelled) {
					setSettled({ key, set: loaded });
				}
				return loaded;
			})
			.catch(() => {
				if (!cancelled) {
					setSettled({ key, set: null });
				}
			});
		return (): void => {
			cancelled = true;
		};
	}, [country, key]);

	const retry = useCallback(() => setAttempt((count) => count + 1), []);

	if (!country) {
		return { set: null, status: 'idle', retry };
	}
	if (settled?.key !== key) {
		return { set: null, status: 'loading', retry };
	}
	return settled.set
		? { set: settled.set, status: 'ready', retry }
		: { set: null, status: 'failed', retry };
}
