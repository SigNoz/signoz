import type { TypesUserDTO } from 'api/generated/services/sigNoz.schemas';
import { rest, server } from 'mocks-server/server';
import { render, screen, userEvent } from 'tests/test-utils';

import MembersSettings from '../MembersSettings';

jest.mock('@signozhq/ui', () => ({
	...jest.requireActual('@signozhq/ui'),
	toast: {
		success: jest.fn(),
		error: jest.fn(),
	},
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

describe('MembersSettings (integration)', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		server.use(
			rest.get(USERS_ENDPOINT, (_, res, ctx) =>
				res(ctx.status(200), ctx.json({ data: mockUsers })),
			),
		);
	});

	afterEach(() => {
		server.resetHandlers();
	});

	it('loads and displays active users, pending invites, and deleted members', async () => {
		render(<MembersSettings />);

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
			screen.getByPlaceholderText(/Search by name or email/i),
			'bob',
		);

		await screen.findByText('Bob Jones');
		expect(screen.queryByText('Alice Smith')).not.toBeInTheDocument();
		expect(screen.queryByText('charlie@signoz.io')).not.toBeInTheDocument();
	});

	it('opens EditMemberDrawer when an active member row is clicked', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		render(<MembersSettings />);

		await user.click(await screen.findByText('Alice Smith'));

		await screen.findByText('Member Details');
	});

	it('opens EditMemberDrawer when a deleted member row is clicked', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		render(<MembersSettings />);

		await user.click(await screen.findByText('Dave Deleted'));

		expect(screen.queryByText('Member Details')).toBeInTheDocument();
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
