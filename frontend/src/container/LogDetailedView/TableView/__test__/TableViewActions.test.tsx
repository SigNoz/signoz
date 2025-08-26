import { render, screen } from '@testing-library/react';
import { RESTRICTED_SELECTED_FIELDS } from 'container/LogsFilters/config';

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

describe('TableViewActions', () => {
	const TEST_VALUE = 'test value';
	const ACTION_BUTTON_TEST_ID = '.action-btn';
	const defaultProps = {
		fieldData: {
			field: 'test-field',
			value: TEST_VALUE,
		},
		record: {
			key: 'test-key',
			field: 'test-field',
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
});
