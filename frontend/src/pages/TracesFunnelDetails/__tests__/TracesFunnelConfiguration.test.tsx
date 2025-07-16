import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ROUTES from 'constants/routes';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { QueryClient, QueryClientProvider } from 'react-query';
import { MemoryRouter, Route } from 'react-router-dom';

import TracesFunnelDetails from '../TracesFunnelDetails';

// Mock external dependencies
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

jest.mock('components/OverlayScrollbar/OverlayScrollbar', () => ({
	__esModule: true,
	default: ({ children }: { children: React.ReactNode }): JSX.Element => (
		<div>{children}</div>
	),
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

jest.mock(
	'components/CeleryOverview/CeleryOverviewConfigOptions/CeleryOverviewConfigOptions',
	() => ({
		FilterSelect: ({
			placeholder,
			onChange,
			values,
		}: {
			placeholder: string;
			onChange: (value: string) => void;
			values: string;
		}): JSX.Element => (
			<input
				placeholder={placeholder}
				value={values || ''}
				onChange={(e): void => onChange?.(e.target.value)}
				data-testid={`filter-select-${placeholder}`}
			/>
		),
	}),
);

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

jest.mock('react-redux', () => ({
	...jest.requireActual('react-redux'),
	useSelector: (): { selectedTime: string; loading: boolean } => ({
		selectedTime: '1h',
		loading: false,
	}),
}));

const REACT_ROUTER_DOM = 'react-router-dom';

const mockUseParams = jest.fn();

jest.mock(REACT_ROUTER_DOM, () => ({
	...jest.requireActual(REACT_ROUTER_DOM),
	useParams: mockUseParams,
	useLocation: jest.fn().mockReturnValue({
		pathname: '/traces/funnels/test-funnel-id',
	}),
}));

// Mock data
const mockFunnelId = 'test-funnel-id';
const MOCK_FUNNEL_NAME = 'Test Funnel';
const mockFunnelData = {
	funnel_id: mockFunnelId,
	funnel_name: MOCK_FUNNEL_NAME,
	user_email: 'test@example.com',
	created_at: Date.now() - 86400000,
	updated_at: Date.now(),
	description: 'Test funnel description',
	steps: [
		{
			id: 'step-1',
			step_order: 1,
			service_name: 'auth-service',
			span_name: 'user-login',
			filters: { items: [], op: 'AND' },
			latency_pointer: 'start',
			latency_type: 'p99',
			has_errors: false,
			name: 'Login Step',
			description: 'User login step',
		},
		{
			id: 'step-2',
			step_order: 2,
			service_name: 'payment-service',
			span_name: 'process-payment',
			filters: { items: [], op: 'AND' },
			latency_pointer: 'start',
			latency_type: 'p99',
			has_errors: false,
			name: 'Payment Step',
			description: 'Payment processing step',
		},
	],
};

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			retry: false,
			staleTime: 0,
			cacheTime: 0,
		},
		mutations: {
			retry: false,
		},
	},
});

// Test render helper
const renderTracesFunnelDetails = (): ReturnType<typeof render> =>
	render(
		<QueryClientProvider client={queryClient}>
			<MemoryRouter initialEntries={[`/traces/funnels/${mockFunnelId}`]}>
				<Route path={ROUTES.TRACES_FUNNELS_DETAIL}>
					<TracesFunnelDetails />
				</Route>
			</MemoryRouter>
		</QueryClientProvider>,
	);

// Shared setup helper
const setupTest = async (): Promise<void> => {
	await act(async () => {
		renderTracesFunnelDetails();
	});

	// Wait for page to load
	await waitFor(() => {
		expect(screen.getAllByText(MOCK_FUNNEL_NAME)).toHaveLength(2);
	});
};

describe('TracesFunnelDetails', () => {
	const user = userEvent.setup();

	beforeEach(() => {
		jest.clearAllMocks();
		jest.spyOn(console, 'error').mockImplementation(() => {});

		// Mock console.error to track error logs
		jest.spyOn(console, 'error').mockImplementation(() => {});

		// Mock useParams to return the funnel ID
		mockUseParams.mockReturnValue({
			funnelId: mockFunnelId,
		});

		// Setup comprehensive API mocks
		server.use(
			// Mock funnel details fetch
			rest.get(
				`http://localhost/api/v1/trace-funnels/${mockFunnelId}`,
				(_, res, ctx) => res(ctx.status(200), ctx.json({ data: mockFunnelData })),
			),
			// Mock all analytics endpoints to avoid errors
			rest.post(
				'http://localhost/api/v1/trace-funnels/analytics/validate',
				(_, res, ctx) => res(ctx.status(200), ctx.json({ data: [{ count: 150 }] })),
			),
			rest.post(
				'http://localhost/api/v1/trace-funnels/analytics/overview',
				(_, res, ctx) => res(ctx.status(200), ctx.json({ data: [] })),
			),
			rest.post(
				'http://localhost/api/v1/trace-funnels/analytics/steps',
				(_, res, ctx) => res(ctx.status(200), ctx.json({ data: [] })),
			),
			rest.post(
				'http://localhost/api/v1/trace-funnels/analytics/steps/overview',
				(_, res, ctx) => res(ctx.status(200), ctx.json({ data: [] })),
			),
			rest.post(
				'http://localhost/api/v1/trace-funnels/analytics/slow-traces',
				(_, res, ctx) => res(ctx.status(200), ctx.json({ data: [] })),
			),
			rest.post(
				'http://localhost/api/v1/trace-funnels/analytics/error-traces',
				(_, res, ctx) => res(ctx.status(200), ctx.json({ data: [] })),
			),
		);
	});

	afterEach(() => {
		jest.restoreAllMocks();
		queryClient.clear();

		// Restore console.error
		(console.error as jest.Mock).mockRestore?.();
	});

	describe('Basic Page Loading', () => {
		it('should load and display funnel information', async () => {
			await setupTest();

			// Check that the page loads with basic funnel info (appears in breadcrumb + title)
			await waitFor(() => {
				expect(screen.getAllByText(MOCK_FUNNEL_NAME)).toHaveLength(2);
			});

			// Check breadcrumb navigation
			expect(screen.getByText('All funnels')).toBeInTheDocument();

			// Check funnel steps section header
			expect(screen.getByText('FUNNEL STEPS')).toBeInTheDocument();
		});

		it('should show loading spinner initially', async () => {
			// Mock slow API response
			server.use(
				rest.get(
					`http://localhost/api/v1/trace-funnels/${mockFunnelId}`,
					(_, res, ctx) =>
						res(ctx.delay(100), ctx.status(200), ctx.json({ data: mockFunnelData })),
				),
			);

			await setupTest();

			// Should show Ant Design loading spinner
			expect(screen.getByRole('img', { name: /loading/i })).toBeInTheDocument();

			// Wait for data to load
			await waitFor(() => {
				expect(screen.getAllByText(MOCK_FUNNEL_NAME)).toHaveLength(2);
			});
		});

		it('should handle API errors (currently shows loading spinner due to component logic)', async () => {
			// Mock API error with proper HTTP error status
			server.use(
				rest.get(
					`http://localhost/api/v1/trace-funnels/${mockFunnelId}`,
					(_, res, ctx) =>
						res(ctx.status(404), ctx.json({ message: 'Funnel not found' })),
				),
			);

			await act(async () => {
				renderTracesFunnelDetails();
			});

			await waitFor(() => {
				expect(
					screen.getByText('Error loading funnel details'),
				).toBeInTheDocument();
			});

			// Verify that the API error was actually triggered
			expect(console.error).toHaveBeenCalled();
		});
	});

	describe('Step Configuration Display', () => {
		beforeEach(async () => {
			await setupTest();
		});

		it('should display funnel steps with their names', async () => {
			// Check step names are displayed
			expect(screen.getByText('Login Step')).toBeInTheDocument();
			expect(screen.getByText('Payment Step')).toBeInTheDocument();
		});

		it('should show step configuration interface', async () => {
			// Check that service and span selectors are present by placeholder text
			expect(screen.getAllByPlaceholderText('Select Service')).toHaveLength(2);
			expect(screen.getAllByPlaceholderText('Select Span name')).toHaveLength(2);
		});

		it('should display add step button when under step limit', async () => {
			// Find "Add Funnel Step" button (only shown if less than 3 steps)
			const addStepButton = screen.getByRole('button', {
				name: /add funnel step/i,
			});
			expect(addStepButton).toBeInTheDocument();
		});

		it('should show step actions via ellipsis menu', async () => {
			// Find ellipsis icons for step actions (they are SVG elements with specific class)
			const ellipsisElements = document.querySelectorAll(
				'.funnel-item__action-icon',
			);
			expect(ellipsisElements.length).toBeGreaterThan(0);

			// Click on ellipsis to open popover
			await user.click(ellipsisElements[0] as Element);

			// Check that step action options appear
			await waitFor(() => {
				expect(screen.getByText('Delete')).toBeInTheDocument();
			});
		});
	});

	describe('Footer and Save Functionality', () => {
		beforeEach(async () => {
			await setupTest();
		});

		it('should display step count in footer', async () => {
			// Check step count display
			expect(screen.getByText('2 steps')).toBeInTheDocument();
		});

		it('should show save button in footer', async () => {
			// Find save button
			const saveButton = screen.getByRole('button', { name: /save funnel/i });
			expect(saveButton).toBeInTheDocument();
		});

		it('should display footer validation section', async () => {
			// Check that the footer exists with validation status
			const footer = screen.getByTestId('steps-footer');
			expect(footer).toBeInTheDocument();
		});
	});

	describe('Navigation Flow', () => {
		beforeEach(async () => {
			await setupTest();
		});

		it('should display correct breadcrumb navigation', async () => {
			// Check breadcrumb links
			const allFunnelsLink = screen.getByRole('link', { name: /all funnels/i });
			expect(allFunnelsLink).toHaveAttribute('href', '/traces/funnels');

			// Check current funnel name in breadcrumb
			expect(screen.getAllByText(MOCK_FUNNEL_NAME)).toHaveLength(2);
		});
	});

	describe('Error Handling', () => {
		it('should handle API validation errors gracefully', async () => {
			// Mock validation API error
			server.use(
				rest.post(
					'http://localhost/api/v1/trace-funnels/analytics/validate',
					(_, res, ctx) =>
						res(ctx.status(500), ctx.json({ message: 'Validation failed' })),
				),
			);

			await setupTest();

			// Should still load the main funnel configuration
			await waitFor(() => {
				expect(screen.getAllByText(MOCK_FUNNEL_NAME)).toHaveLength(2);
			});

			// Configuration section should still work
			expect(screen.getByText('FUNNEL STEPS')).toBeInTheDocument();
		});
	});
});
