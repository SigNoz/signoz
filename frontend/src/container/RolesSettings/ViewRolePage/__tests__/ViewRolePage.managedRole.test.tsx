import { render, screen, waitFor } from 'tests/test-utils';

import ViewRolePage from '../ViewRolePage';

import {
	buildViewRoleRoute,
	MANAGED_ROLE_ID,
	MANAGED_ROLE_NAME,
	mockHooksForManagedRole,
} from './testUtils';

describe('ViewRolePage - Managed Role', () => {
	beforeEach(() => {
		mockHooksForManagedRole();
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('disables Delete button for managed roles', async () => {
		render(<ViewRolePage />, undefined, {
			initialRoute: buildViewRoleRoute(MANAGED_ROLE_ID, MANAGED_ROLE_NAME),
		});

		await waitFor(() => {
			expect(screen.getByTestId('delete-button')).toHaveAttribute(
				'aria-disabled',
				'true',
			);
		});
	});

	it('disables Update button for managed roles', async () => {
		render(<ViewRolePage />, undefined, {
			initialRoute: buildViewRoleRoute(MANAGED_ROLE_ID, MANAGED_ROLE_NAME),
		});

		await waitFor(() => {
			expect(screen.getByTestId('save-button')).toHaveAttribute(
				'aria-disabled',
				'true',
			);
		});
	});

	it('still shows Cancel button for managed roles', async () => {
		render(<ViewRolePage />, undefined, {
			initialRoute: buildViewRoleRoute(MANAGED_ROLE_ID, MANAGED_ROLE_NAME),
		});

		await expect(
			screen.findByTestId('cancel-button'),
		).resolves.toBeInTheDocument();
	});
});
