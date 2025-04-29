import { render, RenderResult, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import ROUTES from 'constants/routes';
import dayjs from 'dayjs';
import MockQueryClientProvider from 'providers/test/MockQueryClientProvider';
import { MemoryRouter, Route } from 'react-router-dom';

import TracesFunnels from '..';
import { mockFunnelsListData, mockSingleFunnelData } from './mockFunnelsData';

const mockUseFunnelsList = jest.fn();
jest.mock('hooks/TracesFunnels/useFunnels', () => ({
	...jest.requireActual('hooks/TracesFunnels/useFunnels'),
	useFunnelsList: (): void => mockUseFunnelsList(),
	useFunnelDetails: jest.fn(() => ({
		// Mock for details page test
		data: { payload: mockSingleFunnelData },
		isLoading: false,
		isError: false,
	})),
}));

jest.mock('hooks/useSafeNavigate', () => ({
	useSafeNavigate: (): any => ({
		safeNavigate: jest.fn(),
	}),
}));

jest.mock('hooks/useUrlQuery', () => ({
	__esModule: true,
	default: jest.fn(() => new URLSearchParams()),
}));

describe('Viewing and Navigating Funnels', () => {
	beforeEach(() => {
		// Reset mocks before each test
		jest.clearAllMocks();

		// Default successful fetch for list
		mockUseFunnelsList.mockReturnValue({
			data: { payload: mockFunnelsListData },
			isLoading: false,
			isError: false,
		});
	});

	describe('TracesFunnels List View', () => {
		const renderListComponent = (): RenderResult =>
			render(
				<MockQueryClientProvider>
					<MemoryRouter initialEntries={[ROUTES.TRACES_FUNNELS]}>
						<Route path={ROUTES.TRACES_FUNNELS}>
							<TracesFunnels />
						</Route>
						{/* Add a dummy route for detail page to test navigation link */}
						<Route path={ROUTES.TRACES_FUNNELS_DETAIL}>
							<div>Mock Details Page</div>
						</Route>
					</MemoryRouter>
				</MockQueryClientProvider>,
			);

		it('should display the list of funnels when data is loaded', async () => {
			renderListComponent();

			// Wait for the list items to appear (use findBy for async)
			await screen.findByText(mockFunnelsListData[0].funnel_name);

			// Verify both funnel names are present
			expect(
				screen.getByText(mockFunnelsListData[0].funnel_name),
			).toBeInTheDocument();
			expect(
				screen.getByText(mockFunnelsListData[1].funnel_name),
			).toBeInTheDocument();
		});

		it('should display funnel details like creation date and user', async () => {
			renderListComponent();
			const firstFunnel = mockFunnelsListData[0];
			await screen.findByText(firstFunnel.funnel_name); // Ensure rendering is complete

			// Check for formatted date (adjust format if needed)
			const expectedDateFormat = DATE_TIME_FORMATS.FUNNELS_LIST_DATE;
			const expectedDate = dayjs(firstFunnel.creation_timestamp).format(
				expectedDateFormat,
			);
			expect(screen.getByText(expectedDate)).toBeInTheDocument();

			// Check for user
			expect(screen.getByText(firstFunnel.user as string)).toBeInTheDocument();

			// Find the first funnel item container and check within it
			const firstFunnelItem = screen
				.getByText(firstFunnel.funnel_name)
				.closest('.funnel-item');

			// Get the expected initial
			const expectedInitial = firstFunnel.user?.substring(0, 1).toUpperCase();

			// Look for the avatar initial specifically within the first funnel item
			const avatarElement = within(firstFunnelItem as HTMLElement).getByText(
				expectedInitial as string,
			);
			expect(avatarElement).toBeInTheDocument();
		});

		it('should render links for each funnel item pointing to the details page', async () => {
			renderListComponent();
			await screen.findByText(mockFunnelsListData[0].funnel_name); // Ensure rendering

			const firstFunnelLink = screen.getByRole('link', {
				name: new RegExp(mockFunnelsListData[0].funnel_name),
			}); // Find link associated with the funnel item content
			const secondFunnelLink = screen.getByRole('link', {
				name: new RegExp(mockFunnelsListData[1].funnel_name),
			});

			const expectedPath1 = ROUTES.TRACES_FUNNELS_DETAIL.replace(
				':funnelId',
				mockFunnelsListData[0].id,
			);
			const expectedPath2 = ROUTES.TRACES_FUNNELS_DETAIL.replace(
				':funnelId',
				mockFunnelsListData[1].id,
			);

			expect(firstFunnelLink).toHaveAttribute('href', expectedPath1);
			expect(secondFunnelLink).toHaveAttribute('href', expectedPath2);

			// Optional: Simulate click and verify navigation (less common now, asserting link is often enough)
			await userEvent.click(firstFunnelLink);
			expect(screen.getByText('Mock Details Page')).toBeInTheDocument(); // If you setup the route element
		});

		it('should display loading skeletons when isLoading is true', () => {
			mockUseFunnelsList.mockReturnValue({
				data: null, // No data yet
				isLoading: true,
				isError: false,
			});
			const { container } = renderListComponent();

			expect(
				container.querySelectorAll('.ant-skeleton-active').length,
			).toBeGreaterThan(0);
		});

		it('should display error message when isError is true', () => {
			mockUseFunnelsList.mockReturnValue({
				data: null,
				isLoading: false,
				isError: true,
			});
			renderListComponent();
			expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
		});

		it('should display empty state when data is empty', () => {
			mockUseFunnelsList.mockReturnValue({
				data: { payload: [] }, // Empty array
				isLoading: false,
				isError: false,
			});
			renderListComponent();

			expect(screen.getByText(/No Funnels yet/i)).toBeInTheDocument();
		});
	});
});
