import { ComponentProps } from 'react';
import { render, screen, userEvent, waitFor } from 'tests/test-utils';
import { rest, server } from 'mocks-server/server';

import CloudAccountSetupDrawer from '../AddNewAccount/CloudAccountSetupDrawer';
import {
	connectionCredentialsResponse,
	createAgentAccountResponse,
	GCP_ACCOUNTS_URL,
	GCP_AGENT_ACCOUNT_URL,
	GCP_CREDENTIALS_URL,
	pendingAgentAccountResponse,
} from './mockData';

// The setup hooks import logEvent by relative path, which the jest.config
// moduleNameMapper (keyed on the `api/common/logEvent` alias) does not
// intercept, so mock the resolved module directly.
jest.mock('../../../../../api/common/logEvent', () => ({
	__esModule: true,
	default: jest.fn(),
}));

const onClose = jest.fn() as jest.MockedFunction<
	ComponentProps<typeof CloudAccountSetupDrawer>['onClose']
>;

const renderDrawer = (): void => {
	render(<CloudAccountSetupDrawer onClose={onClose} />);
};

describe('GCP setup drawer connection method switch', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		server.use(
			rest.get(GCP_CREDENTIALS_URL, (_req, res, ctx) =>
				res(ctx.status(200), ctx.json(connectionCredentialsResponse)),
			),
			rest.post(GCP_ACCOUNTS_URL, (_req, res, ctx) =>
				res(ctx.status(201), ctx.json(createAgentAccountResponse)),
			),
			rest.get(GCP_AGENT_ACCOUNT_URL, (_req, res, ctx) =>
				res(ctx.status(200), ctx.json(pendingAgentAccountResponse)),
			),
		);
	});

	it('switches between the manual and agent connection methods inside the same drawer', async () => {
		const user = userEvent.setup();
		renderDrawer();

		const drawer = screen.getByTestId('gcp-setup-drawer');
		expect(screen.getByTestId('gcp-account-name-input')).toBeInTheDocument();
		expect(screen.getByTestId('gcp-connect-account-btn')).toBeInTheDocument();

		await user.click(screen.getByTestId('gcp-connection-method-agent'));

		await screen.findByTestId('gcp-generate-command-btn');
		expect(
			screen.queryByTestId('gcp-account-name-input'),
		).not.toBeInTheDocument();
		expect(
			screen.queryByTestId('gcp-connect-account-btn'),
		).not.toBeInTheDocument();

		await user.click(screen.getByTestId('gcp-connection-method-manual'));

		await screen.findByTestId('gcp-account-name-input');
		expect(
			screen.queryByTestId('gcp-generate-command-btn'),
		).not.toBeInTheDocument();

		// The drawer itself stays mounted, so it does not replay its open animation.
		expect(screen.getByTestId('gcp-setup-drawer')).toBe(drawer);
	});

	it('keeps the drawer width the same across connection methods and setup steps', async () => {
		const user = userEvent.setup();
		renderDrawer();

		const drawer = screen.getByTestId('gcp-setup-drawer');
		expect(drawer).toHaveAttribute('data-width', 'extra-wide');

		await user.click(screen.getByTestId('gcp-connection-method-agent'));
		await waitFor(() => {
			expect(screen.getByTestId('gcp-generate-command-btn')).toBeEnabled();
		});
		expect(drawer).toHaveAttribute('data-width', 'extra-wide');

		await user.type(
			screen.getByTestId('gcp-deployment-project-id-input'),
			'my-deployment-project-123',
		);
		await user.click(screen.getByTestId('gcp-deployment-region-select'));
		await user.click(await screen.findByText('Mumbai (asia-south1)'));
		await user.click(screen.getByTestId('gcp-generate-command-btn'));

		await screen.findByTestId('gcp-agent-command');
		expect(screen.getByTestId('gcp-setup-drawer')).toBe(drawer);
		expect(drawer).toHaveAttribute('data-width', 'extra-wide');
	});
});
