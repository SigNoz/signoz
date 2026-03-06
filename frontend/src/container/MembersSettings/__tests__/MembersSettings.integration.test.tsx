import { rest, server } from 'mocks-server/server';
import { render, screen, userEvent } from 'tests/test-utils';
import { PendingInvite } from 'types/api/user/getPendingInvites';
import { UserResponse } from 'types/api/user/getUser';

import MembersSettings from '../MembersSettings';

jest.mock('@signozhq/sonner', () => ({
	toast: {
		success: jest.fn(),
		error: jest.fn(),
	},
}));

const USERS_ENDPOINT = '*/api/v1/user';
const INVITES_ENDPOINT = '*/api/v1/invite';

const mockUsers: UserResponse[] = [
	{
		id: 'user-1',
		displayName: 'Alice Smith',
		email: 'alice@signoz.io',
		role: 'ADMIN',
		createdAt: 1700000000,
		organization: 'TestOrg',
		orgId: 'org-1',
	},
	{
		id: 'user-2',
		displayName: 'Bob Jones',
		email: 'bob@signoz.io',
		role: 'VIEWER',
		createdAt: 1700000001,
		organization: 'TestOrg',
		orgId: 'org-1',
	},
];

const mockInvites: PendingInvite[] = [
	{
		id: 'inv-1',
		email: 'charlie@signoz.io',
		name: 'Charlie',
		role: 'EDITOR',
		createdAt: 1700000002,
		token: 'tok-abc',
	},
];

describe('MembersSettings (integration)', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		server.use(
			rest.get(USERS_ENDPOINT, (_, res, ctx) =>
				res(ctx.status(200), ctx.json({ data: mockUsers })),
			),
			rest.get(INVITES_ENDPOINT, (_, res, ctx) =>
				res(ctx.status(200), ctx.json({ data: mockInvites })),
			),
		);
	});

	afterEach(() => {
		server.resetHandlers();
	});

	it('loads and displays active users and pending invites', async () => {
		render(<MembersSettings />);

		await screen.findByText('Alice Smith');
		expect(screen.getByText('Bob Jones')).toBeInTheDocument();
		expect(screen.getByText('charlie@signoz.io')).toBeInTheDocument();
		expect(screen.getAllByText('ACTIVE')).toHaveLength(2);
		expect(screen.getByText('INVITED')).toBeInTheDocument();
	});

	it('filters to pending invites via the filter dropdown', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		render(<MembersSettings />);

		await screen.findByText('Alice Smith');

		await user.click(screen.getByRole('button', { name: /all members/i }));

		const pendingOption = await screen.findByText(/pending invites/i);
		await user.click(pendingOption);

		await screen.findByText('charlie@signoz.io');
		expect(screen.queryByText('Alice Smith')).not.toBeInTheDocument();
	});

	it('filters members by name using the search input', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		render(<MembersSettings />);

		await screen.findByText('Alice Smith');

		await user.type(
			screen.getByPlaceholderText(/Search by name, email, or role/i),
			'bob',
		);

		await screen.findByText('Bob Jones');
		expect(screen.queryByText('Alice Smith')).not.toBeInTheDocument();
		expect(screen.queryByText('charlie@signoz.io')).not.toBeInTheDocument();
	});

	it('opens EditMemberDrawer when a member row is clicked', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		render(<MembersSettings />);

		await user.click(await screen.findByText('Alice Smith'));

		await screen.findByText('Member Details');
	});

	it('opens InviteMembersModal when "Invite member" button is clicked', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		render(<MembersSettings />);

		await user.click(screen.getByRole('button', { name: /invite member/i }));

		expect(await screen.findAllByPlaceholderText('john@signoz.io')).toHaveLength(
			3,
		);
	});
});
