import * as roleApi from 'api/generated/services/role';
import { customRoleResponse } from 'mocks-server/__mockdata__/roles';
import { server } from 'mocks-server/server';
import { setupAuthzAdmin } from 'lib/authz/utils/authz-test-utils';
import { render, screen } from 'tests/test-utils-full';

import * as useRolePermissionsModule from '../../hooks/useRolePermissions';
import ViewRolePage from '../ViewRolePage';

import {
	buildViewRoleRoute,
	CUSTOM_ROLE_ID,
	CUSTOM_ROLE_NAME,
	mockPermissionsData,
} from './testUtils';

vi.mock('api/generated/services/role', { spy: true });
vi.mock('../../hooks/useRolePermissions', { spy: true });

describe('ViewRolePage - Edge Cases', () => {
	beforeEach(() => {
		server.use(setupAuthzAdmin());
	});

	afterEach(() => {
		vi.restoreAllMocks();
		server.resetHandlers();
	});

	it('shows fallback for missing description', async () => {
		vi.mocked(roleApi.useGetRole).mockReturnValue({
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

		vi.mocked(useRolePermissionsModule.useRolePermissions).mockReturnValue({
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

	it('shows fallback for invalid timestamps', async () => {
		vi.mocked(roleApi.useGetRole).mockReturnValue({
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

		vi.mocked(useRolePermissionsModule.useRolePermissions).mockReturnValue({
			data: mockPermissionsData,
			isLoading: false,
			isError: false,
			error: null,
		} as ReturnType<typeof useRolePermissionsModule.useRolePermissions>);

		render(<ViewRolePage />, undefined, {
			initialRoute: buildViewRoleRoute(CUSTOM_ROLE_ID, CUSTOM_ROLE_NAME),
		});

		// Wait for content to render (not just page wrapper)
		await expect(
			screen.findByTestId('permission-view-mode'),
		).resolves.toBeInTheDocument();
		const dashes = screen.getAllByText('—');
		expect(dashes.length).toBeGreaterThanOrEqual(2);
	});

	it('shows fallback for undefined timestamps', async () => {
		vi.mocked(roleApi.useGetRole).mockReturnValue({
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

		vi.mocked(useRolePermissionsModule.useRolePermissions).mockReturnValue({
			data: mockPermissionsData,
			isLoading: false,
			isError: false,
			error: null,
		} as ReturnType<typeof useRolePermissionsModule.useRolePermissions>);

		render(<ViewRolePage />, undefined, {
			initialRoute: buildViewRoleRoute(CUSTOM_ROLE_ID, CUSTOM_ROLE_NAME),
		});

		// Wait for content to render (not just page wrapper)
		await expect(
			screen.findByTestId('permission-view-mode'),
		).resolves.toBeInTheDocument();
		const dashes = screen.getAllByText('—');
		expect(dashes.length).toBeGreaterThanOrEqual(2);
	});
});
