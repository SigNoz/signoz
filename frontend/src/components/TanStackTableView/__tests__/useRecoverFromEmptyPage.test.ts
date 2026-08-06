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
});
