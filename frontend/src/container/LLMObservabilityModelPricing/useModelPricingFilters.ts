import { type Options, parseAsInteger, useQueryState } from 'nuqs';

import { PAGE_KEY } from './constants';
import type { ModelPricingFilters } from './types';

// Replace (not push) so paging doesn't pollute the browser back-stack.
const opts: Options = { history: 'replace' };

// Keeps the model-cost list pagination in the URL (via nuqs) so the view is
// shareable and reload-safe. withDefault(1) omits ?page=1 to keep URLs clean.
// Search/source filters were removed for now — they'll return here once the
// list API honours them.
export function useModelPricingFilters(): ModelPricingFilters {
	const [page, setPage] = useQueryState(
		PAGE_KEY,
		parseAsInteger.withDefault(1).withOptions(opts),
	);

	return { page, setPage };
}
