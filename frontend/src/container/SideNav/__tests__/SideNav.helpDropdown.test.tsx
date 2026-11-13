import ROUTES from 'constants/routes';
import { mockNavigate } from 'tests/router-mocks';
import { render, screen, userEvent } from 'tests/test-utils';
import { USER_ROLES } from 'types/roles';

import SideNav from '../SideNav';

jest.mock('providers/cmdKProvider', () => ({
	useCmdK: (): { openCmdK: jest.Mock } => ({ openCmdK: jest.fn() }),
}));

jest.mock('hooks/hotkeys/useKeyboardHotkeys', () => ({
	useKeyboardHotkeys: (): Record<string, jest.Mock> => ({
		registerShortcut: jest.fn(),
		deregisterShortcut: jest.fn(),
	}),
}));

const INVITE_ITEM_TEST_ID = 'help-menu-invite-collaborators';

async function openHelpMenu(
	user: ReturnType<typeof userEvent.setup>,
): Promise<void> {
	await user.click(screen.getByTestId('help-support-nav-item'));
	await screen.findByRole('menu');
}

describe('SideNav help dropdown invite entry', () => {
	let mockNavigateFn: ReturnType<typeof mockNavigate>;

	beforeEach(() => {
		jest.clearAllMocks();
		mockNavigateFn = mockNavigate();
	});

	it.each([USER_ROLES.ADMIN, USER_ROLES.EDITOR, USER_ROLES.VIEWER])(
		'shows Invite a Team Member and opens the invite modal for %s',
		async (role) => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });

			render(<SideNav isPinned />, undefined, { role });
			await openHelpMenu(user);

			await user.click(screen.getByTestId(INVITE_ITEM_TEST_ID));

			expect(mockNavigateFn).toHaveBeenCalledWith(
				`${ROUTES.MEMBERS_SETTINGS}?invite=true`,
			);
		},
	);
});
