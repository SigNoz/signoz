import userEvent from '@testing-library/user-event';
import * as roleApi from 'api/generated/services/role';
import ROUTES from 'constants/routes';
import { render, screen, waitFor, within } from 'tests/test-utils';
import { safeNavigateMock } from '__tests__/safeNavigateMock';

import ViewRolePage from '../ViewRolePage';

import {
	buildViewRoleRoute,
	CUSTOM_ROLE_ID,
	CUSTOM_ROLE_NAME,
	mockHooksForCustomRole,
} from './testUtils';

describe('ViewRolePage - Actions', () => {
	beforeEach(() => {
		mockHooksForCustomRole();
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('navigates to roles list when Cancel clicked', async () => {
		const user = userEvent.setup();

		render(<ViewRolePage />, undefined, {
			initialRoute: buildViewRoleRoute(CUSTOM_ROLE_ID, CUSTOM_ROLE_NAME),
		});

		const cancelBtn = await screen.findByTestId('cancel-button');
		await user.click(cancelBtn);

		await waitFor(() => {
			expect(safeNavigateMock).toHaveBeenCalledWith(ROUTES.ROLES_SETTINGS);
		});
	});

	it('navigates to edit page when Update clicked', async () => {
		const user = userEvent.setup();

		render(<ViewRolePage />, undefined, {
			initialRoute: buildViewRoleRoute(CUSTOM_ROLE_ID, CUSTOM_ROLE_NAME),
		});

		const updateBtn = await screen.findByTestId('save-button');
		await waitFor(() => {
			expect(updateBtn).not.toBeDisabled();
		});
		await user.click(updateBtn);

		await waitFor(() => {
			expect(safeNavigateMock).toHaveBeenCalledWith(
				`${ROUTES.ROLE_EDIT.replace(':roleId', CUSTOM_ROLE_ID)}?name=${CUSTOM_ROLE_NAME}`,
			);
		});
	});

	it('opens delete modal when Delete clicked', async () => {
		const user = userEvent.setup();

		render(<ViewRolePage />, undefined, {
			initialRoute: buildViewRoleRoute(CUSTOM_ROLE_ID, CUSTOM_ROLE_NAME),
		});

		const deleteBtn = await screen.findByTestId('delete-button');
		await waitFor(() => {
			expect(deleteBtn).not.toBeDisabled();
		});
		await user.click(deleteBtn);

		await expect(
			screen.findByText(/Are you sure you want to delete the role/),
		).resolves.toBeInTheDocument();
	});

	it('calls delete API and redirects on successful delete', async () => {
		const user = userEvent.setup();

		const mockDeleteRole = jest.fn().mockResolvedValue({});
		jest.spyOn(roleApi, 'useDeleteRole').mockReturnValue({
			mutateAsync: mockDeleteRole,
		} as unknown as ReturnType<typeof roleApi.useDeleteRole>);

		render(<ViewRolePage />, undefined, {
			initialRoute: buildViewRoleRoute(CUSTOM_ROLE_ID, CUSTOM_ROLE_NAME),
		});

		const deleteBtn = await screen.findByTestId('delete-button');
		await waitFor(() => {
			expect(deleteBtn).not.toBeDisabled();
		});
		await user.click(deleteBtn);

		await expect(
			screen.findByText(/Are you sure you want to delete the role/),
		).resolves.toBeInTheDocument();

		const modal = screen.getByRole('dialog');
		const modalConfirmBtn = within(modal).getByRole('button', {
			name: /Delete Role/i,
		});
		await user.click(modalConfirmBtn);

		await waitFor(() => {
			expect(mockDeleteRole).toHaveBeenCalledWith({
				pathParams: { id: CUSTOM_ROLE_ID },
			});
		});

		await waitFor(() => {
			expect(safeNavigateMock).toHaveBeenCalledWith(ROUTES.ROLES_SETTINGS);
		});
	});
});
