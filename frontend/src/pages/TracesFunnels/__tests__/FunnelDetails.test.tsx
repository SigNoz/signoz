import { screen, waitFor, within } from '@testing-library/react';
import ROUTES from 'constants/routes';
import { mockSingleFunnelData } from 'mocks-server/__mockdata__/trace_funnels';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import * as FunnelContextModule from 'pages/TracesFunnels/FunnelContext';
import { act } from 'react-dom/test-utils';

import { renderTraceFunnelRoutes } from './CreateFunnel.test';
import { defaultMockFunnelContext } from './mockFunnelsData';

jest.mock('react-redux', () => ({
	...jest.requireActual('react-redux'),
	useSelector: (): any => ({
		selectedTime: '1h',
		loading: false,
	}),
}));

const mockUseParams = jest.requireMock('react-router-dom')
	.useParams as jest.Mock;

const renderFunnelDetailsWithAct = async (): Promise<void> => {
	await act(async () => {
		renderTraceFunnelRoutes([
			ROUTES.TRACES_FUNNELS_DETAIL.replace(':funnelId', mockSingleFunnelData.id),
		]);
	});
};

describe('Viewing Funnel Details', () => {
	beforeEach(() => {
		mockUseParams.mockReturnValue({
			funnelId: mockSingleFunnelData.id,
		});
	});
	it('should render the Funnel Details page and display the funnel name', async () => {
		// Mock the API call to fetch funnel details
		server.use(
			rest.get(
				`http://localhost/api/v1/trace-funnels/${mockSingleFunnelData.id}`,
				(_, res, ctx) => res(ctx.status(200), ctx.json(mockSingleFunnelData)),
			),
			// Mock validate endpoint as it might be called on load
			rest.post(
				`http://localhost/api/v1/trace-funnels/${mockSingleFunnelData.id}/analytics/validate`,
				(_, res, ctx) => res(ctx.status(200), ctx.json({ data: [] })),
			),
		);

		// Render the component for this test
		await renderFunnelDetailsWithAct();

		// Assertions for the general funnel details page render
		await waitFor(() => {
			expect(screen.getByText(/all funnels/i)).toBeInTheDocument();
		});
		await screen.findByText(mockSingleFunnelData.funnel_name);
	});

	it('should display the total number of steps based on the fetched funnel data', async () => {
		// Mock API calls
		server.use(
			rest.get(
				`http://localhost/api/v1/trace-funnels/${mockSingleFunnelData.id}`,
				(_, res, ctx) => res(ctx.status(200), ctx.json(mockSingleFunnelData)),
			),
			rest.post(
				`http://localhost/api/v1/trace-funnels/${mockSingleFunnelData.id}/analytics/validate`,
				(_, res, ctx) => res(ctx.status(200), ctx.json({ data: [] })),
			),
		);

		// Render
		await renderFunnelDetailsWithAct();

		await waitFor(() => {
			// Check if the step count is displayed correctly
			expect(
				screen.getByText(`${mockSingleFunnelData.steps?.length || 0} steps`),
			).toBeInTheDocument();
		});
	});

	// Nested describe for tests requiring FunnelContext mocks
	describe('when FunnelContext state is mocked', () => {
		let useFunnelsContextSpy: jest.SpyInstance;

		beforeEach(() => {
			useFunnelsContextSpy = jest.spyOn(FunnelContextModule, 'useFunnelContext');

			server.use(
				rest.post(
					`http://localhost/api/v1/trace-funnels/${mockSingleFunnelData.id}/analytics/validate`,
					(_, res, ctx) => res(ctx.status(200), ctx.json({ data: [] })),
				),
			);

			server.use(
				rest.get(
					`http://localhost/api/v1/trace-funnels/${mockSingleFunnelData.id}`,
					(_, res, ctx) => res(ctx.status(200), ctx.json(mockSingleFunnelData)),
				),
			);
		});

		afterEach(() => {
			useFunnelsContextSpy.mockRestore();
		});

		it('should show empty state UI when no services or spans are selected in steps', async () => {
			// Apply specific context mock *before* rendering
			useFunnelsContextSpy.mockReturnValue({
				...defaultMockFunnelContext,
				hasAllEmptyStepFields: true,
				isValidateStepsLoading: false,
			});

			// Render *after* setting the context mock for this specific test
			await renderFunnelDetailsWithAct();

			// Assertions specific to the empty steps scenario
			await waitFor(() => {
				expect(screen.getByText('No spans selected yet.')).toBeInTheDocument();

				expect(screen.getByText('No service / span names')).toBeInTheDocument();
			});
		});

		it('should show missing fields UI when steps have incomplete service/span selections', async () => {
			// Apply specific context mock
			useFunnelsContextSpy.mockReturnValue({
				...defaultMockFunnelContext,
				hasIncompleteStepFields: true,
				isValidateStepsLoading: false,
			});

			// Render *after* setting the context mock
			await renderFunnelDetailsWithAct();

			// Check if the missing services / spans message is shown in footer and results
			await waitFor(() => {
				expect(screen.getAllByText('Missing service / span names').length).toBe(2);
			});
		});

		it('should show empty results state when no traces match the funnel steps', async () => {
			// Apply specific context mock
			useFunnelsContextSpy.mockReturnValue({
				...defaultMockFunnelContext,
				validTracesCount: 0,
				isValidateStepsLoading: false,
			});

			// Render *after* setting the context mock
			await renderFunnelDetailsWithAct();

			await waitFor(() => {
				expect(
					screen.getByText('There are no traces that match the funnel steps.'),
				).toBeInTheDocument();
				expect(screen.getByText('0 valid traces')).toBeInTheDocument();
			});
		});

		// Describe block for tests when valid traces exist based on context
		describe('when valid traces exist', () => {
			// Setup and render once for all tests in this block
			beforeEach(async () => {
				// Apply the common context mock for this scenario
				useFunnelsContextSpy.mockReturnValue({
					...defaultMockFunnelContext, // Use the imported mock data
					validTracesCount: 1,
					isValidateStepsLoading: false,
				});

				// Render *after* setting the context mock
				await act(async () => {
					renderTraceFunnelRoutes([
						ROUTES.TRACES_FUNNELS_DETAIL.replace(
							':funnelId',
							mockSingleFunnelData.id,
						),
					]);
				});
			});

			it('should display the correct count of valid traces and steps', async () => {
				await waitFor(() => {
					expect(screen.getByText('1 valid traces')).toBeInTheDocument();
					expect(screen.getByText('2 steps')).toBeInTheDocument();
				});
			});

			it('should display the overall funnel metrics based on context data', async () => {
				await waitFor(() => {
					const overallFunnelMetrics = screen.getByTestId('overall-funnel-metrics');
					const expectedTexts = [
						'Overall Funnel Metrics',
						'Conversion rate',
						'⎯',
						'80.00%',
						'Avg. Rate',
						'10.5 req/s',
						'Errors',
						'2',
						'Avg. Duration',
						'123 ns',
						'P99 Latency',
						'250 ns',
					];

					expectedTexts.forEach((text) => {
						expect(within(overallFunnelMetrics).getByText(text)).toBeInTheDocument();
					});
				});
			});

			it('should display step transition metrics based on context data', async () => {
				await waitFor(() => {
					const stepTransitionMetrics = screen.getByTestId(
						'step-transition-metrics',
					);
					const expectedTexts = [
						'Step 1 -> Step 2',
						'Conversion rate',
						'⎯',
						'92.00%',
						'Avg. Rate',
						'8.5 req/s',
						'Errors',
						'1',
						'Avg. Duration',
						'55 ms',
						'P99 Latency',
						'150 ms',
					];

					expectedTexts.forEach((text) => {
						expect(within(stepTransitionMetrics).getByText(text)).toBeInTheDocument();
					});
				});
			});

			it('should display the slowest traces table based on context data', async () => {
				await waitFor(() => {
					const slowTracesTable = screen.getByTestId('top-slowest-traces-table');
					const expectedTexts = [
						'Slowest 5 traces',
						'TRACE ID',
						'DURATION',
						'SPAN COUNT',
						'slow-trace-1',
						'500 ms',
						'15',
					];

					expectedTexts.forEach((text) => {
						expect(within(slowTracesTable).getByText(text)).toBeInTheDocument();
					});
				});
			});

			it('should display the traces with errors table based on context data', async () => {
				await waitFor(() => {
					const errorTracesTable = screen.getByTestId(
						'top-traces-with-errors-table',
					);
					const expectedTexts = [
						'Traces with errors',
						'TRACE ID',
						'DURATION',
						'SPAN COUNT',
						'error-trace-1',
						'151 ms',
						'10',
					];

					expectedTexts.forEach((text) => {
						expect(within(errorTracesTable).getByText(text)).toBeInTheDocument();
					});
				});
			});
		});
	});
});
