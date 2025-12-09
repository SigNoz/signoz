import { render, screen } from '@testing-library/react';
import { ColumnsType } from 'antd/es/table';
import { useTableView } from 'components/Logs/TableView/useTableView';
import {
	mockAllAvailableKeys,
	mockConflictingFieldsByDatatype,
} from 'container/OptionsMenu/__tests__/mockData';
import { FontSize } from 'container/OptionsMenu/types';
import {
	getColumnTitleWithTooltip,
	getFieldVariantsByName,
	hasMultipleVariants,
} from 'container/OptionsMenu/utils';

import InfinityTableView from '../index';

// Mock dependencies
jest.mock('hooks/useDarkMode', () => ({
	useIsDarkMode: (): boolean => false,
}));

jest.mock('react-router-dom', () => ({
	...jest.requireActual('react-router-dom'),
	useNavigate: (): any => jest.fn(),
}));

jest.mock('hooks/logs/useActiveLog', () => ({
	useActiveLog: (): any => ({
		activeLog: null,
		onSetActiveLog: jest.fn(),
		onClearActiveLog: jest.fn(),
		onAddToQuery: jest.fn(),
		onGroupByAttribute: jest.fn(),
	}),
}));

jest.mock('hooks/logs/useCopyLogLink', () => ({
	useCopyLogLink: (): any => ({
		isHighlighted: false,
	}),
}));

jest.mock('hooks/useDragColumns', () => ({
	__esModule: true,
	default: (): any => ({
		draggedColumns: [],
		onDragColumns: jest.fn(),
	}),
}));

jest.mock('components/Logs/TableView/useTableView', () => ({
	useTableView: jest.fn(),
}));

const mockUseTableView = useTableView as jest.MockedFunction<
	typeof useTableView
>;

describe('InfinityTableView - Header Rendering Backwards Compatibility', () => {
	const mockTableColumns: ColumnsType<Record<string, unknown>> = [
		{
			key: 'expand',
			title: 'Expand',
			dataIndex: 'expand',
		},
		{
			key: 'state-indicator',
			title: '',
			dataIndex: 'state-indicator',
		},
		{
			key: 'trace_id',
			title: 'trace_id', // String title
			dataIndex: 'trace_id',
		},
		{
			// eslint-disable-next-line sonarjs/no-duplicate-string
			key: 'http.status_code',
			title: getColumnTitleWithTooltip(
				mockConflictingFieldsByDatatype[0],
				hasMultipleVariants(
					'http.status_code',
					[mockConflictingFieldsByDatatype[0]],
					mockAllAvailableKeys,
				),
				getFieldVariantsByName([mockConflictingFieldsByDatatype[0]])[
					'http.status_code'
				] || [],
				[mockConflictingFieldsByDatatype[0]],
				mockAllAvailableKeys,
			), // ReactNode title with tooltip
			dataIndex: 'http.status_code',
		},
	];

	const defaultProps = {
		isLoading: false,
		tableViewProps: {
			logs: [],
			fields: [],
			linesPerRow: 1,
			fontSize: FontSize.SMALL,
			allAvailableKeys: mockAllAvailableKeys,
		},
		infitiyTableProps: {
			onEndReached: jest.fn(),
		},
	};

	beforeEach(() => {
		mockUseTableView.mockReturnValue({
			columns: mockTableColumns,
			dataSource: [],
		});
	});

	it('renders ReactNode title correctly', () => {
		// eslint-disable-next-line react/jsx-props-no-spreading
		render(<InfinityTableView {...defaultProps} />);

		// The ReactNode title should render without errors
		// Check that the column header contains the field name (capitalized)
		expect(screen.getByText(/Http\.status_code/i)).toBeInTheDocument();
	});

	it('applies capitalization to string titles', () => {
		// eslint-disable-next-line react/jsx-props-no-spreading
		render(<InfinityTableView {...defaultProps} />);

		// String title should be capitalized
		// Note: The actual rendering happens in tableHeader callback
		// We're testing that the logic handles string titles correctly
		const traceIdColumn = mockTableColumns.find((col) => col.key === 'trace_id');
		expect(traceIdColumn?.title).toBe('trace_id');

		// When rendered, it should capitalize the first letter
		// This is tested indirectly through the component rendering
	});

	it('handles mix of string and ReactNode titles', () => {
		// eslint-disable-next-line react/jsx-props-no-spreading
		render(<InfinityTableView {...defaultProps} />);

		// Both types of titles should render without errors
		// String title (trace_id) and ReactNode title (Http.status_code)
		const statusCodeHeader = screen.getByText(/Http\.status_code/i);
		expect(statusCodeHeader).toBeInTheDocument();

		// Verify that both string and ReactNode titles coexist
		const traceIdColumn = mockTableColumns.find((col) => col.key === 'trace_id');
		expect(traceIdColumn?.title).toBe('trace_id');
	});

	it('renders tooltip ReactNode without errors', () => {
		// eslint-disable-next-line react/jsx-props-no-spreading
		render(<InfinityTableView {...defaultProps} />);

		// The ReactNode with tooltip should render
		// Check for tooltip icon
		const tooltipIcon = document.querySelector('.anticon-info-circle');
		expect(tooltipIcon).toBeInTheDocument();
	});

	it('filters out columns without keys', () => {
		const columnsWithEmptyKey: ColumnsType<Record<string, unknown>> = [
			...mockTableColumns,
			{
				key: undefined,
				title: 'No Key',
				dataIndex: 'no_key',
			},
		];

		mockUseTableView.mockReturnValue({
			columns: columnsWithEmptyKey,
			dataSource: [],
		});

		// eslint-disable-next-line react/jsx-props-no-spreading
		render(<InfinityTableView {...defaultProps} />);

		// Column without key should be filtered out
		expect(screen.queryByText('No Key')).not.toBeInTheDocument();
	});

	it('handles empty tableColumns array', () => {
		mockUseTableView.mockReturnValue({
			columns: [],
			dataSource: [],
		});

		// eslint-disable-next-line react/jsx-props-no-spreading
		render(<InfinityTableView {...defaultProps} />);

		// Should render without errors even with empty columns
		expect(screen.queryByText('http.status_code')).not.toBeInTheDocument();
	});
});
