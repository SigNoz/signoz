import { fireEvent, render, screen } from '@testing-library/react';
import { RESTRICTED_SELECTED_FIELDS } from 'container/LogsFilters/config';
import { useGetSearchQueryParam } from 'hooks/queryBuilder/useGetSearchQueryParam';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { ExplorerViews } from 'pages/LogsExplorer/utils';

import TableViewActions from '../TableViewActions';
import useAsyncJSONProcessing from '../useAsyncJSONProcessing';

// Mock data for tests
let mockCopyToClipboard: jest.Mock;
let mockNotificationsSuccess: jest.Mock;

// Mock the components and hooks
jest.mock('components/Logs/CopyClipboardHOC', () => ({
	__esModule: true,
	default: ({
		children,
		textToCopy,
		entityKey,
	}: {
		children: React.ReactNode;
		textToCopy: string;
		entityKey: string;
	}): JSX.Element => (
		// eslint-disable-next-line jsx-a11y/click-events-have-key-events
		<div
			className="CopyClipboardHOC"
			data-testid={`copy-clipboard-${entityKey}`}
			data-text-to-copy={textToCopy}
			onClick={(): void => {
				if (mockCopyToClipboard) {
					mockCopyToClipboard(textToCopy);
				}
				if (mockNotificationsSuccess) {
					mockNotificationsSuccess({
						message: `${entityKey} copied to clipboard`,
						key: `${entityKey} copied to clipboard`,
					});
				}
			}}
			role="button"
			tabIndex={0}
		>
			{children}
		</div>
	),
}));

jest.mock('../useAsyncJSONProcessing', () => ({
	__esModule: true,
	default: jest.fn(),
}));

jest.mock('antd', () => {
	const antd = jest.requireActual('antd');
	return {
		...antd,
		// Render popover content inline to make its children testable
		Popover: ({ content, children }: any): JSX.Element => (
			<div data-testid="popover">
				<div data-testid="popover-content">{content}</div>
				{children}
			</div>
		),
	};
});

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

jest.mock('hooks/queryBuilder/useQueryBuilder');
jest.mock('hooks/queryBuilder/useGetSearchQueryParam');

describe('TableViewActions', () => {
	const TEST_VALUE = 'test value';
	const TEST_FIELD = 'test-field';
	const ACTION_BUTTON_TEST_ID = '.action-btn';
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
		handleChangeSelectedView: jest.fn(),
	};

	beforeEach(() => {
		mockCopyToClipboard = jest.fn();
		mockNotificationsSuccess = jest.fn();
		defaultProps.onClickHandler = jest.fn();
		defaultProps.handleChangeSelectedView = jest.fn();

		// Default mock for useAsyncJSONProcessing
		const mockUseAsyncJSONProcessing = jest.mocked(useAsyncJSONProcessing);
		mockUseAsyncJSONProcessing.mockReturnValue({
			isLoading: false,
			treeData: null,
			error: null,
		});

		// Default mock for useQueryBuilder
		jest.mocked(useQueryBuilder).mockReturnValue({
			stagedQuery: null,
			updateQueriesData: jest.fn((query, type, callback) => {
				const updatedBuilder = {
					...query.builder,
					[type]: query.builder[type].map(callback),
				};
				return {
					...query,
					builder: updatedBuilder,
				};
			}),
		} as any);

		// Default mock for useGetSearchQueryParam
		jest.mocked(useGetSearchQueryParam).mockReturnValue(null);
	});

	it('should render without crashing', () => {
		render(
			<TableViewActions
				fieldData={defaultProps.fieldData}
				record={defaultProps.record}
				isListViewPanel={defaultProps.isListViewPanel}
				isfilterInLoading={defaultProps.isfilterInLoading}
				isfilterOutLoading={defaultProps.isfilterOutLoading}
				onClickHandler={defaultProps.onClickHandler}
				handleChangeSelectedView={defaultProps.handleChangeSelectedView}
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
					handleChangeSelectedView={defaultProps.handleChangeSelectedView}
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
				handleChangeSelectedView={defaultProps.handleChangeSelectedView}
			/>,
		);
		// Verify that action buttons are rendered for non-restricted fields
		expect(container.querySelector(ACTION_BUTTON_TEST_ID)).toBeInTheDocument();
	});

	it('should call handleChangeSelectedView when clicking group by', () => {
		const mockStagedQuery = {
			id: 'test-query-id',
			queryType: 'queryBuilder',
			builder: {
				queryData: [
					{
						queryName: 'A',
						dataSource: 'logs',
						aggregateOperator: 'count',
						functions: [],
						filter: {},
						groupBy: [],
						expression: '',
						disabled: false,
						having: [],
						limit: null,
						stepInterval: null,
						orderBy: [],
						legend: '',
					},
				],
				queryFormulas: [],
				queryTraceOperator: [],
			},
			promql: [],
			clickhouse_sql: [],
		};

		const mockUpdateQueriesData = jest.fn((query, type, callback) => {
			const section = query.builder?.[type];
			if (!Array.isArray(section)) {
				return query;
			}
			return {
				...query,
				builder: {
					...query.builder,
					[type]: section.map(callback),
				},
			};
		});

		jest.mocked(useQueryBuilder).mockReturnValue({
			stagedQuery: mockStagedQuery,
			updateQueriesData: mockUpdateQueriesData,
		} as any);

		jest.mocked(useGetSearchQueryParam).mockReturnValue(null);

		render(
			<TableViewActions
				fieldData={defaultProps.fieldData}
				record={defaultProps.record}
				isListViewPanel={defaultProps.isListViewPanel}
				isfilterInLoading={defaultProps.isfilterInLoading}
				isfilterOutLoading={defaultProps.isfilterOutLoading}
				onClickHandler={defaultProps.onClickHandler}
				handleChangeSelectedView={defaultProps.handleChangeSelectedView}
			/>,
		);

		fireEvent.click(screen.getByText('Group By Attribute'));

		expect(defaultProps.handleChangeSelectedView).toHaveBeenCalledWith(
			ExplorerViews.TIMESERIES,
			expect.objectContaining({
				name: '',
				id: 'test-query-id',
				query: expect.objectContaining({
					builder: expect.objectContaining({
						queryData: expect.arrayContaining([
							expect.objectContaining({
								groupBy: expect.arrayContaining([
									expect.objectContaining({
										key: TEST_FIELD,
										type: '',
									}),
								]),
							}),
						]),
					}),
				}),
			}),
		);
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
				handleChangeSelectedView={defaultProps.handleChangeSelectedView}
			/>,
		);
		// Verify that action buttons are not rendered in list view panel
		expect(
			container.querySelector(ACTION_BUTTON_TEST_ID),
		).not.toBeInTheDocument();
	});

	it('should copy non-JSON body text without quotes when user clicks on body', () => {
		// Setup: body field with surrounding quotes
		const bodyValueWithQuotes =
			'"FeatureFlag \'kafkaQueueProblems\' is enabled, sleeping 1 second"';
		const expectedCopiedText =
			"FeatureFlag 'kafkaQueueProblems' is enabled, sleeping 1 second";

		const bodyProps = {
			fieldData: {
				field: 'body',
				value: bodyValueWithQuotes,
			},
			record: {
				key: 'body-key',
				field: 'body',
				value: bodyValueWithQuotes,
			},
			isListViewPanel: false,
			isfilterInLoading: false,
			isfilterOutLoading: false,
			onClickHandler: jest.fn(),
			handleChangeSelectedView: jest.fn(),
		};

		// Render component with body field
		render(
			<TableViewActions
				fieldData={bodyProps.fieldData}
				record={bodyProps.record}
				isListViewPanel={bodyProps.isListViewPanel}
				isfilterInLoading={bodyProps.isfilterInLoading}
				isfilterOutLoading={bodyProps.isfilterOutLoading}
				onClickHandler={bodyProps.onClickHandler}
				handleChangeSelectedView={bodyProps.handleChangeSelectedView}
			/>,
		);

		// Find the clickable copy area for body
		const copyArea = screen.getByTestId('copy-clipboard-body');

		// Verify it has the correct text to copy (without quotes)
		expect(copyArea).toHaveAttribute('data-text-to-copy', expectedCopiedText);

		// Action: User clicks on body content
		fireEvent.click(copyArea);

		// Assert: Text was copied without surrounding quotes
		expect(mockCopyToClipboard).toHaveBeenCalledWith(expectedCopiedText);

		// Assert: Success notification shown
		expect(mockNotificationsSuccess).toHaveBeenCalledWith({
			message: 'body copied to clipboard',
			key: 'body copied to clipboard',
		});
	});
});
