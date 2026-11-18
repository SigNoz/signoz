import { ComponentProps } from 'react';
import { render, screen, userEvent, waitFor } from 'tests/test-utils';
import { rest, server } from 'mocks-server/server';

import CloudAccountSetupDrawer from '../AddNewAccount/CloudAccountSetupDrawer';
import {
	connectedAgentAccountResponse,
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

const generateAgentCommand = async (
	user: ReturnType<typeof userEvent.setup>,
): Promise<void> => {
	await user.click(screen.getByTestId('gcp-connection-method-agent'));
	await waitFor(() => {
		expect(screen.getByTestId('gcp-generate-command-btn')).toBeEnabled();
	});
	await user.type(
		screen.getByTestId('gcp-deployment-project-id-input'),
		'my-deployment-project-123',
	);
	await user.click(screen.getByTestId('gcp-deployment-region-select'));
	await user.click(await screen.findByText('Mumbai (asia-south1)'));
	await user.click(screen.getByTestId('gcp-generate-command-btn'));
	await screen.findByTestId('gcp-agent-command');
};

describe('GCP setup drawer close confirmation', () => {
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

	it('closes right away when no setup command has been generated', async () => {
		const user = userEvent.setup();
		renderDrawer();

		await user.click(screen.getByTestId('gcp-connection-method-agent'));
		await user.click(screen.getByTestId('gcp-cancel-btn'));

		expect(onClose).toHaveBeenCalledTimes(1);
		expect(screen.queryByTestId('gcp-close-setup-btn')).not.toBeInTheDocument();
	});

	it('asks before cancelling a pending agent setup and can continue it', async () => {
		const user = userEvent.setup();
		renderDrawer();

		await generateAgentCommand(user);
		await user.click(screen.getByTestId('gcp-cancel-btn'));

		await screen.findByText(/start the installation process again/i);
		expect(onClose).not.toHaveBeenCalled();

		await user.click(screen.getByTestId('gcp-continue-setup-btn'));

		await waitFor(() => {
			expect(
				screen.queryByText(/start the installation process again/i),
			).not.toBeInTheDocument();
		});
		expect(screen.getByTestId('gcp-agent-command')).toBeInTheDocument();
		expect(onClose).not.toHaveBeenCalled();
	});

	it('closes the drawer once the user confirms', async () => {
		const user = userEvent.setup();
		renderDrawer();

		await generateAgentCommand(user);
		await user.click(screen.getByRole('button', { name: 'Close' }));
		await user.click(await screen.findByTestId('gcp-close-setup-btn'));

		await waitFor(() => {
			expect(onClose).toHaveBeenCalledTimes(1);
		});
	});

	it('closes without asking once the agent connects', async () => {
		server.use(
			rest.get(GCP_AGENT_ACCOUNT_URL, (_req, res, ctx) =>
				res(ctx.status(200), ctx.json(connectedAgentAccountResponse)),
			),
		);
		const user = userEvent.setup();
		renderDrawer();

		await generateAgentCommand(user);

		await waitFor(() => {
			expect(onClose).toHaveBeenCalledTimes(1);
		});
		expect(
			screen.queryByText(/start the installation process again/i),
		).not.toBeInTheDocument();
	});
});
