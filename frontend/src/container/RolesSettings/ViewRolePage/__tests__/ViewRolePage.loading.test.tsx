import * as roleApi from 'api/generated/services/role';
import { server } from 'mocks-server/server';
import { setupAuthzAdmin } from 'lib/authz/utils/authz-test-utils';
import { render, screen } from 'tests/test-utils';

import ViewRolePage from '../ViewRolePage';

import {
	buildViewRoleRoute,
	CUSTOM_ROLE_ID,
	CUSTOM_ROLE_NAME,
} from './testUtils';

describe('ViewRolePage - Loading State', () => {
	beforeEach(() => {
		server.use(setupAuthzAdmin());
	});

	afterEach(() => {
		jest.restoreAllMocks();
		server.resetHandlers();
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

	it('keeps the header visible with delete disabled while fetching role', async () => {
		jest.spyOn(roleApi, 'useGetRole').mockReturnValue({
			data: undefined,
			isLoading: true,
			isError: false,
			error: null,
		} as ReturnType<typeof roleApi.useGetRole>);

		render(<ViewRolePage />, undefined, {
			initialRoute: buildViewRoleRoute(CUSTOM_ROLE_ID, CUSTOM_ROLE_NAME),
		});

		await expect(
			screen.findByTestId('delete-button'),
		).resolves.toBeInTheDocument();
		expect(screen.getByTestId('delete-button')).toBeDisabled();
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
