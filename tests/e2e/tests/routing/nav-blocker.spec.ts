import {
	expect,
	onAdminPage,
	PATH,
	routingDriver,
	test,
	uniqueAlphaSuffix,
} from '../../drivers/routing';

// `/settings/roles/new` is the only `useNavigationBlocker` consumer, so this is
// the whole observable surface of the blocker protocol.

// Both tests drive the create form; keep them off each other's role names.
test.describe.configure({ mode: 'serial' });

const BLOCKED_ROLE_NAME = `routing-blocker-${uniqueAlphaSuffix()}`;
const SAVED_ROLE_NAME = `routing-bypass-${uniqueAlphaSuffix()}`;

test.describe('Routing — unsaved-changes navigation blocker', () => {
	test.afterAll(async ({ browser }) => {
		await onAdminPage(browser, (page) =>
			routingDriver(page).roles.removeByName([BLOCKED_ROLE_NAME, SAVED_ROLE_NAME]),
		);
	});

	test('TC-16 a blocked navigation can be cancelled and then confirmed', async ({
		routing,
	}) => {
		const { roles } = routing;
		await roles.openCreateForm(BLOCKED_ROLE_NAME);

		await roles.cancel();
		await expect(roles.discardDialog()).toBeVisible();

		// Cancel drops the blocked transition rather than retrying it.
		await roles
			.discardDialog()
			.getByRole('button', { name: 'Keep editing' })
			.click();
		await expect(roles.discardDialog()).toBeHidden();
		expect(routing.url().pathname).toBe(PATH.roleCreate);
		await expect(roles.nameInput()).toHaveValue(BLOCKED_ROLE_NAME);

		await roles.cancel();
		await roles.discardDialog().getByRole('button', { name: 'Discard' }).click();
		await routing.waitForPath(PATH.roles);
	});

	test('TC-17 saving bypasses the blocker for the next navigation', async ({
		routing,
	}) => {
		const { roles } = routing;
		await roles.openCreateForm(SAVED_ROLE_NAME);

		// `allowNextNavigation()` unarms the blocker for the push after a save.
		await roles.save();
		await routing.waitForPath(PATH.roles);

		await expect(roles.discardDialog()).toHaveCount(0);
		await expect(roles.settings()).toBeVisible();
	});
});
