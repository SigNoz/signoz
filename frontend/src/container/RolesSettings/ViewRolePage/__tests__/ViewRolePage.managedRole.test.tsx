import { TooltipProvider } from '@signozhq/ui/tooltip';
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
		render(
			<TooltipProvider>
				<ViewRolePage />
			</TooltipProvider>,
			undefined,
			{
				initialRoute: buildViewRoleRoute(MANAGED_ROLE_ID, MANAGED_ROLE_NAME),
			},
		);

		await waitFor(() => {
			expect(screen.getByTestId('delete-button')).toBeDisabled();
		});
	});

	it('disables Update button for managed roles', async () => {
		render(
			<TooltipProvider>
				<ViewRolePage />
			</TooltipProvider>,
			undefined,
			{
				initialRoute: buildViewRoleRoute(MANAGED_ROLE_ID, MANAGED_ROLE_NAME),
			},
		);

		await waitFor(() => {
			expect(screen.getByTestId('save-button')).toBeDisabled();
		});
	});

	it('still shows Cancel button for managed roles', async () => {
		render(
			<TooltipProvider>
				<ViewRolePage />
			</TooltipProvider>,
			undefined,
			{
				initialRoute: buildViewRoleRoute(MANAGED_ROLE_ID, MANAGED_ROLE_NAME),
			},
		);

		await expect(
			screen.findByTestId('cancel-button'),
		).resolves.toBeInTheDocument();
	});
});
