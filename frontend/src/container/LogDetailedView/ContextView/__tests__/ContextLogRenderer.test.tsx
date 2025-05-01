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
import { QueryBuilderContext } from 'providers/QueryBuilder';
import MockQueryClientProvider from 'providers/test/MockQueryClientProvider';
import TimezoneProvider from 'providers/Timezone';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { VirtuosoMockContext } from 'react-virtuoso';
import store from 'store';

import ContextLogRenderer from '../ContextLogRenderer';
import {
	mockLog,
	mockQuery,
	mockQueryRangeResponse,
	mockTagFilter,
} from './mockData';

// Mock the useContextLogData hook
const mockHandleRunQuery = jest.fn();

jest.mock('uplot', () => {
	const paths = {
		spline: jest.fn(),
		bars: jest.fn(),
	};
	const uplotMock = jest.fn(() => ({
		paths,
	}));
	return {
		paths,
		default: uplotMock,
	};
});

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
				</Provider>
			</TimezoneProvider>
		</MemoryRouter>,
	);
};

describe('ContextLogRenderer', () => {
	beforeEach(() => {
		server.use(
			rest.get(`${ENVIRONMENT.baseURL}/api/v1/logs`, (req, res, ctx) =>
				res(ctx.status(200), ctx.json({ logs: [mockLog] })),
			),
		);
		server.use(
			rest.post(`${ENVIRONMENT.baseURL}/api/v3/query_range`, (req, res, ctx) =>
				res(ctx.status(200), ctx.json(mockQueryRangeResponse)),
			),
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
		await act(async () => {
			await userEvent.click(loadMoreButtons[1]);
		});

		await waitFor(() => {
			expect(screen.getAllByText(/Failed to authenticate/)).toHaveLength(3);
		});
	});
});
