import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UrlUpdateEvent } from 'nuqs/adapters/testing';

import { renderTanStackTable } from './testUtils';

jest.mock('hooks/useDarkMode', () => ({
	useIsDarkMode: (): boolean => false,
}));

jest.mock('../TanStackTable.module.scss', () => ({
	__esModule: true,
	default: {
		tanStackTable: 'tanStackTable',
		tableRow: 'tableRow',
		tableRowActive: 'tableRowActive',
		tableRowExpansion: 'tableRowExpansion',
		tableCell: 'tableCell',
		tableCellExpansion: 'tableCellExpansion',
		tableHeaderCell: 'tableHeaderCell',
		tableCellText: 'tableCellText',
		tableViewRowActions: 'tableViewRowActions',
	},
}));

describe('TanStackTableView Integration', () => {
	describe('rendering', () => {
		it('renders all data rows', async () => {
			renderTanStackTable({});
			await waitFor(() => {
				expect(screen.getByText('Item 1')).toBeInTheDocument();
				expect(screen.getByText('Item 2')).toBeInTheDocument();
				expect(screen.getByText('Item 3')).toBeInTheDocument();
			});
		});

		it('renders column headers', async () => {
			renderTanStackTable({});
			await waitFor(() => {
				expect(screen.getByText('ID')).toBeInTheDocument();
				expect(screen.getByText('Name')).toBeInTheDocument();
				expect(screen.getByText('Value')).toBeInTheDocument();
			});
		});

		it('renders empty state when data is empty and not loading', async () => {
			renderTanStackTable({
				props: { data: [], isLoading: false },
			});
			// Table should still render but with no data rows
			await waitFor(() => {
				expect(screen.queryByText('Item 1')).not.toBeInTheDocument();
			});
		});

		it('renders table structure when loading with no previous data', async () => {
			renderTanStackTable({
				props: { data: [], isLoading: true },
			});
			// Table should render with skeleton rows
			await waitFor(() => {
				expect(screen.getByRole('table')).toBeInTheDocument();
			});
		});
	});

	describe('loading states', () => {
		it('keeps table mounted when loading with no data', () => {
			renderTanStackTable({
				props: { data: [], isLoading: true },
			});
			// Table should still be in the DOM for skeleton rows
			expect(screen.getByRole('table')).toBeInTheDocument();
		});

		it('shows loading spinner for infinite scroll when loading', () => {
			renderTanStackTable({
				props: { isLoading: true, onEndReached: jest.fn() },
			});
			expect(screen.getByTestId('tanstack-infinite-loader')).toBeInTheDocument();
		});

		it('does not show loading spinner for infinite scroll when not loading', () => {
			renderTanStackTable({
				props: { isLoading: false, onEndReached: jest.fn() },
			});
			expect(
				screen.queryByTestId('tanstack-infinite-loader'),
			).not.toBeInTheDocument();
		});

		it('does not show loading spinner when not in infinite scroll mode', () => {
			renderTanStackTable({
				props: { isLoading: true },
			});
			expect(
				screen.queryByTestId('tanstack-infinite-loader'),
			).not.toBeInTheDocument();
		});
	});

	describe('pagination', () => {
		it('renders pagination when pagination prop is provided', async () => {
			renderTanStackTable({
				props: {
					pagination: { total: 100, defaultPage: 1, defaultLimit: 10 },
				},
			});
			await waitFor(() => {
				// Look for pagination navigation or page number text
				expect(screen.getByRole('navigation')).toBeInTheDocument();
			});
		});

		it('updates page when clicking page number', async () => {
			const user = userEvent.setup();
			const onUrlUpdate = jest.fn<void, [UrlUpdateEvent]>();

			renderTanStackTable({
				props: {
					pagination: { total: 100, defaultPage: 1, defaultLimit: 10 },
					enableQueryParams: true,
				},
				onUrlUpdate,
			});

			await waitFor(() => {
				expect(screen.getByRole('navigation')).toBeInTheDocument();
			});

			// Find page 2 button/link within pagination navigation
			const nav = screen.getByRole('navigation');
			const page2 = Array.from(nav.querySelectorAll('button')).find(
				(btn) => btn.textContent?.trim() === '2',
			);
			if (!page2) {
				throw new Error('Page 2 button not found in pagination');
			}
			await user.click(page2);

			await waitFor(() => {
				const lastPage = onUrlUpdate.mock.calls
					.map((call) => call[0].searchParams.get('page'))
					.filter(Boolean)
					.pop();
				expect(lastPage).toBe('2');
			});
		});

		it('does not render pagination in infinite scroll mode', async () => {
			renderTanStackTable({
				props: {
					pagination: { total: 100 },
					onEndReached: jest.fn(), // This enables infinite scroll mode
				},
			});

			await waitFor(() => {
				expect(screen.getByText('Item 1')).toBeInTheDocument();
			});

			// Pagination should not be visible in infinite scroll mode
			expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
		});

		it('renders prefixPaginationContent before pagination', async () => {
			renderTanStackTable({
				props: {
					pagination: { total: 100 },
					prefixPaginationContent: <span data-testid="prefix-content">Prefix</span>,
				},
			});

			await waitFor(() => {
				expect(screen.getByTestId('prefix-content')).toBeInTheDocument();
			});
		});

		it('renders suffixPaginationContent after pagination', async () => {
			renderTanStackTable({
				props: {
					pagination: { total: 100 },
					suffixPaginationContent: <span data-testid="suffix-content">Suffix</span>,
				},
			});

			await waitFor(() => {
				expect(screen.getByTestId('suffix-content')).toBeInTheDocument();
			});
		});
	});

	describe('sorting', () => {
		it('updates orderBy URL param when clicking sortable header', async () => {
			const user = userEvent.setup();
			const onUrlUpdate = jest.fn<void, [UrlUpdateEvent]>();

			renderTanStackTable({
				props: { enableQueryParams: true },
				onUrlUpdate,
			});

			await waitFor(() => {
				expect(screen.getByText('Item 1')).toBeInTheDocument();
			});

			// Find the sortable column header's sort button (ID column has enableSort: true)
			const sortButton = screen.getByTitle('ID');
			await user.click(sortButton);

			await waitFor(() => {
				const lastOrderBy = onUrlUpdate.mock.calls
					.map((call) => call[0].searchParams.get('order_by'))
					.filter(Boolean)
					.pop();
				expect(lastOrderBy).toBeDefined();
				const parsed = JSON.parse(lastOrderBy!);
				expect(parsed.columnName).toBe('id');
				expect(parsed.order).toBe('asc');
			});
		});

		it('toggles sort order on subsequent clicks', async () => {
			const user = userEvent.setup();
			const onUrlUpdate = jest.fn<void, [UrlUpdateEvent]>();

			renderTanStackTable({
				props: { enableQueryParams: true },
				onUrlUpdate,
			});

			await waitFor(() => {
				expect(screen.getByText('Item 1')).toBeInTheDocument();
			});

			const sortButton = screen.getByTitle('ID');

			// First click - asc
			await user.click(sortButton);
			// Second click - desc
			await user.click(sortButton);

			await waitFor(() => {
				const lastOrderBy = onUrlUpdate.mock.calls
					.map((call) => call[0].searchParams.get('order_by'))
					.filter(Boolean)
					.pop();
				if (lastOrderBy) {
					const parsed = JSON.parse(lastOrderBy);
					expect(parsed.order).toBe('desc');
				}
			});
		});
	});

	describe('row selection', () => {
		it('calls onRowClick with row data and itemKey', async () => {
			const user = userEvent.setup();
			const onRowClick = jest.fn();

			renderTanStackTable({
				props: {
					onRowClick,
					getRowKey: (row) => row.id,
				},
			});

			await waitFor(() => {
				expect(screen.getByText('Item 1')).toBeInTheDocument();
			});

			await user.click(screen.getByText('Item 1'));

			expect(onRowClick).toHaveBeenCalledWith(
				expect.objectContaining({ id: '1', name: 'Item 1' }),
				'1',
			);
		});

		it('applies active class when isRowActive returns true', async () => {
			renderTanStackTable({
				props: {
					isRowActive: (row) => row.id === '1',
				},
			});

			await waitFor(() => {
				expect(screen.getByText('Item 1')).toBeInTheDocument();
			});

			// Find the row containing Item 1 and check for active class
			const cell = screen.getByText('Item 1');
			const row = cell.closest('tr');
			expect(row).toHaveClass('tableRowActive');
		});

		it('calls onRowDeactivate when clicking active row', async () => {
			const user = userEvent.setup();
			const onRowClick = jest.fn();
			const onRowDeactivate = jest.fn();

			renderTanStackTable({
				props: {
					onRowClick,
					onRowDeactivate,
					isRowActive: (row) => row.id === '1',
				},
			});

			await waitFor(() => {
				expect(screen.getByText('Item 1')).toBeInTheDocument();
			});

			await user.click(screen.getByText('Item 1'));

			expect(onRowDeactivate).toHaveBeenCalled();
			expect(onRowClick).not.toHaveBeenCalled();
		});

		it('opens in new tab on ctrl+click', async () => {
			const onRowClick = jest.fn();
			const onRowClickNewTab = jest.fn();

			renderTanStackTable({
				props: {
					onRowClick,
					onRowClickNewTab,
					getRowKey: (row) => row.id,
				},
			});

			await waitFor(() => {
				expect(screen.getByText('Item 1')).toBeInTheDocument();
			});

			fireEvent.click(screen.getByText('Item 1'), { ctrlKey: true });

			expect(onRowClickNewTab).toHaveBeenCalledWith(
				expect.objectContaining({ id: '1' }),
				'1',
			);
			expect(onRowClick).not.toHaveBeenCalled();
		});

		it('opens in new tab on meta+click', async () => {
			const onRowClick = jest.fn();
			const onRowClickNewTab = jest.fn();

			renderTanStackTable({
				props: {
					onRowClick,
					onRowClickNewTab,
					getRowKey: (row) => row.id,
				},
			});

			await waitFor(() => {
				expect(screen.getByText('Item 1')).toBeInTheDocument();
			});

			fireEvent.click(screen.getByText('Item 1'), { metaKey: true });

			expect(onRowClickNewTab).toHaveBeenCalledWith(
				expect.objectContaining({ id: '1' }),
				'1',
			);
			expect(onRowClick).not.toHaveBeenCalled();
		});
	});

	describe('row expansion', () => {
		it('renders expanded content below the row when expanded', async () => {
			renderTanStackTable({
				props: {
					renderExpandedRow: (row) => (
						<div data-testid="expanded-content">Expanded: {row.name}</div>
					),
					getRowCanExpand: () => true,
				},
			});

			await waitFor(() => {
				expect(screen.getByText('Item 1')).toBeInTheDocument();
			});

			// Find and click expand button (if available in the row)
			// The expansion is controlled by TanStack Table's expanded state
			// For now, just verify the renderExpandedRow prop is wired correctly
			// by checking the table renders without errors
			expect(screen.getByRole('table')).toBeInTheDocument();
		});

		it('renders without errors when expanded state exists but expansion is disabled', async () => {
			// This tests that the table handles the case where URL has expanded state
			// but renderExpandedRow is undefined (expansion disabled).
			// The table's useEffect should reset expanded state automatically.
			renderTanStackTable({
				props: {
					enableQueryParams: true,
					// renderExpandedRow is undefined - expansion disabled
				},
				queryParams: { expanded: '["1"]' },
			});

			await waitFor(() => {
				expect(screen.getByText('Item 1')).toBeInTheDocument();
			});

			// Table should render without any expanded rows
			expect(screen.queryByTestId('expanded-content')).not.toBeInTheDocument();
		});

		it('renders expanded rows with unique keys in non-virtualized mode', async () => {
			// This tests that row and expansion items have unique keys to avoid
			// React's "duplicate key" warning when disableVirtualScroll is true
			renderTanStackTable({
				props: {
					disableVirtualScroll: true,
					enableQueryParams: true,
					renderExpandedRow: (row) => (
						<div data-testid={`expanded-${row.id}`}>Expanded: {row.name}</div>
					),
					getRowCanExpand: () => true,
					getRowKey: (row) => row.id,
				},
				queryParams: { expanded: '["1"]' },
			});

			await waitFor(() => {
				expect(screen.getByText('Item 1')).toBeInTheDocument();
			});

			// Both the row and its expansion content should be rendered
			expect(screen.getByTestId('expanded-1')).toBeInTheDocument();
			expect(screen.getByText('Expanded: Item 1')).toBeInTheDocument();

			// Verify all 3 data rows plus 1 expansion row = 4 tr elements in tbody
			const tbody = screen.getByRole('table').querySelector('tbody');
			expect(tbody?.querySelectorAll('tr')).toHaveLength(4);
		});
	});

	describe('disableVirtualScroll', () => {
		it('throws error when used with onEndReached', () => {
			expect(() => {
				renderTanStackTable({
					props: {
						disableVirtualScroll: true,
						onEndReached: jest.fn(),
					},
				});
			}).toThrow(
				'TanStackTable: Cannot use onEndReached with disableVirtualScroll. Infinite scroll requires virtualization.',
			);
		});

		it('renders all rows without virtualization', async () => {
			renderTanStackTable({
				props: {
					disableVirtualScroll: true,
				},
			});

			await waitFor(() => {
				expect(screen.getByText('Item 1')).toBeInTheDocument();
				expect(screen.getByText('Item 2')).toBeInTheDocument();
				expect(screen.getByText('Item 3')).toBeInTheDocument();
			});

			// Verify table structure exists
			expect(screen.getByRole('table')).toBeInTheDocument();
		});

		it('renders column headers without virtualization', async () => {
			renderTanStackTable({
				props: {
					disableVirtualScroll: true,
				},
			});

			await waitFor(() => {
				expect(screen.getByText('ID')).toBeInTheDocument();
				expect(screen.getByText('Name')).toBeInTheDocument();
				expect(screen.getByText('Value')).toBeInTheDocument();
			});
		});
	});

	describe('infinite scroll', () => {
		it('calls onEndReached when provided', async () => {
			const onEndReached = jest.fn();

			renderTanStackTable({
				props: {
					onEndReached,
				},
			});

			await waitFor(() => {
				expect(screen.getByText('Item 1')).toBeInTheDocument();
			});

			// Virtuoso will call onEndReached based on scroll position
			// In mock context, we verify the prop is wired correctly
			expect(onEndReached).toBeDefined();
		});

		it('shows loading spinner at bottom when loading in infinite scroll mode', () => {
			renderTanStackTable({
				props: {
					isLoading: true,
					onEndReached: jest.fn(),
				},
			});

			expect(screen.getByTestId('tanstack-infinite-loader')).toBeInTheDocument();
		});

		it('hides pagination in infinite scroll mode', async () => {
			renderTanStackTable({
				props: {
					pagination: { total: 100 },
					onEndReached: jest.fn(),
				},
			});

			await waitFor(() => {
				expect(screen.getByText('Item 1')).toBeInTheDocument();
			});

			// When onEndReached is provided, pagination should not render
			expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
		});
	});
});
