import { ServiceAccountRow } from 'container/ServiceAccountsSettings/utils';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
import { render, screen, userEvent } from 'tests/test-utils';

import ServiceAccountsTable from '../ServiceAccountsTable';

const mockActiveAccount: ServiceAccountRow = {
	id: 'sa-1',
	name: 'CI Bot',
	email: 'ci-bot@signoz.io',
	roles: ['signoz-admin'],
	status: 'ACTIVE',
	createdAt: '2026-01-01T00:00:00Z',
	updatedAt: '2026-01-02T00:00:00Z',
};

const mockDisabledAccount: ServiceAccountRow = {
	id: 'sa-2',
	name: 'Legacy Bot',
	email: 'legacy@signoz.io',
	roles: ['signoz-viewer', 'signoz-editor', 'billing-manager'],
	status: 'DISABLED',
	createdAt: '2025-06-01T00:00:00Z',
	updatedAt: '2025-12-01T00:00:00Z',
};

const defaultProps = {
	loading: false,
	onRowClick: jest.fn(),
};

describe('ServiceAccountsTable', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('renders name, email, role badge, and ACTIVE status badge', () => {
		render(<ServiceAccountsTable {...defaultProps} data={[mockActiveAccount]} />);

		expect(screen.getByText('CI Bot')).toBeInTheDocument();
		expect(screen.getByText('ci-bot@signoz.io')).toBeInTheDocument();
		expect(screen.getByText('signoz-admin')).toBeInTheDocument();
		expect(screen.getByText('ACTIVE')).toBeInTheDocument();
	});

	it('shows DISABLED badge and +2 overflow badge for multi-role accounts', () => {
		render(
			<ServiceAccountsTable {...defaultProps} data={[mockDisabledAccount]} />,
		);

		expect(screen.getByText('DISABLED')).toBeInTheDocument();
		expect(screen.getByText('signoz-viewer')).toBeInTheDocument();
		expect(screen.getByText('+2')).toBeInTheDocument();
	});

	it('calls onRowClick with the correct account when a row is clicked', async () => {
		const onRowClick = jest.fn() as jest.MockedFunction<
			(row: ServiceAccountRow) => void
		>;
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		render(
			<ServiceAccountsTable
				{...defaultProps}
				data={[mockActiveAccount]}
				onRowClick={onRowClick}
			/>,
		);

		await user.click(
			screen.getByRole('button', { name: /View service account CI Bot/i }),
		);

		expect(onRowClick).toHaveBeenCalledTimes(1);
		expect(onRowClick).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'sa-1', email: 'ci-bot@signoz.io' }),
		);
	});

	it('shows "No service accounts" empty state when data is empty and no search query', () => {
		render(<ServiceAccountsTable {...defaultProps} data={[]} />);

		expect(screen.getByText(/No service accounts/i)).toBeInTheDocument();
	});

	it('shows "No results for {query}" empty state when search is active', () => {
		render(
			<NuqsTestingAdapter searchParams={{ search: 'ghost' }}>
				<ServiceAccountsTable {...defaultProps} data={[]} />
			</NuqsTestingAdapter>,
		);

		expect(screen.getByText(/No results for/i)).toBeInTheDocument();
		expect(screen.getByText('ghost')).toBeInTheDocument();
	});
});
