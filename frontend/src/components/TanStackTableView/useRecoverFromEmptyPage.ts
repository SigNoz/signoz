import { useEffect } from 'react';

import { SetPageOptions } from './useTableParams';

const FIRST_PAGE = 1;
const REPLACE_HISTORY: SetPageOptions = { history: 'replace' };

export type UseRecoverFromEmptyPageParams = {
	page: number;
	pageSize: number;
	rowCount: number;
	total: number;
	isFetching: boolean;
	isDisabled?: boolean;
	setPage: (page: number, options?: SetPageOptions) => void;
};

export function useRecoverFromEmptyPage({
	page,
	pageSize,
	rowCount,
	total,
	isFetching,
	isDisabled = false,
	setPage,
}: UseRecoverFromEmptyPageParams): void {
	useEffect(() => {
		// A page below the first one is invalid on its own terms — it usually maps to a
		// negative offset the API rejects outright, so waiting for a response that will
		// never arrive (or trusting a failed one) would strand the user for good.
		if (page < FIRST_PAGE) {
			setPage(FIRST_PAGE, REPLACE_HISTORY);
			return;
		}

		if (isFetching || isDisabled) {
			return;
		}

		// The page has data, or there is genuinely nothing to show anywhere.
		if (rowCount > 0 || page === FIRST_PAGE) {
			return;
		}

		const lastPageWithData =
			pageSize > 0 && total > 0 ? Math.ceil(total / pageSize) : FIRST_PAGE;

		setPage(Math.min(lastPageWithData, page - 1), REPLACE_HISTORY);
	}, [isFetching, isDisabled, page, pageSize, rowCount, total, setPage]);
}
