import { render, screen } from '@testing-library/react';
import {
	PublicDashboardSchema,
	useGetResolvedPublicDashboard,
} from 'hooks/dashboard/useGetResolvedPublicDashboard';

import PublicDashboardPage from '..';

jest.mock('react-router-dom', () => ({
	useParams: (): { dashboardId: string } => ({ dashboardId: 'dash-1' }),
}));

jest.mock('hooks/dashboard/useGetResolvedPublicDashboard', () => ({
	PublicDashboardSchema: { Legacy: 'legacy', V2: 'v2' },
	useGetResolvedPublicDashboard: jest.fn(),
}));

jest.mock('../PublicDashboardView/PublicDashboardView', () => ({
	__esModule: true,
	default: (): JSX.Element => <div data-testid="public-dashboard-view" />,
}));

const mockResolved = useGetResolvedPublicDashboard as jest.Mock;

const resolvedAs = (
	overrides: Record<string, unknown>,
): Record<string, unknown> => ({
	data: undefined,
	isLoading: false,
	isFetching: false,
	isError: false,
	...overrides,
});

describe('PublicDashboardPage', () => {
	beforeEach(() => {
		mockResolved.mockReset();
	});

	it('renders the V2 dashboard when the schema resolves to v2', () => {
		mockResolved.mockReturnValue(
			resolvedAs({
				data: { schema: PublicDashboardSchema.V2, data: { dashboard: {} } },
			}),
		);

		render(<PublicDashboardPage />);

		expect(screen.getByTestId('public-dashboard-view')).toBeInTheDocument();
		expect(
			screen.queryByTestId('public-dashboard-legacy'),
		).not.toBeInTheDocument();
	});

	it('renders the legacy notice for an unmigrated dashboard', () => {
		mockResolved.mockReturnValue(
			resolvedAs({ data: { schema: PublicDashboardSchema.Legacy } }),
		);

		render(<PublicDashboardPage />);

		expect(screen.getByTestId('public-dashboard-legacy')).toBeInTheDocument();
		expect(
			screen.getByText(/hasn't been migrated to the new experience/i),
		).toBeInTheDocument();
		expect(screen.queryByTestId('public-dashboard-view')).not.toBeInTheDocument();
	});

	it('renders the unavailable state on error', () => {
		mockResolved.mockReturnValue(resolvedAs({ isError: true }));

		render(<PublicDashboardPage />);

		expect(
			screen.getByTestId('public-dashboard-unavailable'),
		).toBeInTheDocument();
		expect(
			screen.queryByTestId('public-dashboard-legacy'),
		).not.toBeInTheDocument();
	});

	it('renders nothing while the resolve is still in flight', () => {
		mockResolved.mockReturnValue(
			resolvedAs({ isLoading: true, isFetching: true, isError: true }),
		);

		render(<PublicDashboardPage />);

		expect(
			screen.queryByTestId('public-dashboard-unavailable'),
		).not.toBeInTheDocument();
		expect(
			screen.queryByTestId('public-dashboard-legacy'),
		).not.toBeInTheDocument();
	});
});
