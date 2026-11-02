import { ComponentProps } from 'react';
import { render, screen, userEvent, waitFor } from 'tests/test-utils';
import { rest, server } from 'mocks-server/server';
import { RestRequest } from 'msw';

import AgentSetup from '../AgentSetup';
import SetupDrawerLayout from '../../SetupDrawerLayout';
import {
	connectionCredentialsResponse,
	createAgentAccountResponse,
	GCP_ACCOUNTS_URL,
	GCP_AGENT_ACCOUNT_URL,
	GCP_CHECK_IN_URL,
	GCP_CREDENTIALS_URL,
	pendingAgentAccountResponse,
} from '../../../__tests__/mockData';

export const DEPLOYMENT_PROJECT_ID = 'my-deployment-project-123';

type AgentSetupProps = ComponentProps<typeof AgentSetup>;

export const onClose = jest.fn() as jest.MockedFunction<
	AgentSetupProps['onClose']
>;
export const onConnectionMethodChange = jest.fn() as jest.MockedFunction<
	AgentSetupProps['onConnectionMethodChange']
>;
export const onCommandGenerated = jest.fn() as jest.MockedFunction<
	AgentSetupProps['onCommandGenerated']
>;
export const onCancel = jest.fn() as jest.MockedFunction<
	AgentSetupProps['onCancel']
>;

export const renderAgentSetup = (): void => {
	render(
		<SetupDrawerLayout onClose={onClose}>
			{(footerSlot): JSX.Element => (
				<AgentSetup
					footerSlot={footerSlot}
					onConnectionMethodChange={onConnectionMethodChange}
					onCommandGenerated={onCommandGenerated}
					onCancel={onCancel}
					onClose={onClose}
				/>
			)}
		</SetupDrawerLayout>,
	);
};

export const fillAgentForm = async (
	user: ReturnType<typeof userEvent.setup>,
): Promise<void> => {
	await waitFor(() => {
		expect(screen.getByTestId('gcp-generate-command-btn')).toBeEnabled();
	});
	await user.type(
		screen.getByTestId('gcp-deployment-project-id-input'),
		DEPLOYMENT_PROJECT_ID,
	);
	await user.click(screen.getByTestId('gcp-deployment-region-select'));
	await user.click(await screen.findByText('Mumbai (asia-south1)'));
};

export interface AgentSetupApiMock {
	readonly createAccountPayload: Record<string, unknown> | null;
	readonly checkInCalled: boolean;
}

/** Registers the agent setup endpoints; the polled account stays pending. */
export const mockAgentSetupApi = (): AgentSetupApiMock => {
	let createAccountPayload: Record<string, unknown> | null = null;
	let checkInCalled = false;

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

	return {
		get createAccountPayload(): Record<string, unknown> | null {
			return createAccountPayload;
		},
		get checkInCalled(): boolean {
			return checkInCalled;
		},
	};
};
