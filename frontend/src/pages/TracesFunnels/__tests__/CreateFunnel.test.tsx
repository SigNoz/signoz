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
import { AppProvider } from 'providers/App/App';
import { QueryClient, QueryClientProvider } from 'react-query';
import { MemoryRouter, Route } from 'react-router-dom';

import TracesFunnels from '..';

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

jest.mock('providers/App/utils', () => ({
	getUserDefaults: jest.fn(() => ({
		accessJwt: 'mock-access-token',
		refreshJwt: 'mock-refresh-token',
		id: 'mock-user-id',
		email: 'editor@example.com',
		displayName: 'Test Editor',
		createdAt: Date.now(),
		organization: 'Test Organization',
		orgId: 'mock-org-id',
		role: 'EDITOR',
	})),
}));

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
	useSafeNavigate: (): { safeNavigate: jest.Mock } => ({
		safeNavigate: mockNavigate,
	}),
}));

const createdFunnelId = `newly-created-funnel-id`;
const newFunnelName = 'My Test Funnel';
export const FUNNELS_LIST_URL = 'http://localhost/api/v1/trace-funnels/list';
const CREATE_FUNNEL_URL = 'http://localhost/api/v1/trace-funnels/new';

// Helper function to encapsulate opening the create funnel modal
const openCreateFunnelModal = async (
	user: ReturnType<typeof userEvent.setup>,
): Promise<void> => {
	await screen.findByText(/no funnels yet/i);
	await user.click(screen.getAllByText(/new funnel/i)[1]);
	await screen.findByRole('dialog', { name: /create new funnel/i });
};

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
	useSelector: (): { selectedTime: string; loading: boolean } => ({
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

const queryClient = new QueryClient({
	defaultOptions: { queries: { retry: false } },
});

export const renderTraceFunnelRoutes = (
	initialEntries: string[] = [ROUTES.TRACES_FUNNELS],
): RenderResult =>
	render(
		<QueryClientProvider client={queryClient}>
			<AppProvider>
				<MemoryRouter initialEntries={initialEntries}>
					<Route path={ROUTES.TRACES_FUNNELS} exact>
						<TracesFunnels />
					</Route>
					<Route path={ROUTES.TRACES_FUNNELS_DETAIL}>
						<TracesFunnelDetails />
					</Route>
				</MemoryRouter>
			</AppProvider>
		</QueryClientProvider>,
	);

const renderFunnelRoutesWithAct = async (
	initialEntries: string[] = [ROUTES.TRACES_FUNNELS],
): Promise<void> => {
	await act(async () => {
		renderTraceFunnelRoutes(initialEntries);
	});
};
describe('Funnel Creation Flow', () => {
	const user = userEvent.setup();

	beforeEach(() => {
		jest.clearAllMocks();

		(jest.requireMock('react-router-dom').useParams as jest.Mock).mockReturnValue(
			{},
		);
	});

	afterEach(() => {
		jest.restoreAllMocks();
		queryClient.clear(); // Clear react-query cache between tests
	});

	describe('Navigating to Funnel Creation Modal', () => {
		// Setup: Mock empty list and render the list page
		beforeEach(async () => {
			server.use(
				rest.get(FUNNELS_LIST_URL, (_, res, ctx) =>
					res(ctx.status(200), ctx.json({ payload: [] })),
				),
			);
			await renderFunnelRoutesWithAct();
			await screen.findByText(/no funnels yet/i);
		});

		it('should render the "New Funnel" button when the funnel list is empty', async () => {
			expect(screen.getAllByText(/new funnel/i).length).toBe(2);
		});

		it('should open the "Create New Funnel" modal when the "New Funnel" button is clicked', async () => {
			await user.click(screen.getAllByText(/new funnel/i)[1]);
			await screen.findByRole('dialog', {
				name: /create new funnel/i,
			});
		});
	});

	describe('Creating a New Funnel', () => {
		// Setup: Render list page with mocked empty list
		beforeEach(async () => {
			server.use(
				rest.get(FUNNELS_LIST_URL, (_, res, ctx) =>
					res(ctx.status(200), ctx.json({ payload: [] })),
				),
			);
			await renderFunnelRoutesWithAct();
		});

		it('should create a new funnel and navigate to its details page upon successful API response', async () => {
			// Mock specific API calls for successful creation
			server.use(
				rest.post(CREATE_FUNNEL_URL, async (_, res, ctx) =>
					res(ctx.status(200), ctx.json({ data: { funnel_id: createdFunnelId } })),
				),
			);

			// Mock useParams for the target details page
			(jest.requireMock('react-router-dom')
				.useParams as jest.Mock).mockReturnValue({
				funnelId: createdFunnelId,
			});

			await openCreateFunnelModal(user);

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

		it('should display an error notification if the funnel creation API call fails', async () => {
			// Temporarily suppress console.error for expected error log
			const consoleErrorSpy = jest
				.spyOn(console, 'error')
				.mockImplementation(() => {});

			// Mock specific API calls for creation failure
			server.use(
				rest.post(CREATE_FUNNEL_URL, async (_, res, ctx) =>
					res(ctx.status(500), ctx.json({ message: 'Failed to create funnel' })),
				),
			);

			await openCreateFunnelModal(user);

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

			consoleErrorSpy.mockRestore();
		});
	});
});
