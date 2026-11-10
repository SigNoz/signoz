import { renderHook } from '@testing-library/react';

import {
	useRecoverFromEmptyPage,
	UseRecoverFromEmptyPageParams,
} from '../useRecoverFromEmptyPage';

const REPLACE = { history: 'replace' };

function renderRecovery(
	overrides: Partial<UseRecoverFromEmptyPageParams> = {},
): { setPage: jest.Mock; rerender: (next?: unknown) => void } {
	const setPage = jest.fn();
	const props: UseRecoverFromEmptyPageParams = {
		page: 1,
		pageSize: 10,
		rowCount: 10,
		total: 100,
		isFetching: false,
		setPage,
		...overrides,
	};

	const { rerender } = renderHook(
		(next: UseRecoverFromEmptyPageParams) => useRecoverFromEmptyPage(next),
		{ initialProps: props },
	);

	return {
		setPage,
		rerender: (next?: unknown): void =>
			rerender({ ...props, ...(next as Partial<UseRecoverFromEmptyPageParams>) }),
	};
}

describe('useRecoverFromEmptyPage', () => {
	it('leaves the page alone while it still holds rows', () => {
		const { setPage } = renderRecovery({ page: 3, rowCount: 10 });

		expect(setPage).not.toHaveBeenCalled();
	});

	it('leaves the page alone on page 1 with no rows at all', () => {
		const { setPage } = renderRecovery({ page: 1, rowCount: 0, total: 0 });

		expect(setPage).not.toHaveBeenCalled();
	});

	it('jumps to the last page that holds data when the page is out of range', () => {
		const { setPage } = renderRecovery({
			page: 7,
			pageSize: 10,
			rowCount: 0,
			total: 25,
		});

		expect(setPage).toHaveBeenCalledWith(3, REPLACE);
	});

	it('replaces the history entry so the back button does not return to the empty page', () => {
		const { setPage } = renderRecovery({ page: 4, rowCount: 0, total: 10 });

		expect(setPage).toHaveBeenCalledWith(1, REPLACE);
	});

	it('falls back to page 1 when the total is unknown', () => {
		const { setPage } = renderRecovery({ page: 5, rowCount: 0, total: 0 });

		expect(setPage).toHaveBeenCalledWith(1, REPLACE);
	});

	it('steps back one page when the total claims the page should have data', () => {
		// total says 100 rows exist, yet page 5 came back empty — step back rather
		// than stall on a page the query cannot actually serve.
		const { setPage } = renderRecovery({
			page: 5,
			pageSize: 10,
			rowCount: 0,
			total: 100,
		});

		expect(setPage).toHaveBeenCalledWith(4, REPLACE);
	});

	it('clamps a page below the first one', () => {
		const { setPage } = renderRecovery({ page: 0, rowCount: 10 });

		expect(setPage).toHaveBeenCalledWith(1, REPLACE);
	});

	it('falls back to page 1 when pageSize is zero', () => {
		const { setPage } = renderRecovery({
			page: 5,
			pageSize: 0,
			rowCount: 0,
			total: 100,
		});

		expect(setPage).toHaveBeenCalledWith(1, REPLACE);
	});

	it('waits for the request to settle before moving the user', () => {
		const { setPage, rerender } = renderRecovery({
			page: 3,
			rowCount: 0,
			total: 10,
			isFetching: true,
		});

		expect(setPage).not.toHaveBeenCalled();

		rerender({ page: 3, rowCount: 0, total: 10, isFetching: false });

		expect(setPage).toHaveBeenCalledWith(1, REPLACE);
	});

	it('clamps a page below the first one even when the query failed', () => {
		// A negative offset is what made the request fail (400 "offset cannot be
		// negative"), so retrying the same page loops forever — clamp regardless.
		const { setPage } = renderRecovery({
			page: 0,
			rowCount: 0,
			total: 0,
			isDisabled: true,
		});

		expect(setPage).toHaveBeenCalledWith(1, REPLACE);
	});

	it('clamps a page below the first one while the query is still in flight', () => {
		const { setPage } = renderRecovery({
			page: -2,
			rowCount: 0,
			isFetching: true,
		});

		expect(setPage).toHaveBeenCalledWith(1, REPLACE);
	});

	it('keeps the page when the query failed so a retry lands where the user was', () => {
		const { setPage } = renderRecovery({
			page: 3,
			rowCount: 0,
			total: 0,
			isDisabled: true,
		});

		expect(setPage).not.toHaveBeenCalled();
	});

	it('clamps a page below the first one exactly once while the request settles', () => {
		// The clamp runs ahead of both gates, so a request settling underneath an
		// uncorrected page must not re-issue the same history rewrite.
		const { setPage, rerender } = renderRecovery({
			page: 0,
			rowCount: 0,
			total: 0,
			isFetching: true,
		});

		expect(setPage).toHaveBeenCalledTimes(1);

		rerender({ page: 0, rowCount: 0, total: 0, isFetching: false });

		expect(setPage).toHaveBeenCalledTimes(1);
	});

	it('stops correcting once the corrected page comes back with rows', () => {
		const { setPage, rerender } = renderRecovery({
			page: 7,
			pageSize: 10,
			rowCount: 0,
			total: 25,
		});

		expect(setPage).toHaveBeenCalledWith(3, REPLACE);

		// The correction lands: the query refetches, then resolves with the rows page 3 holds.
		rerender({ page: 3, pageSize: 10, rowCount: 0, total: 25, isFetching: true });
		rerender({
			page: 3,
			pageSize: 10,
			rowCount: 5,
			total: 25,
			isFetching: false,
		});

		expect(setPage).toHaveBeenCalledTimes(1);
	});

	it('does not correct again while the same page is still being observed', () => {
		const { setPage, rerender } = renderRecovery({
			page: 5,
			pageSize: 10,
			rowCount: 0,
			total: 100,
		});

		expect(setPage).toHaveBeenCalledTimes(1);

		// A refetch cycle that leaves the page untouched — the correction is already in flight.
		rerender({
			page: 5,
			pageSize: 10,
			rowCount: 0,
			total: 100,
			isFetching: true,
		});
		rerender({
			page: 5,
			pageSize: 10,
			rowCount: 0,
			total: 100,
			isFetching: false,
		});

		expect(setPage).toHaveBeenCalledTimes(1);
	});

	it('gives up on step-backs and jumps to page 1 when the total keeps lying', () => {
		// `total` claims 400 rows exist, but every page comes back empty. Walking back one
		// page at a time would cost a request per hop, so bail out to page 1 instead.
		const { setPage, rerender } = renderRecovery({
			page: 40,
			pageSize: 10,
			rowCount: 0,
			total: 400,
		});

		expect(setPage).toHaveBeenNthCalledWith(1, 39, REPLACE);

		rerender({ page: 39, pageSize: 10, rowCount: 0, total: 400 });

		expect(setPage).toHaveBeenNthCalledWith(2, 38, REPLACE);

		rerender({ page: 38, pageSize: 10, rowCount: 0, total: 400 });

		expect(setPage).toHaveBeenNthCalledWith(3, 1, REPLACE);
		expect(setPage).toHaveBeenCalledTimes(3);
	});

	it('corrects again when the user returns to a page that is still empty', () => {
		const { setPage, rerender } = renderRecovery({
			page: 3,
			pageSize: 10,
			rowCount: 0,
			total: 10,
		});

		expect(setPage).toHaveBeenNthCalledWith(1, 1, REPLACE);

		rerender({ page: 1, pageSize: 10, rowCount: 10, total: 10 });
		rerender({ page: 3, pageSize: 10, rowCount: 0, total: 10 });

		expect(setPage).toHaveBeenNthCalledWith(2, 1, REPLACE);
	});

	it('does not re-run the correction when setPage is a fresh function each render', () => {
		// The hook reads setPage through a ref, so an inline arrow must not turn the
		// ungated `page < 1` clamp into a per-render history rewrite.
		const setPage = jest.fn();
		const { rerender } = renderHook(
			() =>
				useRecoverFromEmptyPage({
					page: 0,
					pageSize: 10,
					rowCount: 0,
					total: 0,
					isFetching: false,
					setPage: (nextPage, options): void => setPage(nextPage, options),
				}),
			{ initialProps: undefined },
		);

		rerender(undefined);
		rerender(undefined);

		expect(setPage).toHaveBeenCalledTimes(1);
	});
});
