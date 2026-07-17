import { render, screen } from 'tests/test-utils';

import ViewRolePage from '../ViewRolePage';

import {
	buildViewRoleRoute,
	CUSTOM_ROLE_ID,
	CUSTOM_ROLE_NAME,
	mockHooksForCustomRole,
} from './testUtils';

describe('ViewRolePage - Custom Role', () => {
	beforeEach(() => {
		mockHooksForCustomRole();
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('renders role name in page title', async () => {
		render(<ViewRolePage />, undefined, {
			initialRoute: buildViewRoleRoute(CUSTOM_ROLE_ID, CUSTOM_ROLE_NAME),
		});

		await expect(
			screen.findByText('Role - billing-manager'),
		).resolves.toBeInTheDocument();
	});

	it('shows role description', async () => {
		render(<ViewRolePage />, undefined, {
			initialRoute: buildViewRoleRoute(CUSTOM_ROLE_ID, CUSTOM_ROLE_NAME),
		});

		await expect(
			screen.findByText('Custom role for managing billing and invoices.'),
		).resolves.toBeInTheDocument();
	});

	it('shows Update button for custom roles', async () => {
		render(<ViewRolePage />, undefined, {
			initialRoute: buildViewRoleRoute(CUSTOM_ROLE_ID, CUSTOM_ROLE_NAME),
		});

		await expect(screen.findByTestId('save-button')).resolves.toBeInTheDocument();
	});

	it('shows Cancel button', async () => {
		render(<ViewRolePage />, undefined, {
			initialRoute: buildViewRoleRoute(CUSTOM_ROLE_ID, CUSTOM_ROLE_NAME),
		});

		await expect(
			screen.findByTestId('cancel-button'),
		).resolves.toBeInTheDocument();
	});

	it('shows Delete button', async () => {
		render(<ViewRolePage />, undefined, {
			initialRoute: buildViewRoleRoute(CUSTOM_ROLE_ID, CUSTOM_ROLE_NAME),
		});

		await expect(
			screen.findByTestId('delete-button'),
		).resolves.toBeInTheDocument();
	});

	it('renders created/updated timestamps labels', async () => {
		render(<ViewRolePage />, undefined, {
			initialRoute: buildViewRoleRoute(CUSTOM_ROLE_ID, CUSTOM_ROLE_NAME),
		});

		await expect(screen.findByText('Created At')).resolves.toBeInTheDocument();
		await expect(
			screen.findByText('Last Modified At'),
		).resolves.toBeInTheDocument();
	});
});
