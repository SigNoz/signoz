import { useListUsers } from 'api/generated/services/users';
import { UserListPermission } from 'lib/authz/hooks/useAuthZ/permissions/user.permissions';
import {
	setupAuthzAdmin,
	setupAuthzDeny,
} from 'lib/authz/utils/authz-test-utils';
import { server } from 'mocks-server/server';
import { AllTheProviders, renderHook, waitFor } from 'tests/test-utils';

import { useCreatorOptions } from '../useCreatorOptions';

jest.mock('api/generated/services/users', () => ({
	...jest.requireActual('api/generated/services/users'),
	useListUsers: jest.fn(),
}));

const ARGS = {
	currentUserEmail: 'me@signoz.io',
	fallbackEmails: ['author@signoz.io'],
};

function mockUsers(users: { email: string; displayName: string }[]): void {
	jest.mocked(useListUsers).mockReturnValue({
		data: { data: users },
	} as ReturnType<typeof useListUsers>);
}

describe('useCreatorOptions', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('lists the org users with their display names when list:user is granted', async () => {
		server.use(setupAuthzAdmin());
		mockUsers([{ email: 'alice@signoz.io', displayName: 'Alice' }]);

		const { result } = renderHook(() => useCreatorOptions(ARGS), {
			wrapper: AllTheProviders,
		});

		await waitFor(() =>
			expect(useListUsers).toHaveBeenLastCalledWith({ query: { enabled: true } }),
		);
		expect(result.current).toStrictEqual([
			{ email: 'alice@signoz.io', label: 'Alice (alice@signoz.io)' },
			{ email: 'me@signoz.io', label: 'me@signoz.io (me)' },
		]);
	});

	it('does not fetch users without list:user and falls back to me and the page authors', async () => {
		server.use(setupAuthzDeny(UserListPermission));
		jest.mocked(useListUsers).mockReturnValue({
			data: undefined,
		} as ReturnType<typeof useListUsers>);

		const { result } = renderHook(() => useCreatorOptions(ARGS), {
			wrapper: AllTheProviders,
		});

		await waitFor(() => expect(useListUsers).toHaveBeenCalled());
		expect(useListUsers).not.toHaveBeenCalledWith({ query: { enabled: true } });
		expect(useListUsers).toHaveBeenLastCalledWith({ query: { enabled: false } });
		expect(result.current).toStrictEqual([
			{ email: 'author@signoz.io', label: 'author@signoz.io' },
			{ email: 'me@signoz.io', label: 'me@signoz.io (me)' },
		]);
	});
});
