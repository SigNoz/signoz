import { forwardRef } from 'react';
import { render, screen } from '@testing-library/react';

import type { TableColumnDef, TanStackTableProps } from '../types';
import TanStackTable from '../index';

jest.mock('react-virtuoso', () => ({
	TableVirtuoso: forwardRef<
		unknown,
		{ fixedHeaderContent?: () => JSX.Element }
	>(function MockVirtuoso({ fixedHeaderContent }, _ref) {
		return (
			<div data-testid="virtuoso">
				{fixedHeaderContent?.()}
			</div>
		);
	}),
}));

jest.mock('../useTableParams', () => ({
	useTableParams: (): Record<string, unknown> => ({
		page: 1,
		limit: 50,
		orderBy: null,
		setPage: jest.fn(),
		setLimit: jest.fn(),
		setOrderBy: jest.fn(),
	}),
}));

jest.mock('../../Spinner', () => ({
	__esModule: true,
	default: ({ tip }: { tip: string }): JSX.Element => (
		<div data-testid="spinner">{tip}</div>
	),
}));

jest.mock('hooks/useDarkMode', () => ({
	useIsDarkMode: (): boolean => false,
}));

type Row = { id: string };

const col = (): TableColumnDef<Row> => ({
	id: 'id',
	header: 'ID',
	cell: ({ row }) => row.id,
	accessorKey: 'id',
});

const baseProps: TanStackTableProps<Row> = {
	data: [{ id: '1' }],
	columns: [col()],
};

describe('TanStackTable', () => {
	it('renders virtuoso when not loading', () => {
		render(<TanStackTable {...baseProps} />);
		expect(screen.getByTestId('virtuoso')).toBeInTheDocument();
	});

	it('shows loading spinner overlay when isLoading is true', () => {
		render(<TanStackTable {...baseProps} isLoading />);
		expect(screen.getByTestId('spinner')).toBeInTheDocument();
	});

	it('passes loadingTip to spinner', () => {
		render(
			<TanStackTable {...baseProps} isLoading loadingTip="Fetching hosts" />,
		);
		expect(screen.getByTestId('spinner')).toHaveTextContent('Fetching hosts');
	});
});
