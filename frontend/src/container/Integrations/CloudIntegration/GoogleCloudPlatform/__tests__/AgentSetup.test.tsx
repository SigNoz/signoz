import { screen, userEvent, waitFor } from 'tests/test-utils';
import { rest, server } from 'mocks-server/server';

import {
	DEPLOYMENT_PROJECT_ID,
	fillAgentForm,
	onClose,
	onCommandsGenerated,
	renderAgentSetup,
	mockAgentSetupApi,
	AgentSetupApiMock,
} from './agentSetupTestHelpers';
import {
	connectionCredentials,
	createAgentAccountResponse,
	GCP_ACCOUNTS_URL,
	gcpConnectionCommands,
} from './mockData';

// `useAgentAccountSetup` imports logEvent by relative path, which the
// jest.config moduleNameMapper (keyed on the `api/common/logEvent` alias) does
// not intercept, so mock the resolved module directly.
jest.mock('../../../../../api/common/logEvent', () => ({
	__esModule: true,
	default: jest.fn(),
}));

describe('GCP AgentSetup form', () => {
	let api: AgentSetupApiMock;

	beforeEach(() => {
		jest.clearAllMocks();
		api = mockAgentSetupApi();
	});

	it('asks only for the deployment project, region and credentials', async () => {
		renderAgentSetup();

		await waitFor(() => {
			expect(screen.getByTestId('gcp-signoz-api-url-input')).toHaveTextContent(
				connectionCredentials.sigNozApiUrl,
			);
		});

		expect(
			screen.getByTestId('gcp-deployment-project-id-input'),
		).toBeInTheDocument();
		expect(
			screen.getByTestId('gcp-deployment-region-select'),
		).toBeInTheDocument();
		expect(
			screen.queryByTestId('gcp-account-name-input'),
		).not.toBeInTheDocument();
		expect(document.querySelector('#gcp-project-ids-select')).toBeNull();
		expect(screen.getByTestId('gcp-setup-guide-callout')).toHaveTextContent(
			'how the SigNoz agent integration works',
		);
	});

	it('blocks submission and surfaces validation errors when the form is empty', async () => {
		const user = userEvent.setup();
		renderAgentSetup();

		await waitFor(() => {
			expect(screen.getByTestId('gcp-generate-commands-btn')).toBeEnabled();
		});
		await user.click(screen.getByTestId('gcp-generate-commands-btn'));

		await waitFor(() => {
			expect(
				screen.getByText('Please enter the deployment project ID'),
			).toBeInTheDocument();
		});
		expect(screen.getByText('Please select a region')).toBeInTheDocument();
		expect(api.createAccountPayload).toBeNull();
	});

	it('creates an agent account and shows the setup commands in order', async () => {
		const user = userEvent.setup();
		renderAgentSetup();

		await fillAgentForm(user);
		await user.click(screen.getByTestId('gcp-generate-commands-btn'));

		await waitFor(() => {
			expect(screen.getByTestId('gcp-agent-commands')).toBeInTheDocument();
		});

		expect(api.createAccountPayload).toStrictEqual({
			config: {
				gcp: {
					connectionMethod: 'agent',
					deploymentRegion: 'asia-south1',
					deploymentProjectId: DEPLOYMENT_PROJECT_ID,
					projectIds: [DEPLOYMENT_PROJECT_ID],
				},
			},
			credentials: connectionCredentials,
		});

		expect(screen.getByTestId('gcp-agent-step-1')).toHaveTextContent(
			gcpConnectionCommands.createSecretsCommand,
		);
		expect(screen.getByTestId('gcp-agent-commands')).toHaveTextContent(
			DEPLOYMENT_PROJECT_ID,
		);

		expect(
			screen.queryByTestId('gcp-generate-commands-btn'),
		).not.toBeInTheDocument();
		expect(
			screen.queryByTestId('gcp-deployment-project-id-input'),
		).not.toBeInTheDocument();
		expect(screen.getByTestId('gcp-connection-method-manual')).toBeDisabled();
		expect(onCommandsGenerated).toHaveBeenCalledTimes(1);

		expect(api.checkInCalled).toBe(false);
		expect(onClose).not.toHaveBeenCalled();
	});

	it('shows the backend error inline and keeps the form when creation fails', async () => {
		server.use(
			rest.post(GCP_ACCOUNTS_URL, (_req, res, ctx) =>
				res(
					ctx.status(400),
					ctx.json({
						status: 'error',
						error: {
							message:
								'projectIds must contain only deploymentProjectId for GCP agent setup',
						},
					}),
				),
			),
		);

		const user = userEvent.setup();
		renderAgentSetup();

		await fillAgentForm(user);
		await user.click(screen.getByTestId('gcp-generate-commands-btn'));

		await waitFor(() => {
			expect(screen.getByTestId('gcp-connect-error')).toHaveTextContent(
				'projectIds must contain only deploymentProjectId for GCP agent setup',
			);
		});
		expect(screen.queryByTestId('gcp-agent-commands')).not.toBeInTheDocument();
		expect(screen.getByTestId('gcp-generate-commands-btn')).toBeInTheDocument();
	});

	it('locks the connection method and keeps the submitted project while commands are generating', async () => {
		server.use(
			rest.post(GCP_ACCOUNTS_URL, (_req, res, ctx) =>
				res(ctx.delay(300), ctx.status(201), ctx.json(createAgentAccountResponse)),
			),
		);
		const user = userEvent.setup();
		renderAgentSetup();

		await fillAgentForm(user);
		await user.click(screen.getByTestId('gcp-generate-commands-btn'));

		await waitFor(() => {
			expect(screen.getByTestId('gcp-connection-method-manual')).toBeDisabled();
		});

		await user.type(
			screen.getByTestId('gcp-deployment-project-id-input'),
			'-edited',
		);

		const commands = await screen.findByTestId('gcp-agent-commands');
		expect(commands).toHaveTextContent(`signed in to ${DEPLOYMENT_PROJECT_ID}.`);
		expect(commands).not.toHaveTextContent(`${DEPLOYMENT_PROJECT_ID}-edited`);
	});
});
