import { Logout } from 'api/utils';
import ROUTES from 'constants/routes';
import history from 'lib/history';
import { render, screen, userEvent, waitFor } from 'tests/test-utils';
import { openInNewTab } from 'utils/navigation';

import SideNav from '../SideNav';
import { WORKSPACE_LOCKED_TOOLTIP } from '../menuItems';

jest.mock('api/utils', () => ({
	...jest.requireActual('api/utils'),
	Logout: jest.fn(),
}));

jest.mock('utils/navigation', () => ({
	...jest.requireActual('utils/navigation'),
	openInNewTab: jest.fn(),
}));

jest.mock('lib/history', () => ({
	__esModule: true,
	default: {
		push: jest.fn(),
		location: { pathname: '/', search: '' },
		listen: jest.fn(),
	},
}));

jest.mock('providers/cmdKProvider', () => ({
	useCmdK: (): { openCmdK: jest.Mock } => ({ openCmdK: jest.fn() }),
}));

jest.mock('hooks/hotkeys/useKeyboardHotkeys', () => ({
	useKeyboardHotkeys: (): Record<string, jest.Mock> => ({
		registerShortcut: jest.fn(),
		deregisterShortcut: jest.fn(),
	}),
}));

const mockHistoryPush = history.push as jest.MockedFunction<
	typeof history.push
>;

const BLOCKED_TRIAL_INFO = {
	trialStart: -1,
	trialEnd: -1,
	onTrial: false,
	workSpaceBlock: true,
	trialConvertedToSubscription: false,
	gracePeriodEnd: -1,
};

async function openSettingsMenu(
	user: ReturnType<typeof userEvent.setup>,
): Promise<void> {
	await user.click(screen.getByTestId('settings-nav-item'));
	await screen.findByRole('menu');
}

describe('SideNav settings dropdown', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('disables the workspace item with its reason when the workspace is blocked', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		render(<SideNav isPinned />, undefined, {
			appContextOverrides: { trialInfo: BLOCKED_TRIAL_INFO },
		});
		await openSettingsMenu(user);

		const workspaceItem = screen.getByTestId('workspace-settings-nav-item');
		expect(workspaceItem).toHaveAttribute('aria-disabled', 'true');

		await user.hover(workspaceItem);
		await expect(screen.findByRole('tooltip')).resolves.toHaveTextContent(
			WORKSPACE_LOCKED_TOOLTIP,
		);

		await user.click(workspaceItem);
		expect(mockHistoryPush).not.toHaveBeenCalledWith(ROUTES.SETTINGS);
	});

	it('keeps the workspace item enabled when the workspace is not blocked', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		render(<SideNav isPinned />);
		await openSettingsMenu(user);

		const workspaceItem = screen.getByTestId('workspace-settings-nav-item');
		expect(workspaceItem).not.toHaveAttribute('aria-disabled', 'true');

		await user.click(workspaceItem);
		expect(mockHistoryPush).toHaveBeenCalledWith(ROUTES.SETTINGS);
	});

	it('signs out from the logout item', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		render(<SideNav isPinned />);
		await openSettingsMenu(user);

		await user.click(screen.getByTestId('logout-nav-item'));

		expect(Logout).toHaveBeenCalledTimes(1);
	});

	it('opens a settings link in a new tab on a modifier click', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		render(<SideNav isPinned />);
		await openSettingsMenu(user);

		await user.keyboard('{Control>}');
		await user.click(screen.getByTestId('account-settings-nav-item'));
		await user.keyboard('{/Control}');

		await waitFor(() => {
			expect(openInNewTab).toHaveBeenCalledWith(ROUTES.MY_SETTINGS);
		});
		expect(mockHistoryPush).not.toHaveBeenCalledWith(ROUTES.MY_SETTINGS);
	});
});
