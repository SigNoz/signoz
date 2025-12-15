import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { RESTRICTED_SELECTED_FIELDS } from 'container/LogsFilters/config';
import { LogViewMode } from 'container/LogsTable';
import { FontSize } from 'container/OptionsMenu/types';

import TableViewActions from '../TableViewActions';

// Mock the components and hooks
jest.mock('components/Logs/CopyClipboardHOC', () => ({
	__esModule: true,
	default: ({ children }: { children: React.ReactNode }): JSX.Element => (
		<div className="CopyClipboardHOC">{children}</div>
	),
}));

jest.mock('providers/Timezone', () => ({
	useTimezone: (): {
		formatTimezoneAdjustedTimestamp: (timestamp: string) => string;
	} => ({
		formatTimezoneAdjustedTimestamp: (timestamp: string): string => timestamp,
	}),
}));

jest.mock('react-router-dom', () => ({
	useLocation: (): {
		pathname: string;
		search: string;
		hash: string;
		state: null;
	} => ({
		pathname: '/test',
		search: '',
		hash: '',
		state: null,
	}),
}));

jest.mock('../useAsyncJSONProcessing', () => ({
	__esModule: true,
	default: (): {
		isLoading: boolean;
		treeData: unknown[] | null;
		error: string | null;
	} => ({
		isLoading: false,
		treeData: null,
		error: null,
	}),
}));

describe('TableViewActions', () => {
	const TEST_VALUE = 'test value';
	const ACTION_BUTTON_TEST_ID = '.action-btn';
	const TEST_FIELD = 'test-field';

	const defaultProps = {
		fieldData: {
			field: TEST_FIELD,
			value: TEST_VALUE,
		},
		record: {
			key: 'test-key',
			field: TEST_FIELD,
			value: TEST_VALUE,
		},
		isListViewPanel: false,
		isfilterInLoading: false,
		isfilterOutLoading: false,
		onClickHandler: jest.fn(),
		onGroupByAttribute: jest.fn(),
	};

	it('should render without crashing', () => {
		render(
			<TableViewActions
				fieldData={defaultProps.fieldData}
				record={defaultProps.record}
				isListViewPanel={defaultProps.isListViewPanel}
				isfilterInLoading={defaultProps.isfilterInLoading}
				isfilterOutLoading={defaultProps.isfilterOutLoading}
				onClickHandler={defaultProps.onClickHandler}
				onGroupByAttribute={defaultProps.onGroupByAttribute}
			/>,
		);
		expect(screen.getByText(TEST_VALUE)).toBeInTheDocument();
	});

	it('should not render action buttons for restricted fields', () => {
		RESTRICTED_SELECTED_FIELDS.forEach((field) => {
			const { container } = render(
				<TableViewActions
					fieldData={{
						...defaultProps.fieldData,
						field,
					}}
					record={{
						...defaultProps.record,
						field,
					}}
					isListViewPanel={defaultProps.isListViewPanel}
					isfilterInLoading={defaultProps.isfilterInLoading}
					isfilterOutLoading={defaultProps.isfilterOutLoading}
					onClickHandler={defaultProps.onClickHandler}
					onGroupByAttribute={defaultProps.onGroupByAttribute}
				/>,
			);
			// Verify that action buttons are not rendered for restricted fields
			expect(
				container.querySelector(ACTION_BUTTON_TEST_ID),
			).not.toBeInTheDocument();
		});
	});

	it('should render action buttons for non-restricted fields', () => {
		const { container } = render(
			<TableViewActions
				fieldData={defaultProps.fieldData}
				record={defaultProps.record}
				isListViewPanel={defaultProps.isListViewPanel}
				isfilterInLoading={defaultProps.isfilterInLoading}
				isfilterOutLoading={defaultProps.isfilterOutLoading}
				onClickHandler={defaultProps.onClickHandler}
				onGroupByAttribute={defaultProps.onGroupByAttribute}
			/>,
		);
		// Verify that action buttons are rendered for non-restricted fields
		expect(container.querySelector(ACTION_BUTTON_TEST_ID)).toBeInTheDocument();
	});

	it('should not render action buttons in list view panel', () => {
		const { container } = render(
			<TableViewActions
				fieldData={defaultProps.fieldData}
				record={defaultProps.record}
				isListViewPanel
				isfilterInLoading={defaultProps.isfilterInLoading}
				isfilterOutLoading={defaultProps.isfilterOutLoading}
				onClickHandler={defaultProps.onClickHandler}
				onGroupByAttribute={defaultProps.onGroupByAttribute}
			/>,
		);
		// Verify that action buttons are not rendered in list view panel
		expect(
			container.querySelector(ACTION_BUTTON_TEST_ID),
		).not.toBeInTheDocument();
	});

	describe('Add/Remove Column functionality', () => {
		const ADD_TO_COLUMNS_TEXT = 'Add to Columns';
		const REMOVE_FROM_COLUMNS_TEXT = 'Remove from Columns';

		const getEllipsisButton = (container: HTMLElement): HTMLElement => {
			const buttons = container.querySelectorAll('.filter-btn.periscope-btn');
			return buttons[buttons.length - 1] as HTMLElement;
		};

		const defaultSelectedOptions = {
			selectColumns: [],
			maxLines: 1,
			format: 'table' as LogViewMode,
			fontSize: FontSize.MEDIUM,
		};

		it('shows Add to Columns button when field is not selected', async () => {
			const onAddColumn = jest.fn();
			const { container } = render(
				<TableViewActions
					fieldData={defaultProps.fieldData}
					record={defaultProps.record}
					isListViewPanel={defaultProps.isListViewPanel}
					isfilterInLoading={defaultProps.isfilterInLoading}
					isfilterOutLoading={defaultProps.isfilterOutLoading}
					onClickHandler={defaultProps.onClickHandler}
					onGroupByAttribute={defaultProps.onGroupByAttribute}
					onAddColumn={onAddColumn}
					selectedOptions={defaultSelectedOptions}
				/>,
			);

			const ellipsisButton = getEllipsisButton(container);
			fireEvent.mouseOver(ellipsisButton);

			await waitFor(() => {
				expect(screen.getByText(ADD_TO_COLUMNS_TEXT)).toBeInTheDocument();
			});
		});

		it(`calls onAddColumn with correct field key when ${ADD_TO_COLUMNS_TEXT} is clicked`, async () => {
			const onAddColumn = jest.fn();
			const { container } = render(
				<TableViewActions
					fieldData={defaultProps.fieldData}
					record={defaultProps.record}
					isListViewPanel={defaultProps.isListViewPanel}
					isfilterInLoading={defaultProps.isfilterInLoading}
					isfilterOutLoading={defaultProps.isfilterOutLoading}
					onClickHandler={defaultProps.onClickHandler}
					onGroupByAttribute={defaultProps.onGroupByAttribute}
					onAddColumn={onAddColumn}
					selectedOptions={defaultSelectedOptions}
				/>,
			);

			const ellipsisButton = getEllipsisButton(container);
			fireEvent.mouseOver(ellipsisButton);

			await waitFor(() => {
				expect(screen.getByText(ADD_TO_COLUMNS_TEXT)).toBeInTheDocument();
			});

			const addButton = screen.getByText(ADD_TO_COLUMNS_TEXT);
			fireEvent.click(addButton);

			expect(onAddColumn).toHaveBeenCalledWith(TEST_FIELD);
		});

		it('shows Remove from Columns button when field is already selected', async () => {
			const onRemoveColumn = jest.fn();
			const { container } = render(
				<TableViewActions
					fieldData={defaultProps.fieldData}
					record={defaultProps.record}
					isListViewPanel={defaultProps.isListViewPanel}
					isfilterInLoading={defaultProps.isfilterInLoading}
					isfilterOutLoading={defaultProps.isfilterOutLoading}
					onClickHandler={defaultProps.onClickHandler}
					onGroupByAttribute={defaultProps.onGroupByAttribute}
					onRemoveColumn={onRemoveColumn}
					selectedOptions={{
						...defaultSelectedOptions,
						selectColumns: [{ name: TEST_FIELD }],
					}}
				/>,
			);

			const ellipsisButton = getEllipsisButton(container);
			fireEvent.mouseOver(ellipsisButton);

			await waitFor(() => {
				expect(screen.getByText(REMOVE_FROM_COLUMNS_TEXT)).toBeInTheDocument();
			});
			expect(screen.queryByText(ADD_TO_COLUMNS_TEXT)).not.toBeInTheDocument();
		});

		it(`calls onRemoveColumn with correct field key when ${REMOVE_FROM_COLUMNS_TEXT} is clicked`, async () => {
			const onRemoveColumn = jest.fn();
			const { container } = render(
				<TableViewActions
					fieldData={defaultProps.fieldData}
					record={defaultProps.record}
					isListViewPanel={defaultProps.isListViewPanel}
					isfilterInLoading={defaultProps.isfilterInLoading}
					isfilterOutLoading={defaultProps.isfilterOutLoading}
					onClickHandler={defaultProps.onClickHandler}
					onGroupByAttribute={defaultProps.onGroupByAttribute}
					onRemoveColumn={onRemoveColumn}
					selectedOptions={{
						...defaultSelectedOptions,
						selectColumns: [{ name: TEST_FIELD }],
					}}
				/>,
			);

			const ellipsisButton = getEllipsisButton(container);
			fireEvent.mouseOver(ellipsisButton);

			await waitFor(() => {
				expect(screen.getByText('Remove from Columns')).toBeInTheDocument();
			});

			const removeButton = screen.getByText(REMOVE_FROM_COLUMNS_TEXT);
			fireEvent.click(removeButton);

			expect(onRemoveColumn).toHaveBeenCalledWith(TEST_FIELD);
		});
	});
});
