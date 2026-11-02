import { screen, userEvent, waitFor } from 'tests/test-utils';
import { rest, server } from 'mocks-server/server';

import {
	fillAgentForm,
	onClose,
	renderAgentSetup,
	mockAgentSetupApi,
} from './agentSetupTestHelpers';
import {
	connectedAgentAccountResponse,
	GCP_AGENT_ACCOUNT_URL,
	pendingAgentAccountResponse,
} from '../../../__tests__/mockData';

// `useAgentAccountSetup` imports logEvent by relative path, which the
// jest.config moduleNameMapper (keyed on the `api/common/logEvent` alias) does
// not intercept, so mock the resolved module directly.
jest.mock('../../../../../../../api/common/logEvent', () => ({
	__esModule: true,
	default: jest.fn(),
}));

describe('GCP AgentSetup connection polling', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockAgentSetupApi();
	});

	it('waits for the agent after showing the command', async () => {
		const user = userEvent.setup();
		renderAgentSetup();

		await fillAgentForm(user);
		await user.click(screen.getByTestId('gcp-generate-command-btn'));

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

		await fillAgentForm(user);
		await user.click(screen.getByTestId('gcp-generate-command-btn'));

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

			await fillAgentForm(user);
			await user.click(screen.getByTestId('gcp-generate-command-btn'));

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

		await fillAgentForm(user);
		await user.click(screen.getByTestId('gcp-generate-command-btn'));

		await screen.findByTestId('gcp-agent-connection-error');
		expect(screen.getByTestId('gcp-check-connection-btn')).toBeInTheDocument();
		expect(onClose).not.toHaveBeenCalled();
	});
});
