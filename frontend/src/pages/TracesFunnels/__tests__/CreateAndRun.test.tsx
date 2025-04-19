import {
	act,
	render,
	RenderResult,
	screen,
	waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ROUTES from 'constants/routes';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import TracesFunnelDetails from 'pages/TracesFunnelDetails';
import { QueryClient, QueryClientProvider } from 'react-query';
import { MemoryRouter, Route } from 'react-router-dom';

import TracesFunnels from '..';
import { mockSingleFunnelData } from './mockFunnelsData';

jest.mock('components/OverlayScrollbar/OverlayScrollbar', () => ({
	__esModule: true,
	default: ({ children }: { children: React.ReactNode }): JSX.Element => (
		<div>{children}</div>
	),
}));

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

const successNotification = jest.fn();
const errorNotification = jest.fn();

jest.mock('hooks/useNotifications', () => ({
	__esModule: true,
	useNotifications: jest.fn(() => ({
		notifications: {
			success: successNotification,
			error: errorNotification,
		},
	})),
}));

const mockNavigate = jest.fn();

jest.mock('hooks/useSafeNavigate', () => ({
	useSafeNavigate: (): any => ({
		safeNavigate: mockNavigate,
	}),
}));

const createdFunnelId = `newly-created-funnel-id`;
const newFunnelName = 'My Test Funnel';
const FUNNELS_LIST_URL = 'http://localhost/api/v1/trace-funnels/list';
const CREATE_FUNNEL_URL = 'http://localhost/api/v1/trace-funnels/new-funnel';

// eslint-disable-next-line sonarjs/no-duplicate-string
jest.mock('react-router-dom', () => ({
	...jest.requireActual('react-router-dom'),
	useLocation: jest.fn().mockReturnValue({
		pathname: `${ROUTES.LOGS_EXPLORER}`,
	}),
	useParams: jest.fn(() => ({
		funnelId: createdFunnelId,
	})),
}));

jest.mock('react-redux', () => ({
	...jest.requireActual('react-redux'),
	useSelector: (): any => ({
		selectedTime: '1h',
		loading: false,
	}),
}));

jest.mock(
	'container/TopNav/DateTimeSelectionV2/index.tsx',
	() =>
		function MockDateTimeSelection(): JSX.Element {
			return <div>MockDateTimeSelection</div>;
		},
);

jest.mock(
	'container/QueryBuilder/filters/QueryBuilderSearchV2/QueryBuilderSearchV2',
	() =>
		function MockQueryBuilderSearchV2(): JSX.Element {
			return <div>MockQueryBuilderSearchV2</div>;
		},
);

jest.mock('hooks/TracesFunnels/useFunnels', () => {
	const actualHooks = jest.requireActual('hooks/TracesFunnels/useFunnels');

	return {
		__esModule: true,
		// Keep all original hooks
		...actualHooks,
		useValidateFunnelSteps: jest.fn(() => ({
			data: { payload: { data: [] } },
			isLoading: false,
			isFetching: false,
		})),
	};
});
jest.mock('pages/TracesFunnels/FunnelContext', () => {
	const actualHooks = jest.requireActual('pages/TracesFunnels/FunnelContext');

	return {
		__esModule: true,
		// Keep all original hooks
		...actualHooks,
	};
});

describe('Funnel Creation Flow', () => {
	const user = userEvent.setup();
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});

	const renderWithRouterAndProviders = (
		initialEntries: string[] = [ROUTES.TRACES_FUNNELS],
	): RenderResult =>
		render(
			<QueryClientProvider client={queryClient}>
				<MemoryRouter initialEntries={initialEntries}>
					<Route path={ROUTES.TRACES_FUNNELS} exact>
						<TracesFunnels />
					</Route>
					<Route path={ROUTES.TRACES_FUNNELS_DETAIL}>
						<TracesFunnelDetails />
					</Route>
				</MemoryRouter>
			</QueryClientProvider>,
		);

	beforeEach(() => {
		jest.clearAllMocks();
		// Update this line to use the mocked function directly
		(jest.requireMock('react-router-dom').useParams as jest.Mock).mockReturnValue(
			{
				funnelId: createdFunnelId,
			},
		);
	});

	describe('Navigating to Funnel Creation Modal', () => {
		it('should display the "New Funnel" button on the list page', async () => {
			server.use(
				rest.get(FUNNELS_LIST_URL, (_, res, ctx) =>
					res(ctx.status(200), ctx.json({ payload: [] })),
				),
			);
			await act(() => renderWithRouterAndProviders());
			await screen.findByText(/no funnels yet/i);
			expect(screen.getAllByText(/new funnel/i).length).toBe(2);
		});

		it('should open the "Create New Funnel" modal when clicking the "New Funnel" button', async () => {
			server.use(
				rest.get(FUNNELS_LIST_URL, (_, res, ctx) =>
					res(ctx.status(200), ctx.json({ payload: [] })),
				),
			);
			await act(() => renderWithRouterAndProviders());
			await screen.findByText(/no funnels yet/i);
			await user.click(screen.getAllByText(/new funnel/i)[1]);
			const modal = await screen.findByRole('dialog', {
				name: /create new funnel/i,
			});
			expect(modal).toBeInTheDocument();
		});
	});

	describe('Creating a New Funnel', () => {
		it('should create a new funnel and navigate to its details page on successful creation', async () => {
			// Mock the "create funnel" API call to succeed
			server.use(
				rest.post(CREATE_FUNNEL_URL, async (_, res, ctx) =>
					res(ctx.status(200), ctx.json({ funnel_id: createdFunnelId })),
				),
				// Mock the GET list handler to return the newly created funnel (optional for this test)
				rest.get(FUNNELS_LIST_URL, (_, res, ctx) =>
					res(
						ctx.status(200),
						ctx.json({
							payload: [{ id: createdFunnelId, funnel_name: newFunnelName }],
						}),
					),
				),
			);

			await act(() => renderWithRouterAndProviders());
			await screen.findByText(/no funnels yet/i);
			await user.click(screen.getAllByText(/new funnel/i)[1]);

			await screen.findByRole('dialog', {
				name: /create new funnel/i,
			});
			const nameInput = screen.getByPlaceholderText(
				/eg\. checkout dropoff funnel/i,
			);
			await user.type(nameInput, newFunnelName);

			const createButton = screen.getByRole('button', { name: /create funnel/i });
			await user.click(createButton);

			await waitFor(() => {
				expect(successNotification).toHaveBeenCalledWith(
					expect.objectContaining({ message: 'Funnel created successfully' }),
				);
			});

			await waitFor(() => {
				const expectedPath = ROUTES.TRACES_FUNNELS_DETAIL.replace(
					':funnelId',
					createdFunnelId,
				);
				expect(mockNavigate).toHaveBeenCalledWith(expectedPath);
			});
		});

		it('should display an error notification if funnel creation fails', async () => {
			server.use(
				rest.post(CREATE_FUNNEL_URL, async (_, res, ctx) =>
					res(ctx.status(500), ctx.json({ message: 'Failed to create funnel' })),
				),
				rest.get(FUNNELS_LIST_URL, (_, res, ctx) =>
					res(ctx.status(200), ctx.json({ payload: [] })),
				),
			);

			await act(() => renderWithRouterAndProviders());
			await screen.findByText(/no funnels yet/i);
			await user.click(screen.getAllByText(/new funnel/i)[1]);

			const nameInput = screen.getByPlaceholderText(
				/eg\. checkout dropoff funnel/i,
			);
			await user.type(nameInput, newFunnelName);

			const createButton = screen.getByRole('button', { name: /create funnel/i });
			await user.click(createButton);

			await waitFor(() => {
				expect(errorNotification).toHaveBeenCalledWith({
					message: { message: 'Failed to create funnel' },
				});
			});

			// Ensure navigation did not occur
			expect(mockNavigate).not.toHaveBeenCalled();
		});
	});

	describe('Viewing Funnel Details', () => {
		beforeEach(async () => {
			await act(() =>
				renderWithRouterAndProviders([
					ROUTES.TRACES_FUNNELS_DETAIL.replace(':funnelId', mockSingleFunnelData.id),
				]),
			);
		});
		it('should render the Funnel Details page and display the funnel name', async () => {
			(jest.requireMock('react-router-dom')
				.useParams as jest.Mock).mockReturnValue({
				funnelId: mockSingleFunnelData.id,
			});

			server.use(
				rest.get(
					`http://localhost/api/v1/trace-funnels/${mockSingleFunnelData.id}`,
					(_, res, ctx) => res(ctx.status(200), ctx.json(mockSingleFunnelData)),
				),
			);

			await waitFor(() => {
				expect(screen.getByText(/all funnels/i)).toBeInTheDocument();
			});
			await screen.findByText(mockSingleFunnelData.funnel_name);
		});
		it('displays the total number of steps in the funnel configuration', async () => {
			server.use(
				rest.post(
					`http://localhost/api/v1/trace-funnels/${mockSingleFunnelData.id}/analytics/validate`,
					(_, res, ctx) => res(ctx.status(200), ctx.json({ steps: [] })),
				),
			);

			await waitFor(() => {
				expect(
					screen.getByText(`${mockSingleFunnelData.steps?.length} steps`),
				).toBeInTheDocument();

				expect(screen.getByText('No spans selected yet.')).toBeInTheDocument();
			});

			const { container } = renderWithRouterAndProviders([
				ROUTES.TRACES_FUNNELS_DETAIL.replace(':funnelId', mockSingleFunnelData.id),
			]);

			expect(container).toMatchSnapshot();
		});
		it('shows empty state UI when no services or spans are selected', () => {});
		it('shows missing services / spans UI when there are missing services / spans', () => {});
		it('shows empty state when no matching traces found between funnel steps', () => {});
		it('shows trace count and results when valid traces exist', () => {});
	});
});
