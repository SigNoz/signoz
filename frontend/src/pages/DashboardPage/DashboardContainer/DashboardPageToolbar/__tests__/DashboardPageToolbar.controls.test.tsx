import type { FullScreenHandle } from 'react-full-screen';
import { useDashboardLockPermission } from 'hooks/dashboards/useDashboardLockPermission';
import { render, screen } from 'tests/test-utils';

import { dashboardResponse } from '../../../stories/__story_mockdata__/dashboard';
import type { DashboardControlsInput } from '../../controls/types';

import { usePublicDashboardMeta } from '../../DashboardSettings/PublicDashboard/usePublicDashboardMeta';
import { useDashboardStore } from '../../store/useDashboardStore';
import DashboardPageToolbar from '../index';

const { data: dashboard } = dashboardResponse({
	panels: 0,
	sectioned: false,
	variables: [],
	locked: true,
});

const handle: FullScreenHandle = {
	active: false,
	enter: jest.fn(),
	exit: jest.fn(),
	node: { current: null },
};

jest.mock('../DashboardActions/DashboardActions', () => ({
	__esModule: true,
	default: (): JSX.Element => <div data-testid="dashboard-actions" />,
}));
jest.mock('../DashboardInfo/DashboardInfo', () => ({
	__esModule: true,
	default: (): JSX.Element => <div data-testid="dashboard-info" />,
}));
jest.mock('../../VariablesBar/VariablesBar', () => ({
	__esModule: true,
	default: (): JSX.Element => <div data-testid="variables-bar" />,
}));
jest.mock('container/TopNav/DateTimeSelectionV2', () => ({
	__esModule: true,
	default: (): JSX.Element => <div data-testid="time-selection" />,
}));
jest.mock(
	'../../PanelsAndSectionsLayout/Panel/PanelTypeSelectionModal/PanelTypeSelectionModal',
	() => ({ __esModule: true, default: (): null => null }),
);
jest.mock('../../hooks/useCreatePanel', () => ({
	useCreatePanel: (): unknown => ({
		isPickerOpen: false,
		openPicker: jest.fn(),
		closePicker: jest.fn(),
		createPanel: jest.fn(),
		targetLayoutIndex: 0,
	}),
}));
jest.mock('../../hooks/useOptimisticPatch', () => ({
	useOptimisticPatch: (): unknown => ({ patchAsync: jest.fn() }),
}));
jest.mock('hooks/dashboards/useToggleDashboardLock', () => ({
	useToggleDashboardLock: (): unknown => ({ toggleLock: jest.fn() }),
}));
jest.mock('hooks/dashboards/useDashboardLockPermission', () => ({
	useDashboardLockPermission: jest.fn(() => ({
		canToggleLock: false,
		isLoading: false,
		disabledTooltip: '',
	})),
}));
jest.mock(
	'../../DashboardSettings/PublicDashboard/usePublicDashboardMeta',
	() => ({
		usePublicDashboardMeta: jest.fn(() => ({
			isPublic: false,
			publicMeta: undefined,
		})),
	}),
);

function renderToolbar(
	ctx: { readOnly?: boolean; controls?: DashboardControlsInput } = {},
): void {
	useDashboardStore
		.getState()
		.setEditContext({ dashboardId: dashboard.id, refetch: jest.fn(), ...ctx });
	render(<DashboardPageToolbar dashboard={dashboard} handle={handle} />);
}

describe('DashboardPageToolbar - controls', () => {
	afterEach(() => {
		useDashboardStore
			.getState()
			.setEditContext({ dashboardId: '', refetch: jest.fn() });
		jest.clearAllMocks();
	});

	it('renders every row and checks lock + share by default', () => {
		renderToolbar();

		expect(screen.getByTestId('dashboard-info')).toBeInTheDocument();
		expect(screen.getByTestId('dashboard-actions')).toBeInTheDocument();
		expect(screen.getByTestId('time-selection')).toBeInTheDocument();
		expect(jest.mocked(useDashboardLockPermission)).toHaveBeenCalledWith(
			expect.objectContaining({ enabled: true }),
		);
		expect(jest.mocked(usePublicDashboardMeta)).toHaveBeenCalledWith(
			dashboard.id,
			{
				enabled: true,
			},
		);
	});

	it('skips the lock permission check on a read-only mount', () => {
		renderToolbar({ readOnly: true });

		expect(jest.mocked(useDashboardLockPermission)).toHaveBeenCalledWith(
			expect.objectContaining({ enabled: false }),
		);
	});

	it('drops the title row and actions the host hides, and their requests', () => {
		renderToolbar({
			readOnly: true,
			controls: { title: false, dashboardActions: false },
		});

		expect(screen.queryByTestId('dashboard-info')).not.toBeInTheDocument();
		expect(screen.queryByTestId('dashboard-actions')).not.toBeInTheDocument();
		expect(jest.mocked(usePublicDashboardMeta)).toHaveBeenCalledWith(
			dashboard.id,
			{
				enabled: false,
			},
		);
	});

	it('hides the time range and keeps the variables bar mounted but hidden', () => {
		renderToolbar({
			controls: { toolbar: { timeRange: false, variables: false } },
		});

		expect(screen.queryByTestId('time-selection')).not.toBeInTheDocument();
		expect(screen.getByTestId('variables-bar')).not.toBeVisible();
	});
});
