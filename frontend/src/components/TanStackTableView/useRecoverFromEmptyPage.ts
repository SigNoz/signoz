import { useEffect, useRef } from 'react';

import { SetPageOptions } from './useTableParams';

const FIRST_PAGE = 1;
const REPLACE_HISTORY: SetPageOptions = { history: 'replace' };

/**
 * How many single-page step-backs to attempt before giving up and going to page 1.
 *
 * A step-back only happens when `total` claims the current page should hold data but the
 * response came back empty. Each hop costs a request, so an inflated `total` on a high page
 * number would otherwise walk the user down one page at a time behind a spinner.
 */
const MAX_STEP_BACKS = 2;

type Correction = {
	from: number;
	to: number;
};

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
	const setPageRef = useRef(setPage);
	const lastCorrectionRef = useRef<Correction | null>(null);
	const stepBacksRef = useRef(0);

	useEffect(() => {
		setPageRef.current = setPage;
	});

	useEffect(() => {
		if (lastCorrectionRef.current && lastCorrectionRef.current.from !== page) {
			lastCorrectionRef.current = null;
		}

		const correctTo = (nextPage: number): boolean => {
			if (lastCorrectionRef.current?.to === nextPage) {
				return false;
			}

			lastCorrectionRef.current = { from: page, to: nextPage };
			setPageRef.current(nextPage, REPLACE_HISTORY);
			return true;
		};

		// A page below the first one is invalid on its own terms — it usually maps to a
		// negative offset the API rejects outright, so waiting for a response that will
		// never arrive (or trusting a failed one) would strand the user for good.
		if (page < FIRST_PAGE) {
			stepBacksRef.current = 0;
			void correctTo(FIRST_PAGE);
			return;
		}

		if (isFetching || isDisabled) {
			return;
		}

		// The page has data, or there is genuinely nothing to show anywhere.
		if (rowCount > 0 || page === FIRST_PAGE) {
			stepBacksRef.current = 0;
			return;
		}

		const currentPage = Math.floor(page);
		const lastPageWithData =
			pageSize > 0 && total > 0 ? Math.ceil(total / pageSize) : FIRST_PAGE;
		const nextPage = Math.max(
			FIRST_PAGE,
			Math.min(lastPageWithData, currentPage - 1),
		);

		// `total` disagrees with the response: it says this page should have rows, so the
		// only safe move is one page back. Cap how often that repeats — every hop is a
		// request, and a badly inflated `total` would otherwise crawl down from page 40.
		const isStepBack = nextPage === currentPage - 1;

		if (isStepBack && stepBacksRef.current >= MAX_STEP_BACKS) {
			if (correctTo(FIRST_PAGE)) {
				stepBacksRef.current = 0;
			}
			return;
		}

		if (correctTo(nextPage) && isStepBack) {
			stepBacksRef.current += 1;
		}
	}, [isFetching, isDisabled, page, pageSize, rowCount, total]);
}
