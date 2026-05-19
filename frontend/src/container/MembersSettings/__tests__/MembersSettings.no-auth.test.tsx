import type { TypesUserDTO } from 'api/generated/services/sigNoz.schemas';
import { rest, server } from 'mocks-server/server';
import { renderWithNoAuth } from 'tests/no-auth-test-utils';
import { screen } from 'tests/test-utils';

import MembersSettings from '../MembersSettings';

jest.mock('@signozhq/ui/sonner', () => ({
	...jest.requireActual('@signozhq/ui/sonner'),
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
];

describe('MembersSettings — no-auth mode', () => {
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

	it('renders the no-auth sentinel and disables the Invite member button', async () => {
		renderWithNoAuth(<MembersSettings />);

		await screen.findByText('Alice Smith');

		expect(screen.getByTestId('no-auth-invite-member')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /invite member/i })).toBeDisabled();
	});
});
