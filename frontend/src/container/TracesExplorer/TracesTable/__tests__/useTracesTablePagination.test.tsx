import { ReactNode } from 'react';
import { NuqsTestingAdapter, UrlUpdateEvent } from 'nuqs/adapters/testing';
import { renderHook, waitFor } from 'tests/test-utils';

import { useTracesTablePagination } from '../useTracesTablePagination';

let mockQueryId = 'query-1';
jest.mock('hooks/queryBuilder/useQueryBuilder', () => ({
	useQueryBuilder: (): unknown => ({ stagedQuery: { id: mockQueryId } }),
}));

const renderPagination = (
	searchParams: Record<string, string>,
): {
	offsets: number[];
	urlUpdates: UrlUpdateEvent[];
	rerender: () => void;
} => {
	const offsets: number[] = [];
	const urlUpdates: UrlUpdateEvent[] = [];
	const wrapper = ({ children }: { children: ReactNode }): JSX.Element => (
		<NuqsTestingAdapter
			searchParams={searchParams}
			onUrlUpdate={(event): void => {
				urlUpdates.push(event);
			}}
			hasMemory
		>
			{children}
		</NuqsTestingAdapter>
	);
	const { rerender } = renderHook(
		() => {
			const pagination = useTracesTablePagination();
			offsets.push(pagination.request.offset);
			return pagination;
		},
		{ wrapper },
	);
	return { offsets, urlUpdates, rerender };
};

describe('useTracesTablePagination', () => {
	beforeEach(() => {
		mockQueryId = 'query-1';
	});

	it('requests the page in the URL for the query it was picked on', () => {
		const { offsets, rerender } = renderPagination({ page: '3', limit: '10' });

		rerender();

		expect(new Set(offsets)).toStrictEqual(new Set([20]));
	});

	it('requests the first page as soon as a new query runs, then resets the URL', async () => {
		const { offsets, urlUpdates, rerender } = renderPagination({
			page: '3',
			limit: '10',
		});
		const before = offsets.length;

		mockQueryId = 'query-2';
		rerender();

		expect(offsets.slice(before)).not.toContain(20);
		// Page 1 is the default, so the URL drops the param.
		await waitFor(() =>
			expect(urlUpdates.at(-1)?.searchParams.has('page')).toBe(false),
		);
	});
});
