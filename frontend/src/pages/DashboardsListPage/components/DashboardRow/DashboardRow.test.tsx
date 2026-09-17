import type { Mock } from 'vitest';
import { render, screen, userEvent } from 'tests/test-utils-full';

import type { DashboardListItem } from '../../utils/helpers';

import DashboardRow from './DashboardRow';

const { mockSafeNavigate, mockTogglePin } = vi.hoisted(() => ({
	mockSafeNavigate: vi.fn(),
	mockTogglePin: vi.fn(),
}));
vi.mock('hooks/useSafeNavigate', () => ({
	useSafeNavigate: (): { safeNavigate: Mock } => ({
		safeNavigate: mockSafeNavigate,
	}),
}));

vi.mock('../../hooks/usePinDashboard', () => ({
	usePinDashboard: (): { togglePin: Mock; isUpdating: boolean } => ({
		togglePin: mockTogglePin,
		isUpdating: false,
	}),
}));

vi.mock('api/common/logEvent', () => ({
	__esModule: true,
	default: vi.fn(),
}));

// Stub the actions menu so this suite stays focused on the row; the isLegacy
// wiring is asserted via the recorded prop, and the menu itself is covered by
// ActionsPopover's own tests.
vi.mock('../ActionsPopover/ActionsPopover', () => ({
	__esModule: true,
	default: ({ isLegacy }: { isLegacy?: boolean }): JSX.Element => (
		<div data-testid="actions-popover" data-legacy={String(!!isLegacy)} />
	),
}));

const makeDashboard = (
	overrides: Partial<DashboardListItem> = {},
): DashboardListItem =>
	({
		id: 'dash-1',
		legacy: false,
		pinned: false,
		locked: false,
		image: '',
		createdBy: 'alice@signoz.io',
		updatedBy: 'alice@signoz.io',
		createdAt: '2024-01-01T00:00:00Z',
		updatedAt: '2024-01-02T00:00:00Z',
		tags: [],
		spec: { display: { name: 'My Dashboard' } },
		...overrides,
	}) as unknown as DashboardListItem;

const renderRow = (dashboard: DashboardListItem): void => {
	render(
		<DashboardRow
			dashboard={dashboard}
			index={0}
			showUpdatedAt={false}
			showUpdatedBy={false}
		/>,
	);
};

describe('DashboardRow', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('a v2 dashboard', () => {
		it('navigates on click and shows no legacy badge', async () => {
			renderRow(makeDashboard());

			expect(screen.queryByTestId('dashboard-legacy-0')).not.toBeInTheDocument();
			expect(screen.getByTestId('dashboard-pin-0')).not.toBeDisabled();
			expect(screen.getByTestId('actions-popover')).toHaveAttribute(
				'data-legacy',
				'false',
			);

			await userEvent.click(screen.getByTestId('dashboard-title-0'));
			expect(mockSafeNavigate).toHaveBeenCalledTimes(1);
			expect(screen.queryByTestId('legacy-dashboard-id')).not.toBeInTheDocument();
		});
	});

	describe('a legacy dashboard', () => {
		it('badges the row, disables pin and gates the actions menu', () => {
			renderRow(makeDashboard({ legacy: true }));

			expect(screen.getByTestId('dashboard-legacy-0')).toBeInTheDocument();
			expect(screen.getByTestId('dashboard-pin-0')).toBeDisabled();
			expect(screen.getByTestId('actions-popover')).toHaveAttribute(
				'data-legacy',
				'true',
			);
		});

		it('opens the explanatory dialog instead of navigating', async () => {
			renderRow(makeDashboard({ legacy: true }));

			await userEvent.click(screen.getByTestId('dashboard-title-0'));

			expect(mockSafeNavigate).not.toHaveBeenCalled();
			expect(screen.getByTestId('legacy-dashboard-id')).toBeInTheDocument();
			expect(
				screen.getByTestId('legacy-dashboard-retry-migration'),
			).toBeInTheDocument();
		});
	});
});
