import * as roleApi from 'api/generated/services/role';
import * as useAuthZModule from 'lib/authz/hooks/useAuthZ/useAuthZ';
import { mockUseAuthZGrantAll } from 'lib/authz/utils/authz-test-utils';
import { render } from 'tests/test-utils';

import ViewRolePage from '../ViewRolePage';

import {
	buildViewRoleRoute,
	CUSTOM_ROLE_ID,
	CUSTOM_ROLE_NAME,
} from './testUtils';

describe('ViewRolePage - Loading State', () => {
	beforeEach(() => {
		jest
			.spyOn(useAuthZModule, 'useAuthZ')
			.mockImplementation(mockUseAuthZGrantAll);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('shows skeleton while fetching role', () => {
		jest.spyOn(roleApi, 'useGetRole').mockReturnValue({
			data: undefined,
			isLoading: true,
			isError: false,
			error: null,
		} as ReturnType<typeof roleApi.useGetRole>);

		render(<ViewRolePage />, undefined, {
			initialRoute: buildViewRoleRoute(CUSTOM_ROLE_ID, CUSTOM_ROLE_NAME),
		});

		expect(document.querySelector('.ant-skeleton')).toBeInTheDocument();
	});

	it('does not fetch when roleId is missing from URL', () => {
		const getRole = jest.spyOn(roleApi, 'useGetRole');

		render(<ViewRolePage />, undefined, {
			initialRoute: '/settings/roles',
		});

		expect(getRole).toHaveBeenCalledWith(
			{ id: '' },
			expect.objectContaining({ query: { enabled: false } }),
		);
	});
});
