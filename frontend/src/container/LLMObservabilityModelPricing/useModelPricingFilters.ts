import { useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import useUrlQuery from 'hooks/useUrlQuery';

import { PAGE_KEY } from './constants';
import type { ModelPricingFilters } from './types';

// Keeps the model-cost list pagination in the URL so the view is shareable and
// reload-safe. Search/source filters were removed for now — they'll return here
// once the list API honours them.
export function useModelPricingFilters(): ModelPricingFilters {
	const history = useHistory();
	const urlQuery = useUrlQuery();

	const page = Math.max(1, Number(urlQuery.get(PAGE_KEY)) || 1);

	const setPage = useCallback(
		(value: number): void => {
			const next = new URLSearchParams(urlQuery.toString());
			// Keep the default page out of the URL.
			if (value <= 1) {
				next.delete(PAGE_KEY);
			} else {
				next.set(PAGE_KEY, String(value));
			}
			history.replace({ search: next.toString() });
		},
		[history, urlQuery],
	);

	return { page, setPage };
}
