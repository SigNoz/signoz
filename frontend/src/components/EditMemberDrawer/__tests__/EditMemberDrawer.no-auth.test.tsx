import {
	useCreateResetPasswordToken,
	useDeleteUser,
	useGetResetPasswordToken,
	useGetRolesByUserID,
	useGetUser,
	useRemoveUserRoleByUserIDAndRoleID,
	useSetRoleByUserID,
	useUpdateMyUserV2,
	useUpdateUser,
} from 'api/generated/services/users';
import { MemberStatus } from 'container/MembersSettings/utils';
import { managedRoles } from 'mocks-server/__mockdata__/roles';
import { screen } from 'tests/test-utils';
import { renderWithNoAuth } from 'tests/no-auth-test-utils';

import EditMemberDrawer from '../EditMemberDrawer';

jest.mock('api/generated/services/users', () => ({
	useDeleteUser: jest.fn(),
	useGetUser: jest.fn(),
	useGetRolesByUserID: jest.fn(),
	useRemoveUserRoleByUserIDAndRoleID: jest.fn(),
	useUpdateUser: jest.fn(),
	useUpdateMyUserV2: jest.fn(),
	useSetRoleByUserID: jest.fn(),
	useGetResetPasswordToken: jest.fn(),
	useCreateResetPasswordToken: jest.fn(),
	getGetRolesByUserIDQueryKey: ({ id }: { id: string }): string[] => [
		`/api/v2/users/${id}/roles`,
	],
}));

const activeMember = {
	id: 'user-1',
	name: 'Alice Smith',
	email: 'alice@signoz.io',
	status: MemberStatus.Active,
	joinedOn: '1700000000000',
	updatedAt: '1710000000000',
};

function setupMocks(): void {
	(useGetUser as jest.Mock).mockReturnValue({
		data: {
			data: {
				id: 'user-1',
				displayName: 'Alice Smith',
				email: 'alice@signoz.io',
				status: 'active',
				userRoles: [
					{ id: 'ur-1', roleId: managedRoles[0].id, role: managedRoles[0] },
				],
			},
		},
		isLoading: false,
		refetch: jest.fn(),
	});
	(useGetRolesByUserID as jest.Mock).mockReturnValue({
		data: { data: [managedRoles[0]] },
		isLoading: false,
	});
	(useRemoveUserRoleByUserIDAndRoleID as jest.Mock).mockReturnValue({
		mutateAsync: jest.fn().mockResolvedValue({}),
		isLoading: false,
	});
	(useUpdateUser as jest.Mock).mockReturnValue({
		mutateAsync: jest.fn().mockResolvedValue({}),
		isLoading: false,
	});
	(useUpdateMyUserV2 as jest.Mock).mockReturnValue({
		mutateAsync: jest.fn().mockResolvedValue({}),
		isLoading: false,
	});
	(useSetRoleByUserID as jest.Mock).mockReturnValue({
		mutateAsync: jest.fn().mockResolvedValue({}),
		isLoading: false,
	});
	(useDeleteUser as jest.Mock).mockReturnValue({
		mutate: jest.fn(),
		isLoading: false,
	});
	(useGetResetPasswordToken as jest.Mock).mockReturnValue({
		data: undefined,
		isLoading: false,
		isError: false,
	});
	(useCreateResetPasswordToken as jest.Mock).mockReturnValue({
		mutateAsync: jest.fn().mockResolvedValue({}),
		isLoading: false,
	});
}

describe('EditMemberDrawer — no-auth mode', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		setupMocks();
	});

	it('renders no-auth guard wrappers for all member mutation buttons', () => {
		renderWithNoAuth(
			<EditMemberDrawer
				member={activeMember}
				open
				onClose={jest.fn()}
				onComplete={jest.fn()}
			/>,
		);
		expect(screen.getByTestId('no-auth-delete-member')).toBeInTheDocument();
		expect(screen.getByTestId('no-auth-generate-reset-link')).toBeInTheDocument();
		expect(screen.getByTestId('no-auth-save-member')).toBeInTheDocument();
	});
});
