import { forwardRef } from 'react';
import { render, screen } from '@testing-library/react';
import { FontSize } from 'container/OptionsMenu/types';

import type { InfinityTableProps } from '../../InfinityTableView/types';
import TanStackTableView from '../index';

jest.mock('react-virtuoso', () => ({
	TableVirtuoso: forwardRef<
		unknown,
		{
			fixedHeaderContent?: () => JSX.Element;
			itemContent: (i: number) => JSX.Element;
		}
	>(function MockVirtuoso({ fixedHeaderContent, itemContent }, _ref) {
		return (
			<div data-testid="virtuoso">
				{fixedHeaderContent?.()}
				{itemContent(0)}
			</div>
		);
	}),
}));

jest.mock('components/Logs/TableView/useTableView', () => ({
	useTableView: (): {
		dataSource: Record<string, string>[];
		columns: unknown[];
	} => ({
		dataSource: [{ id: '1' }],
		columns: [
			{ key: 'body', title: 'body', render: (): string => 'x' },
			{ key: 'state-indicator', title: 's', render: (): string => 'y' },
		],
	}),
}));

jest.mock('hooks/useDragColumns', () => ({
	__esModule: true,
	default: (): {
		draggedColumns: unknown[];
		onColumnOrderChange: () => void;
	} => ({
		draggedColumns: [],
		onColumnOrderChange: jest.fn(),
	}),
}));

jest.mock('hooks/logs/useActiveLog', () => ({
	useActiveLog: (): { activeLog: null } => ({ activeLog: null }),
}));

jest.mock('hooks/logs/useCopyLogLink', () => ({
	useCopyLogLink: (): { activeLogId: null } => ({ activeLogId: null }),
}));

jest.mock('hooks/useDarkMode', () => ({
	useIsDarkMode: (): boolean => false,
}));

jest.mock('react-router-dom', () => ({
	useLocation: (): { pathname: string } => ({ pathname: '/logs' }),
}));

jest.mock('react-use', () => ({
	useCopyToClipboard: (): [unknown, () => void] => [null, jest.fn()],
}));

jest.mock('@signozhq/sonner', () => ({
	toast: { success: jest.fn() },
}));

jest.mock('components/Spinner', () => ({
	__esModule: true,
	default: ({ tip }: { tip: string }): JSX.Element => (
		<div data-testid="spinner">{tip}</div>
	),
}));

const baseProps: InfinityTableProps = {
	isLoading: false,
	tableViewProps: {
		logs: [{ id: '1' } as never],
		fields: [],
		linesPerRow: 3,
		fontSize: FontSize.SMALL,
		appendTo: 'end',
		activeLogIndex: 0,
	},
};

describe('TanStackTableView', () => {
	it('shows spinner while loading', () => {
		render(<TanStackTableView {...baseProps} isLoading />);

		expect(screen.getByTestId('spinner')).toHaveTextContent('Getting Logs');
	});

	it('renders virtuoso when not loading', () => {
		render(<TanStackTableView {...baseProps} />);

		expect(screen.getByTestId('virtuoso')).toBeInTheDocument();
	});
});
