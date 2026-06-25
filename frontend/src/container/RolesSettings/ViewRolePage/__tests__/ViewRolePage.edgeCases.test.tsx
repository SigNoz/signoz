import * as roleApi from 'api/generated/services/role';
import * as useAuthZModule from 'hooks/useAuthZ/useAuthZ';
import { customRoleResponse } from 'mocks-server/__mockdata__/roles';
import { mockUseAuthZGrantAll } from 'tests/authz-test-utils';
import { render, screen } from 'tests/test-utils';

import * as useRolePermissionsModule from '../../hooks/useRolePermissions';
import ViewRolePage from '../ViewRolePage';

import {
	buildViewRoleRoute,
	CUSTOM_ROLE_ID,
	CUSTOM_ROLE_NAME,
	mockPermissionsData,
} from './testUtils';

describe('ViewRolePage - Edge Cases', () => {
	beforeEach(() => {
		jest
			.spyOn(useAuthZModule, 'useAuthZ')
			.mockImplementation(mockUseAuthZGrantAll);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('shows fallback for missing description', async () => {
		jest.spyOn(roleApi, 'useGetRole').mockReturnValue({
			data: {
				status: 'success',
				data: {
					...customRoleResponse.data,
					description: '',
				},
			},
			isLoading: false,
			isError: false,
			error: null,
		} as ReturnType<typeof roleApi.useGetRole>);

		jest.spyOn(useRolePermissionsModule, 'useRolePermissions').mockReturnValue({
			data: mockPermissionsData,
			isLoading: false,
			isError: false,
			error: null,
		} as ReturnType<typeof useRolePermissionsModule.useRolePermissions>);

		render(<ViewRolePage />, undefined, {
			initialRoute: buildViewRoleRoute(CUSTOM_ROLE_ID, CUSTOM_ROLE_NAME),
		});

		await expect(screen.findByText('Description')).resolves.toBeInTheDocument();
	});

	it('shows fallback for invalid timestamps', () => {
		jest.spyOn(roleApi, 'useGetRole').mockReturnValue({
			data: {
				status: 'success',
				data: {
					...customRoleResponse.data,
					createdAt: 'invalid-date',
					updatedAt: 'also-invalid',
				},
			},
			isLoading: false,
			isError: false,
			error: null,
		} as ReturnType<typeof roleApi.useGetRole>);

		jest.spyOn(useRolePermissionsModule, 'useRolePermissions').mockReturnValue({
			data: mockPermissionsData,
			isLoading: false,
			isError: false,
			error: null,
		} as ReturnType<typeof useRolePermissionsModule.useRolePermissions>);

		render(<ViewRolePage />, undefined, {
			initialRoute: buildViewRoleRoute(CUSTOM_ROLE_ID, CUSTOM_ROLE_NAME),
		});

		const dashes = screen.getAllByText('—');
		expect(dashes.length).toBeGreaterThanOrEqual(2);
	});

	it('shows fallback for undefined timestamps', () => {
		jest.spyOn(roleApi, 'useGetRole').mockReturnValue({
			data: {
				status: 'success',
				data: {
					...customRoleResponse.data,
					createdAt: undefined,
					updatedAt: undefined,
				},
			},
			isLoading: false,
			isError: false,
			error: null,
		} as ReturnType<typeof roleApi.useGetRole>);

		jest.spyOn(useRolePermissionsModule, 'useRolePermissions').mockReturnValue({
			data: mockPermissionsData,
			isLoading: false,
			isError: false,
			error: null,
		} as ReturnType<typeof useRolePermissionsModule.useRolePermissions>);

		render(<ViewRolePage />, undefined, {
			initialRoute: buildViewRoleRoute(CUSTOM_ROLE_ID, CUSTOM_ROLE_NAME),
		});

		const dashes = screen.getAllByText('—');
		expect(dashes.length).toBeGreaterThanOrEqual(2);
	});
});
