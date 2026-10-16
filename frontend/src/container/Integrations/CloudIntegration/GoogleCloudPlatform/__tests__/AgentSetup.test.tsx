import { QueryClient, QueryClientProvider } from 'react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TooltipProvider } from '@signozhq/ui/tooltip';
import { server } from 'mocks-server/server';
import { rest, RestRequest } from 'msw';

import AgentSetup from '../AddNewAccount/AgentSetup/AgentSetup';
import SetupDrawerLayout from '../AddNewAccount/SetupDrawerLayout';
import {
	connectionCredentials,
	connectionCredentialsResponse,
	connectedAgentAccountResponse,
	createAgentAccountResponse,
	GCP_ACCOUNTS_URL,
	GCP_AGENT_ACCOUNT_URL,
	GCP_CHECK_IN_URL,
	GCP_CREDENTIALS_URL,
	gcpConnectionCommands,
	pendingAgentAccountResponse,
} from './mockData';

// `useAgentAccountSetup` imports logEvent by relative path, which the
// jest.config moduleNameMapper (keyed on the `api/common/logEvent` alias) does
// not intercept, so mock the resolved module directly.
jest.mock('../../../../../api/common/logEvent', () => ({
	__esModule: true,
	default: jest.fn(),
}));

const DEPLOYMENT_PROJECT_ID = 'my-deployment-project-123';

const onClose = jest.fn();
const onConnectionMethodChange = jest.fn();
const onCommandsGenerated = jest.fn();

const renderAgentSetup = (): void => {
	// A fresh client per test keeps the polled account out of other tests' cache,
	// and no retries lets a failed poll surface immediately.
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	render(
		<QueryClientProvider client={queryClient}>
			<TooltipProvider>
				<SetupDrawerLayout isWide={false} onClose={onClose}>
					{(footerSlot): JSX.Element => (
						<AgentSetup
							footerSlot={footerSlot}
							onConnectionMethodChange={onConnectionMethodChange}
							onCommandsGenerated={onCommandsGenerated}
							onClose={onClose}
						/>
					)}
				</SetupDrawerLayout>
			</TooltipProvider>
		</QueryClientProvider>,
	);
};

const fillForm = async (
	user: ReturnType<typeof userEvent.setup>,
): Promise<void> => {
	await waitFor(() => {
		expect(screen.getByTestId('gcp-generate-commands-btn')).toBeEnabled();
	});
	await user.type(
		screen.getByTestId('gcp-deployment-project-id-input'),
		DEPLOYMENT_PROJECT_ID,
	);
	await user.click(screen.getByTestId('gcp-deployment-region-select'));
	await user.click(await screen.findByText('Mumbai (asia-south1)'));
};

describe('GCP AgentSetup', () => {
	let createAccountPayload: Record<string, unknown> | null;
	let checkInCalled: boolean;

	beforeEach(() => {
		jest.clearAllMocks();
		createAccountPayload = null;
		checkInCalled = false;

		server.use(
			rest.get(GCP_CREDENTIALS_URL, (_req, res, ctx) =>
				res(ctx.status(200), ctx.json(connectionCredentialsResponse)),
			),
			// check_in is registered first, it is a more specific path than
			// /accounts and msw matches handlers in registration order.
			rest.post(GCP_CHECK_IN_URL, (_req, res, ctx) => {
				checkInCalled = true;
				return res(ctx.status(200), ctx.json({ status: 'success', data: {} }));
			}),
			rest.post(GCP_ACCOUNTS_URL, async (req: RestRequest, res, ctx) => {
				createAccountPayload = await req.json();
				return res(ctx.status(201), ctx.json(createAgentAccountResponse));
			}),
			rest.get(GCP_AGENT_ACCOUNT_URL, (_req, res, ctx) =>
				res(ctx.status(200), ctx.json(pendingAgentAccountResponse)),
			),
		);
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
		expect(createAccountPayload).toBeNull();
	});

	it('creates an agent account and shows the setup commands in order', async () => {
		const user = userEvent.setup();
		renderAgentSetup();

		await fillForm(user);
		await user.click(screen.getByTestId('gcp-generate-commands-btn'));

		await waitFor(() => {
			expect(screen.getByTestId('gcp-agent-commands')).toBeInTheDocument();
		});

		expect(createAccountPayload).toStrictEqual({
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

		expect(checkInCalled).toBe(false);
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

		await fillForm(user);
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

		await fillForm(user);
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

	it('opens only the first step and walks through the rest with Next', async () => {
		const user = userEvent.setup();
		renderAgentSetup();

		await fillForm(user);
		await user.click(screen.getByTestId('gcp-generate-commands-btn'));
		await screen.findByTestId('gcp-agent-commands');

		const stepToggle = (step: number): HTMLElement =>
			screen.getByTestId(`gcp-agent-step-${step}-toggle`);

		expect(stepToggle(1)).toHaveAttribute('aria-expanded', 'true');
		expect(stepToggle(2)).toHaveAttribute('aria-expanded', 'false');
		expect(stepToggle(3)).toHaveAttribute('aria-expanded', 'false');
		expect(screen.getByTestId('gcp-agent-step-2')).not.toHaveTextContent(
			gcpConnectionCommands.createServiceAccountCommand,
		);

		await user.click(screen.getByTestId('gcp-agent-step-1-next'));

		expect(stepToggle(1)).toHaveAttribute('aria-expanded', 'false');
		expect(screen.getByTestId('gcp-agent-step-2')).toHaveTextContent(
			gcpConnectionCommands.createServiceAccountCommand,
		);

		await user.click(screen.getByTestId('gcp-agent-step-2-next'));

		expect(stepToggle(2)).toHaveAttribute('aria-expanded', 'false');
		expect(screen.getByTestId('gcp-agent-step-3')).toHaveTextContent(
			gcpConnectionCommands.cliCommand,
		);
		expect(screen.queryByTestId('gcp-agent-step-3-next')).not.toBeInTheDocument();
	});

	it('lets any step be expanded or collapsed directly', async () => {
		const user = userEvent.setup();
		renderAgentSetup();

		await fillForm(user);
		await user.click(screen.getByTestId('gcp-generate-commands-btn'));
		await screen.findByTestId('gcp-agent-commands');

		await user.click(screen.getByTestId('gcp-agent-step-3-toggle'));
		expect(screen.getByTestId('gcp-agent-step-3')).toHaveTextContent(
			gcpConnectionCommands.cliCommand,
		);
		expect(screen.getByTestId('gcp-agent-step-1')).toHaveTextContent(
			gcpConnectionCommands.createSecretsCommand,
		);

		await user.click(screen.getByTestId('gcp-agent-step-1-toggle'));
		expect(screen.getByTestId('gcp-agent-step-1')).not.toHaveTextContent(
			gcpConnectionCommands.createSecretsCommand,
		);
	});

	it('waits for the agent after showing the commands', async () => {
		const user = userEvent.setup();
		renderAgentSetup();

		await fillForm(user);
		await user.click(screen.getByTestId('gcp-generate-commands-btn'));

		await screen.findByTestId('gcp-agent-waiting');
		expect(
			screen.queryByTestId('gcp-check-connection-btn'),
		).not.toBeInTheDocument();
		expect(onClose).not.toHaveBeenCalled();
	});

	it('closes the drawer once the agent checks in', async () => {
		server.use(
			rest.get(GCP_AGENT_ACCOUNT_URL, (_req, res, ctx) =>
				res(ctx.status(200), ctx.json(connectedAgentAccountResponse)),
			),
		);
		const user = userEvent.setup();
		renderAgentSetup();

		await fillForm(user);
		await user.click(screen.getByTestId('gcp-generate-commands-btn'));

		await waitFor(() => {
			expect(onClose).toHaveBeenCalledTimes(1);
		});
	});

	it('reports a timeout and lets the user check again', async () => {
		const realNow = Date.now.bind(Date);
		let clockOffset = 0;
		const nowSpy = jest
			.spyOn(Date, 'now')
			.mockImplementation(() => realNow() + clockOffset);

		let pollCount = 0;
		server.use(
			rest.get(GCP_AGENT_ACCOUNT_URL, (_req, res, ctx) => {
				pollCount += 1;
				if (pollCount === 1) {
					// Polling started before this response, so jumping the clock
					// past the 10 minute window makes this first poll time out.
					clockOffset += 11 * 60 * 1000;
					return res(ctx.status(200), ctx.json(pendingAgentAccountResponse));
				}
				return res(ctx.status(200), ctx.json(connectedAgentAccountResponse));
			}),
		);

		try {
			const user = userEvent.setup();
			renderAgentSetup();

			await fillForm(user);
			await user.click(screen.getByTestId('gcp-generate-commands-btn'));

			await screen.findByTestId('gcp-agent-connection-error');
			expect(onClose).not.toHaveBeenCalled();

			await user.click(screen.getByTestId('gcp-check-connection-btn'));

			await waitFor(() => {
				expect(onClose).toHaveBeenCalledTimes(1);
			});
		} finally {
			nowSpy.mockRestore();
		}
	});

	it('shows a retryable error when the connection status cannot be fetched', async () => {
		server.use(
			rest.get(GCP_AGENT_ACCOUNT_URL, (_req, res, ctx) =>
				res(ctx.status(500), ctx.json({ status: 'error' })),
			),
		);
		const user = userEvent.setup();
		renderAgentSetup();

		await fillForm(user);
		await user.click(screen.getByTestId('gcp-generate-commands-btn'));

		await screen.findByTestId('gcp-agent-connection-error');
		expect(screen.getByTestId('gcp-check-connection-btn')).toBeInTheDocument();
		expect(onClose).not.toHaveBeenCalled();
	});
});
