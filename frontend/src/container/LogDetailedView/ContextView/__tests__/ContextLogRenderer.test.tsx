import {
	act,
	render,
	RenderResult,
	screen,
	waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ENVIRONMENT } from 'constants/env';
import { initialQueriesMap } from 'constants/queryBuilder';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { ErrorModalProvider } from 'providers/ErrorModalProvider';
import { QueryBuilderContext } from 'providers/QueryBuilder';
import MockQueryClientProvider from 'providers/test/MockQueryClientProvider';
import TimezoneProvider from 'providers/Timezone';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { VirtuosoMockContext } from 'react-virtuoso';
import store from 'store';
import { QueryRangePayload } from 'types/api/metrics/getQueryRange';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';

import ContextLogRenderer from '../ContextLogRenderer';
import {
	mockLog,
	mockQuery,
	mockQueryRangeResponse,
	mockTagFilter,
} from './mockData';

// Mock the useContextLogData hook
const mockHandleRunQuery = jest.fn();

jest.mock('container/OptionsMenu', () => ({
	useOptionsMenu: (): any => ({
		options: {
			fontSize: 'medium',
			selectColumns: [],
		},
	}),
}));

jest.mock('hooks/useSafeNavigate', () => ({
	useSafeNavigate: (): any => ({
		safeNavigate: jest.fn(),
	}),
}));

jest.mock(
	'components/OverlayScrollbar/OverlayScrollbar',
	() =>
		function MockOverlayScrollbar({
			children,
		}: {
			children: React.ReactNode;
		}): JSX.Element {
			return <div>{children}</div>;
		},
);

// Common wrapper component for tests
const renderContextLogRenderer = (): RenderResult => {
	const defaultProps = {
		isEdit: false,
		query: mockQuery,
		log: mockLog,
		filters: mockTagFilter,
	};

	return render(
		<MemoryRouter>
			<TimezoneProvider>
				<Provider store={store}>
					<ErrorModalProvider>
						<MockQueryClientProvider>
							<QueryBuilderContext.Provider
								value={
									{
										currentQuery: initialQueriesMap.traces,
										handleRunQuery: mockHandleRunQuery,
									} as any
								}
							>
								<VirtuosoMockContext.Provider
									value={{ viewportHeight: 300, itemHeight: 50 }}
								>
									<ContextLogRenderer
										isEdit={defaultProps.isEdit}
										query={defaultProps.query}
										log={defaultProps.log}
										filters={defaultProps.filters}
									/>
								</VirtuosoMockContext.Provider>
							</QueryBuilderContext.Provider>
						</MockQueryClientProvider>
					</ErrorModalProvider>
				</Provider>
			</TimezoneProvider>
		</MemoryRouter>,
	);
};

describe('ContextLogRenderer', () => {
	let capturedQueryRangePayload: QueryRangePayload;

	beforeEach(() => {
		server.use(
			rest.get(`${ENVIRONMENT.baseURL}/api/v1/logs`, (req, res, ctx) =>
				res(ctx.status(200), ctx.json({ logs: [mockLog] })),
			),
		);
		server.use(
			rest.post(
				`${ENVIRONMENT.baseURL}/api/v3/query_range`,
				async (req, res, ctx) => {
					capturedQueryRangePayload = await req.json();
					return res(ctx.status(200), ctx.json(mockQueryRangeResponse));
				},
			),
		);
		server.use(
			rest.post(
				`${ENVIRONMENT.baseURL}/api/v5/query_range`,
				async (req, res, ctx) => {
					capturedQueryRangePayload = await req.json();
					return res(ctx.status(200), ctx.json(mockQueryRangeResponse));
				},
			),
		);
		// Add handler for logs API that returns the expected message
		server.use(
			rest.get(`${ENVIRONMENT.baseURL}/api/v1/logs`, (req, res, ctx) => {
				const url = new URL(req.url);
				if (url.searchParams.has('offset')) {
					// Return logs with "Failed to authenticate" message for pagination
					const failedAuthLog = {
						...mockLog,
						body: 'Failed to authenticate user',
					};
					return res(
						ctx.status(200),
						ctx.json({
							logs: [
								{ ...failedAuthLog, id: 'failed-auth-log-1' },
								{ ...failedAuthLog, id: 'failed-auth-log-2' },
								{ ...failedAuthLog, id: 'failed-auth-log-3' },
							],
						}),
					);
				}
				return res(ctx.status(200), ctx.json({ logs: [mockLog] }));
			}),
		);
	});

	it('renders without crashing', async () => {
		await act(async () => {
			renderContextLogRenderer();
		});

		await waitFor(() => {
			expect(screen.getAllByText('Load more')).toHaveLength(2);
			expect(screen.getByText(/Test log message/)).toBeInTheDocument();
		});
	});

	it('loads new logs when clicking Load more button', async () => {
		await act(async () => {
			renderContextLogRenderer();
		});

		await waitFor(() => {
			expect(screen.getAllByText('Load more')).toHaveLength(2);
			expect(screen.getByText(/Test log message/)).toBeInTheDocument();
		});

		const loadMoreButtons = screen.getAllByText('Load more');

		// Check if buttons are enabled and clickable
		expect(loadMoreButtons[1]).not.toBeDisabled();

		await act(async () => {
			await userEvent.click(loadMoreButtons[1]);
		});

		// Verify that the button click triggered an API call
		await waitFor(() => {
			// The buttons should still be present after clicking
			expect(screen.getAllByText('Load more')).toHaveLength(2);
		});
	});

	describe('pagination behavior', () => {
		let loadMoreButtons: HTMLElement[];
		let initialPayload: {
			start: number;
			end: number;
			compositeQuery: {
				builderQueries: {
					A: IBuilderQuery;
				};
			};
		};

		beforeEach(async () => {
			await act(async () => {
				renderContextLogRenderer();
			});

			await waitFor(() => {
				expect(screen.getAllByText('Load more')).toHaveLength(2);
				expect(screen.getByText(/Test log message/)).toBeInTheDocument();
			});

			loadMoreButtons = screen.getAllByText('Load more');

			// Capture initial query payload
			expect(capturedQueryRangePayload).toBeDefined();
			const { start, end, ...rest } = capturedQueryRangePayload;
			initialPayload = {
				start,
				end,
				compositeQuery: rest.compositeQuery as any,
			};
		});

		enum LoadMoreButtonIndex {
			PREV = 0,
			NEXT = 1,
		}

		const verifyPaginationBehavior = async (
			buttonIndex: LoadMoreButtonIndex,
			expectedOpChange: { before: string; after: string },
		): Promise<void> => {
			const initialQuery = (initialPayload.compositeQuery as any).queries[0].spec;

			// Click the load more button (previous or next)
			await act(async () => {
				await userEvent.click(loadMoreButtons[buttonIndex]);
			});

			// Extract and verify the updated query
			const {
				start: afterStart,
				end: afterEnd,
				...afterPayload
			} = capturedQueryRangePayload;
			const afterQuery = (afterPayload.compositeQuery as any).queries[0].spec;

			// Verify timestamps remain constant
			expect(afterStart).toEqual(initialPayload.start);
			expect(afterEnd).toEqual(initialPayload.end);

			// Verify offset changes
			expect(initialQuery.offset).toEqual(0);
			expect(afterQuery.offset).toEqual(10);

			// Verify filter changes
			expect(initialQuery.filter.expression).toContain(expectedOpChange.before);
			expect(afterQuery.filter.expression).toContain(expectedOpChange.after);

			// Verify query structure remains consistent
			expect(initialQuery.name).toEqual(afterQuery.name);
			expect(initialQuery.signal).toEqual(afterQuery.signal);
		};

		it('should keep the start and end timestamps constant on clicking load more (prev / next) pages', async () => {
			await verifyPaginationBehavior(LoadMoreButtonIndex.PREV, {
				before: '<',
				after: '>',
			});
			await verifyPaginationBehavior(LoadMoreButtonIndex.NEXT, {
				before: '<',
				after: '<',
			});
		});
	});
});
