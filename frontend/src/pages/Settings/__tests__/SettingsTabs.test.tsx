import ROUTES from 'constants/routes';
import { render, screen } from 'tests/test-utils';
import { USER_ROLES } from 'types/roles';

const mockBillingModuleLoaded = jest.fn();

jest.mock('pages/MembersSettings', () => ({
	__esModule: true,
	default: (): JSX.Element => <div data-testid="members-settings-tab" />,
}));

jest.mock('container/BillingContainer/BillingContainer', () => {
	mockBillingModuleLoaded();
	return {
		__esModule: true,
		default: (): JSX.Element => <div data-testid="billing-settings-tab" />,
	};
});

describe('SettingsPage tabs', () => {
	it('loads only the tab of the current route', async () => {
		const { default: SettingsPage } = await import('pages/Settings/Settings');

		render(<SettingsPage />, undefined, {
			role: USER_ROLES.ADMIN,
			initialRoute: ROUTES.MEMBERS_SETTINGS,
		});

		await expect(
			screen.findByTestId('members-settings-tab'),
		).resolves.toBeInTheDocument();
		expect(screen.queryByTestId('billing-settings-tab')).not.toBeInTheDocument();
		expect(mockBillingModuleLoaded).not.toHaveBeenCalled();
	});
});
