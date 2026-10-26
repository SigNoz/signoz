import { screen, userEvent, waitFor } from 'tests/test-utils';
import { rest, server } from 'mocks-server/server';

import {
	DEPLOYMENT_PROJECT_ID,
	fillAgentForm,
	onClose,
	onCommandGenerated,
	renderAgentSetup,
	mockAgentSetupApi,
	AgentSetupApiMock,
} from './agentSetupTestHelpers';
import {
	connectionCredentials,
	createAgentAccountResponse,
	GCP_ACCOUNTS_URL,
	gcpConnectionCommand,
} from '../../../__tests__/mockData';

// `useAgentAccountSetup` imports logEvent by relative path, which the
// jest.config moduleNameMapper (keyed on the `api/common/logEvent` alias) does
// not intercept, so mock the resolved module directly.
jest.mock('../../../../../../../api/common/logEvent', () => ({
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
			'SigNoz integration sets up everything needed',
		);
	});

	it('blocks submission and surfaces validation errors when the form is empty', async () => {
		const user = userEvent.setup();
		renderAgentSetup();

		await waitFor(() => {
			expect(screen.getByTestId('gcp-generate-command-btn')).toBeEnabled();
		});
		await user.click(screen.getByTestId('gcp-generate-command-btn'));

		await waitFor(() => {
			expect(
				screen.getByText('Please enter the deployment project ID'),
			).toBeInTheDocument();
		});
		expect(screen.getByText('Please select a region')).toBeInTheDocument();
		expect(api.createAccountPayload).toBeNull();
	});

	it('creates an agent account and shows its setup command', async () => {
		const user = userEvent.setup();
		renderAgentSetup();

		await fillAgentForm(user);
		await user.click(screen.getByTestId('gcp-generate-command-btn'));

		await waitFor(() => {
			expect(screen.getByTestId('gcp-agent-command')).toBeInTheDocument();
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

		expect(screen.getByTestId('gcp-agent-command')).toHaveTextContent(
			gcpConnectionCommand.cliCommand,
		);
		expect(screen.getByTestId('gcp-agent-command')).toHaveTextContent(
			DEPLOYMENT_PROJECT_ID,
		);

		expect(
			screen.queryByTestId('gcp-generate-command-btn'),
		).not.toBeInTheDocument();
		expect(
			screen.queryByTestId('gcp-deployment-project-id-input'),
		).not.toBeInTheDocument();
		expect(screen.getByRole('radiogroup')).toHaveAttribute(
			'aria-disabled',
			'true',
		);
		expect(onCommandGenerated).toHaveBeenCalledTimes(1);

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
		await user.click(screen.getByTestId('gcp-generate-command-btn'));

		await waitFor(() => {
			expect(screen.getByTestId('gcp-connect-error')).toHaveTextContent(
				'projectIds must contain only deploymentProjectId for GCP agent setup',
			);
		});
		expect(screen.queryByTestId('gcp-agent-command')).not.toBeInTheDocument();
		expect(screen.getByTestId('gcp-generate-command-btn')).toBeInTheDocument();
	});

	it('locks the connection method and keeps the submitted project while the command is generating', async () => {
		server.use(
			rest.post(GCP_ACCOUNTS_URL, (_req, res, ctx) =>
				res(ctx.delay(300), ctx.status(201), ctx.json(createAgentAccountResponse)),
			),
		);
		const user = userEvent.setup();
		renderAgentSetup();

		await fillAgentForm(user);
		await user.click(screen.getByTestId('gcp-generate-command-btn'));

		await waitFor(() => {
			expect(screen.getByRole('radiogroup')).toHaveAttribute(
				'aria-disabled',
				'true',
			);
		});

		await user.type(
			screen.getByTestId('gcp-deployment-project-id-input'),
			'-edited',
		);

		const commands = await screen.findByTestId('gcp-agent-command');
		expect(commands).toHaveTextContent(`signed in to ${DEPLOYMENT_PROJECT_ID}.`);
		expect(commands).not.toHaveTextContent(`${DEPLOYMENT_PROJECT_ID}-edited`);
	});
});
