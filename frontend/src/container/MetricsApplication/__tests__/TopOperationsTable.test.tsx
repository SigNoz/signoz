import type { Mock, MockedFunction } from 'vitest';
import { QueryClientProvider } from 'react-query';
// eslint-disable-next-line no-restricted-imports
import { Provider } from 'react-redux';
import {
	act,
	fireEvent,
	render,
	screen,
	waitFor,
} from '@testing-library/react';
import useResourceAttribute from 'hooks/useResourceAttribute';
import { rest, server } from 'mocks-server/server';

import {
	createMockStore,
	defaultApiCallExpectation,
	mockEntryPointData,
	mockTopOperationsData,
	queryClient,
} from '../__mocks__/getTopOperation';
import TopOperation from '../Tabs/Overview/TopOperation';

// Mock dependencies
vi.mock('hooks/useResourceAttribute');
vi.mock('hooks/useResourceAttribute/utils', async () => ({
	...(await vi.importActual('hooks/useResourceAttribute/utils')),
	convertRawQueriesToTraceSelectedTags: (): any[] => [],
}));

vi.mock('hooks/useSafeNavigate', () => ({
	useSafeNavigate: (): { safeNavigate: Mock } => ({
		safeNavigate: vi.fn(),
	}),
}));

vi.mock('react-router-dom', async () => ({
	...(await vi.importActual('react-router-dom')),
	useParams: (): { servicename: string } => ({
		servicename: encodeURIComponent('test-service'),
	}),
}));

// Mock the util functions that TopOperationsTable uses
vi.mock('../Tabs/util', () => ({
	useGetAPMToTracesQueries: (): any => ({
		builder: {
			queryData: [
				{
					filters: {
						items: [],
					},
				},
			],
		},
	}),
}));

// Mock the resourceAttributesToTracesFilterItems function
vi.mock('container/TraceDetail/utils', () => ({
	resourceAttributesToTracesFilterItems: (): any[] => [],
}));

const mockedUseResourceAttribute = useResourceAttribute as MockedFunction<
	typeof useResourceAttribute
>;

// Constants
const KEY_OPERATIONS_TEXT = 'Key Operations';
const KEY_ENTRY_POINT_OPERATIONS_TEXT = 'Key Entrypoint Operations';
const ENTRY_POINT_SPANS_TEXT = 'Entrypoint Spans';
const TOP_OPERATIONS_ENDPOINT = 'top_operations';
const ENTRY_POINT_OPERATIONS_ENDPOINT = 'entry_point_operations';

const renderComponent = (store = createMockStore()): any =>
	render(
		<Provider store={store}>
			<QueryClientProvider client={queryClient}>
				<TopOperation />
			</QueryClientProvider>
		</Provider>,
	);

// Helper function to wait for initial render and verify basic functionality
const waitForInitialRender = async (): Promise<void> => {
	await waitFor(() => {
		expect(screen.getByText(KEY_OPERATIONS_TEXT)).toBeInTheDocument();
	});

	// Wait for the top-operations response to render. The title above is static
	// and settles before the request resolves; ending the test on the title
	// alone leaves the request in flight and its msw resolver can run inside the
	// next test, inflating that test's apiCalls.
	await screen.findByText('GET /api/users');
};

// Helper function to click toggle and wait for data to load
const clickToggleAndWaitForDataLoad = async (): Promise<HTMLElement> => {
	const toggleSwitch = screen.getByRole('switch');

	act(() => {
		fireEvent.click(toggleSwitch);
	});

	await waitFor(() => {
		expect(screen.getByText(KEY_ENTRY_POINT_OPERATIONS_TEXT)).toBeInTheDocument();
	});

	// Same settlement guarantee as above, for the entry-point request.
	await screen.findByText('GET /api/health');

	return toggleSwitch;
};

describe('TopOperation API Integration', () => {
	let apiCalls: { endpoint: string; body: any }[] = [];

	beforeEach(() => {
		vi.clearAllMocks();
		queryClient.clear();
		apiCalls = [];

		mockedUseResourceAttribute.mockReturnValue({
			queries: [],
		} as any);

		server.use(
			rest.post(
				'http://localhost/api/v2/service/top_operations',
				async (req, res, ctx) => {
					const body = await req.json();
					apiCalls.push({ endpoint: TOP_OPERATIONS_ENDPOINT, body });
					return res(
						ctx.status(200),
						ctx.json({ status: 'success', data: mockTopOperationsData }),
					);
				},
			),
			rest.post(
				'http://localhost/api/v2/service/entry_point_operations',
				async (req, res, ctx) => {
					const body = await req.json();
					apiCalls.push({ endpoint: ENTRY_POINT_OPERATIONS_ENDPOINT, body });
					return res(
						ctx.status(200),
						ctx.json({ status: 'success', data: mockEntryPointData }),
					);
				},
			),
		);
	});

	it('renders with default key operations on initial load', async () => {
		renderComponent();

		await waitForInitialRender();

		// Verify the toggle is present and unchecked
		const toggleSwitch = screen.getByRole('switch');
		expect(toggleSwitch).not.toBeChecked();
		expect(screen.getByText(ENTRY_POINT_SPANS_TEXT)).toBeInTheDocument();
	});

	it('calls top_operations API on initial render', async () => {
		renderComponent();

		await waitForInitialRender();

		// Wait a bit more for API calls to be captured
		await waitFor(() => {
			expect(apiCalls.length).toBeGreaterThan(0);
		});

		// Verify that only the top_operations endpoint was called
		expect(apiCalls).toHaveLength(1);
		expect(apiCalls[0].endpoint).toBe(TOP_OPERATIONS_ENDPOINT);
		expect(apiCalls[0].body).toStrictEqual({
			start: `${defaultApiCallExpectation.start}`,
			end: `${defaultApiCallExpectation.end}`,
			service: defaultApiCallExpectation.service,
			tags: defaultApiCallExpectation.selectedTags,
			limit: 5000,
		});
	});

	it('calls entry_point_operations API when toggle is switched to entry point', async () => {
		renderComponent();

		// Wait for initial render
		await waitForInitialRender();

		// Wait for initial API call
		await waitFor(() => {
			expect(apiCalls.length).toBeGreaterThan(0);
		});

		// Clear previous API calls
		apiCalls = [];

		// Toggle to entry point
		await clickToggleAndWaitForDataLoad();

		// Wait for the API call to be captured
		await waitFor(() => {
			expect(apiCalls.length).toBeGreaterThan(0);
		});

		// Verify that the entry_point_operations endpoint was called
		expect(apiCalls).toHaveLength(1);
		expect(apiCalls[0].endpoint).toBe(ENTRY_POINT_OPERATIONS_ENDPOINT);
		expect(apiCalls[0].body).toStrictEqual({
			start: `${defaultApiCallExpectation.start}`,
			end: `${defaultApiCallExpectation.end}`,
			service: defaultApiCallExpectation.service,
			tags: defaultApiCallExpectation.selectedTags,
			limit: 5000,
		});
	});

	it('switches to entry point operations when toggle is clicked', async () => {
		renderComponent();

		// Wait for initial render
		await waitForInitialRender();

		// Find and click the toggle switch
		const toggleSwitch = screen.getByRole('switch');
		expect(toggleSwitch).not.toBeChecked();

		await clickToggleAndWaitForDataLoad();

		// Check that the switch is now checked and title updates
		expect(toggleSwitch).toBeChecked();
		expect(screen.getByText(KEY_ENTRY_POINT_OPERATIONS_TEXT)).toBeInTheDocument();
	});

	it('calls correct APIs when toggling multiple times', async () => {
		renderComponent();

		// Wait for initial render
		await waitForInitialRender();

		// Wait for initial API call
		await waitFor(() => {
			expect(apiCalls.length).toBeGreaterThan(0);
		});

		// Should have called top_operations initially
		expect(apiCalls).toHaveLength(1);
		expect(apiCalls[0].endpoint).toBe(TOP_OPERATIONS_ENDPOINT);

		// Toggle to entry point
		await clickToggleAndWaitForDataLoad();

		// Wait for the second API call
		await waitFor(() => {
			expect(apiCalls.length).toBeGreaterThan(1);
		});

		// Should now have called entry_point_operations
		expect(apiCalls).toHaveLength(2);
		expect(apiCalls[1].endpoint).toBe(ENTRY_POINT_OPERATIONS_ENDPOINT);

		// Toggle back to regular operations
		const toggleSwitch = screen.getByRole('switch');
		act(() => {
			fireEvent.click(toggleSwitch);
		});

		await waitFor(() => {
			expect(screen.getByText(KEY_OPERATIONS_TEXT)).toBeInTheDocument();
		});

		// Wait for the third API call
		await waitFor(() => {
			expect(apiCalls.length).toBeGreaterThan(2);
		});

		// Should have called top_operations again
		expect(apiCalls).toHaveLength(3);
		expect(apiCalls[2].endpoint).toBe(TOP_OPERATIONS_ENDPOINT);

		// Settle the toggled-back request so it cannot leak past the test.
		await screen.findByText('GET /api/users');

		expect(toggleSwitch).not.toBeChecked();
	});

	it('displays entry point toggle with correct label', async () => {
		renderComponent();

		await waitFor(() => {
			expect(screen.getByText(ENTRY_POINT_SPANS_TEXT)).toBeInTheDocument();
		});

		// Settle the initial request before finishing.
		await screen.findByText('GET /api/users');

		const toggleSwitch = screen.getByRole('switch');
		expect(toggleSwitch).toBeInTheDocument();
	});

	it('switches back to key operations when toggle is clicked twice', async () => {
		renderComponent();

		// Wait for initial render
		await waitForInitialRender();

		// Toggle on (to entry point)
		await clickToggleAndWaitForDataLoad();
		expect(screen.getByText(KEY_ENTRY_POINT_OPERATIONS_TEXT)).toBeInTheDocument();

		// Toggle off (back to key operations)
		const toggleSwitch = screen.getByRole('switch');
		act(() => {
			fireEvent.click(toggleSwitch);
		});

		await waitFor(() => {
			expect(screen.getByText(KEY_OPERATIONS_TEXT)).toBeInTheDocument();
		});

		// Settle the toggled-back request; this is the last test but keeps the
		// file hermetic if tests are reordered.
		await screen.findByText('GET /api/users');

		expect(toggleSwitch).not.toBeChecked();
	});
});
