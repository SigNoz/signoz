import { rest, server } from 'mocks-server/server';
import { render, screen, waitFor } from 'tests/test-utils';

import ListView from './index';

// Helper to create error response
const createErrorResponse = (
	status: number,
	code: string,
	message: string,
): {
	httpStatusCode: number;
	error: {
		code: string;
		message: string;
		url: string;
		errors: unknown[];
	};
} => ({
	httpStatusCode: status,
	error: {
		code,
		message,
		url: '',
		errors: [],
	},
});

// Helper to create MSW error handler
const createErrorHandler = (
	status: number,
	code: string,
	message: string,
): ReturnType<typeof rest.post> =>
	rest.post(/query-range/, (_req, res, ctx) =>
		res(ctx.status(status), ctx.json(createErrorResponse(status, code, message))),
	);

// Helper to render with required props
const renderListView = (
	props: Record<string, unknown> = {},
): ReturnType<typeof render> => {
	const setWarning = jest.fn();
	const setIsLoadingQueries = jest.fn();
	return render(
		<ListView
			isFilterApplied={false}
			setWarning={setWarning}
			setIsLoadingQueries={setIsLoadingQueries}
			// eslint-disable-next-line react/jsx-props-no-spreading
			{...props}
		/>,
		undefined,
		{ initialRoute: '/traces-explorer' },
	);
};

// Helper to verify all controls are visible
const verifyControlsVisibility = (): void => {
	// Order by controls
	expect(screen.getByText(/Order by/i)).toBeInTheDocument();

	// Pagination controls
	expect(screen.getByRole('button', { name: /previous/i })).toBeInTheDocument();
	expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();

	// Items per page selector (there are multiple comboboxes, so we check for at least 2)
	const comboboxes = screen.getAllByRole('combobox');
	expect(comboboxes.length).toBeGreaterThanOrEqual(2);

	// Options menu (settings button) - check for translation key or actual text
	expect(screen.getByText(/options_menu.options|options/i)).toBeInTheDocument();
};

describe('Traces ListView - Error and Empty States', () => {
	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('Empty State', () => {
		it('shows all controls and empty state when filters are applied but no results', async () => {
			// MSW default returns empty result
			renderListView({ isFilterApplied: true });

			// All controls should be visible
			verifyControlsVisibility();

			// Empty state with filter message should be visible
			await waitFor(() => {
				expect(screen.getByText(/This query had no results/i)).toBeInTheDocument();
			});
		});
	});

	describe('Error States', () => {
		it('shows all controls when API returns 400 error', async () => {
			server.use(createErrorHandler(400, 'BadRequestError', 'Bad Request'));

			renderListView();

			// All controls should be visible even when there's an error
			verifyControlsVisibility();

			// Wait for the component to render
			await waitFor(() => {
				expect(screen.getByText(/Order by/i)).toBeInTheDocument();
			});
		});

		it('shows all controls when API returns 500 error', async () => {
			server.use(
				createErrorHandler(500, 'InternalServerError', 'Internal Server Error'),
			);

			renderListView();

			// All controls should be visible even when there's an error
			verifyControlsVisibility();

			// Wait for the component to render
			await waitFor(() => {
				expect(screen.getByText(/Order by/i)).toBeInTheDocument();
			});
		});

		it('shows all controls when API returns network error', async () => {
			server.use(
				rest.post(/query-range/, (_req, res) =>
					res.networkError('Failed to connect'),
				),
			);

			renderListView();

			// All controls should be visible even when there's an error
			verifyControlsVisibility();

			// Wait for the component to render
			await waitFor(() => {
				expect(screen.getByText(/Order by/i)).toBeInTheDocument();
			});
		});
	});

	describe('Controls Functionality', () => {
		it('allows interaction with controls in error state', async () => {
			server.use(createErrorHandler(400, 'BadRequestError', 'Bad Request'));

			renderListView();

			// Wait for component to render
			await waitFor(() => {
				expect(screen.getByText(/Order by/i)).toBeInTheDocument();
			});

			// Order by controls should be interactive
			const comboboxes = screen.getAllByRole('combobox');
			expect(comboboxes.length).toBeGreaterThanOrEqual(2);

			// Pagination controls should be present
			const previousButton = screen.getByRole('button', { name: /previous/i });
			const nextButton = screen.getByRole('button', { name: /next/i });
			expect(previousButton).toBeInTheDocument();
			expect(nextButton).toBeInTheDocument();

			// Options menu should be clickable
			const optionsButton = screen.getByText(/options_menu.options|options/i);
			expect(optionsButton).toBeInTheDocument();
		});

		it('allows interaction with controls in empty state', async () => {
			renderListView();

			// Wait for empty state
			await waitFor(() => {
				expect(screen.getByText(/No traces yet/i)).toBeInTheDocument();
			});

			// All controls should be interactive
			const comboboxes = screen.getAllByRole('combobox');
			expect(comboboxes.length).toBeGreaterThanOrEqual(2);

			// Options menu should be clickable
			const optionsButton = screen.getByText(/options_menu.options|options/i);
			expect(optionsButton).toBeInTheDocument();
		});
	});
});
