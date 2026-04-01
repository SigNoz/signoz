import type { TypesUserDTO } from 'api/generated/services/sigNoz.schemas';
import {
	useDeleteUser,
	useGetUser,
	useRemoveUserRoleByUserIDAndRoleID,
	useSetRoleByUserID,
	useUpdateMyUserV2,
	useUpdateUser,
} from 'api/generated/services/users';
import { rest, server } from 'mocks-server/server';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
import { render, screen, userEvent } from 'tests/test-utils';

import MembersSettings from '../MembersSettings';

jest.mock('@signozhq/sonner', () => ({
	toast: {
		success: jest.fn(),
		error: jest.fn(),
	},
}));

jest.mock('api/generated/services/users', () => ({
	useListUsers: jest.requireActual('api/generated/services/users').useListUsers,
	useDeleteUser: jest.fn(),
	useGetUser: jest.fn(),
	useUpdateUser: jest.fn(),
	useUpdateMyUserV2: jest.fn(),
	useSetRoleByUserID: jest.fn(),
	useRemoveUserRoleByUserIDAndRoleID: jest.fn(),
	getResetPasswordToken: jest.fn(),
	invalidateListUsers: jest.fn().mockResolvedValue(undefined),
	getGetUserQueryKey: jest.fn().mockReturnValue(['/api/v2/users/user-1']),
}));

const USERS_ENDPOINT = '*/api/v2/users';

const mockUsers: TypesUserDTO[] = [
	{
		id: 'user-1',
		displayName: 'Alice Smith',
		email: 'alice@signoz.io',
		status: 'active',
		createdAt: new Date('2024-01-01T00:00:00.000Z'),
		orgId: 'org-1',
	},
	{
		id: 'user-2',
		displayName: 'Bob Jones',
		email: 'bob@signoz.io',
		status: 'active',
		createdAt: new Date('2024-01-02T00:00:00.000Z'),
		orgId: 'org-1',
	},
	{
		id: 'inv-1',
		displayName: '',
		email: 'charlie@signoz.io',
		status: 'pending_invite',
		createdAt: new Date('2024-01-03T00:00:00.000Z'),
		orgId: 'org-1',
	},
	{
		id: 'user-3',
		displayName: 'Dave Deleted',
		email: 'dave@signoz.io',
		status: 'deleted',
		createdAt: new Date('2024-01-04T00:00:00.000Z'),
		orgId: 'org-1',
	},
];

const USER_ENDPOINT = '*/api/v2/users/user-1';

const mockFetchedUser = {
	data: {
		id: 'user-1',
		displayName: 'Alice Smith',
		email: 'alice@signoz.io',
		status: 'active',
		userRoles: [],
	},
};

function renderPage(): ReturnType<typeof render> {
	return render(
		<NuqsTestingAdapter hasMemory>
			<MembersSettings />
		</NuqsTestingAdapter>,
	);
}

describe('MembersSettings (integration)', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		server.use(
			rest.get(USERS_ENDPOINT, (_, res, ctx) =>
				res(ctx.status(200), ctx.json({ data: mockUsers })),
			),
			rest.get(USER_ENDPOINT, (_, res, ctx) =>
				res(ctx.status(200), ctx.json(mockFetchedUser)),
			),
		);
		(useGetUser as jest.Mock).mockReturnValue({
			data: mockFetchedUser,
			isLoading: false,
			refetch: jest.fn(),
		});
		(useUpdateUser as jest.Mock).mockReturnValue({
			mutateAsync: jest.fn().mockResolvedValue({}),
		});
		(useUpdateMyUserV2 as jest.Mock).mockReturnValue({
			mutateAsync: jest.fn().mockResolvedValue({}),
		});
		(useSetRoleByUserID as jest.Mock).mockReturnValue({
			mutateAsync: jest.fn().mockResolvedValue({}),
		});
		(useRemoveUserRoleByUserIDAndRoleID as jest.Mock).mockReturnValue({
			mutateAsync: jest.fn().mockResolvedValue({}),
		});
		(useDeleteUser as jest.Mock).mockReturnValue({
			mutate: jest.fn(),
			isLoading: false,
		});
	});

	afterEach(() => {
		server.resetHandlers();
	});

	it('loads and displays active users, pending invites, and deleted members', async () => {
		renderPage();

		await screen.findByText('Alice Smith');
		expect(screen.getByText('Bob Jones')).toBeInTheDocument();
		expect(screen.getByText('charlie@signoz.io')).toBeInTheDocument();
		expect(screen.getByText('Dave Deleted')).toBeInTheDocument();
		expect(screen.getAllByText('ACTIVE')).toHaveLength(2);
		expect(screen.getByText('INVITED')).toBeInTheDocument();
		expect(screen.getByText('DELETED')).toBeInTheDocument();
	});

	it('filters to pending invites via the filter dropdown', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		renderPage();

		await screen.findByText('Alice Smith');

		await user.click(screen.getByRole('button', { name: /all members/i }));

		const pendingOption = await screen.findByText(/pending invites/i);
		await user.click(pendingOption);

		await screen.findByText('charlie@signoz.io');
		expect(screen.queryByText('Alice Smith')).not.toBeInTheDocument();
	});

	it('filters members by name using the search input', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		renderPage();

		await screen.findByText('Alice Smith');

		await user.type(
			screen.getByPlaceholderText(/Search by name or email/i),
			'bob',
		);

		await screen.findByText('Bob Jones');
		expect(screen.queryByText('Alice Smith')).not.toBeInTheDocument();
		expect(screen.queryByText('charlie@signoz.io')).not.toBeInTheDocument();
	});

	it('opens EditMemberDrawer when an active member row is clicked', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		renderPage();

		await user.click(await screen.findByText('Alice Smith'));

		await screen.findByText('Member Details');
	});

	it('does not open EditMemberDrawer when a deleted member row is clicked', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		renderPage();

		await user.click(await screen.findByText('Dave Deleted'));

		expect(screen.queryByText('Member Details')).not.toBeInTheDocument();
	});

	it('opens InviteMembersModal when "Invite member" button is clicked', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		renderPage();

		await user.click(screen.getByRole('button', { name: /invite member/i }));

		expect(await screen.findAllByPlaceholderText('john@signoz.io')).toHaveLength(
			3,
		);
	});
});
