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

	it('renders role name in page title', () => {
		render(<ViewRolePage />, undefined, {
			initialRoute: buildViewRoleRoute(CUSTOM_ROLE_ID, CUSTOM_ROLE_NAME),
		});

		expect(screen.getByText('Role - billing-manager')).toBeInTheDocument();
	});

	it('shows role description', () => {
		render(<ViewRolePage />, undefined, {
			initialRoute: buildViewRoleRoute(CUSTOM_ROLE_ID, CUSTOM_ROLE_NAME),
		});

		expect(
			screen.getByText('Custom role for managing billing and invoices.'),
		).toBeInTheDocument();
	});

	it('shows Update button for custom roles', () => {
		render(<ViewRolePage />, undefined, {
			initialRoute: buildViewRoleRoute(CUSTOM_ROLE_ID, CUSTOM_ROLE_NAME),
		});

		expect(screen.getByTestId('save-button')).toBeInTheDocument();
	});

	it('shows Cancel button', () => {
		render(<ViewRolePage />, undefined, {
			initialRoute: buildViewRoleRoute(CUSTOM_ROLE_ID, CUSTOM_ROLE_NAME),
		});

		expect(screen.getByTestId('cancel-button')).toBeInTheDocument();
	});

	it('shows Delete button', () => {
		render(<ViewRolePage />, undefined, {
			initialRoute: buildViewRoleRoute(CUSTOM_ROLE_ID, CUSTOM_ROLE_NAME),
		});

		expect(screen.getByTestId('delete-button')).toBeInTheDocument();
	});

	it('renders created/updated timestamps labels', () => {
		render(<ViewRolePage />, undefined, {
			initialRoute: buildViewRoleRoute(CUSTOM_ROLE_ID, CUSTOM_ROLE_NAME),
		});

		expect(screen.getByText('Created At')).toBeInTheDocument();
		expect(screen.getByText('Last Modified At')).toBeInTheDocument();
	});
});
