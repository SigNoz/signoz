import { listRolesSuccessResponse } from 'mocks-server/__mockdata__/roles';
import { rest, server } from 'mocks-server/server';
import { useAuthZ } from 'hooks/useAuthZ/useAuthZ';
import { mockUseAuthZGrantAll } from 'tests/authz-test-utils';
import { renderWithNoAuth } from 'tests/no-auth-test-utils';
import { screen } from 'tests/test-utils';

import RolesSettings from '../RolesSettings';

jest.mock('hooks/useAuthZ/useAuthZ');
const mockUseAuthZ = useAuthZ as jest.MockedFunction<typeof useAuthZ>;

const ROLES_ENDPOINT = '*/api/v1/roles';

describe('RolesSettings — no-auth mode', () => {
	beforeEach(() => {
		mockUseAuthZ.mockImplementation(mockUseAuthZGrantAll);
		server.use(
			rest.get(ROLES_ENDPOINT, (_req, res, ctx) =>
				res(ctx.status(200), ctx.json(listRolesSuccessResponse)),
			),
		);
	});

	afterEach(() => {
		jest.clearAllMocks();
		server.resetHandlers();
	});

	it('renders the no-auth sentinel for the Custom role button', async () => {
		renderWithNoAuth(<RolesSettings />);

		await screen.findByText('signoz-admin');

		expect(screen.getByTestId('no-auth-create-custom-role')).toBeInTheDocument();
	});
});
