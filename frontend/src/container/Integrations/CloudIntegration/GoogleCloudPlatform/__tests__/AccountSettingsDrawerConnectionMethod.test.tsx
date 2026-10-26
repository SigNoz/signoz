import { ComponentProps } from 'react';
import { render, screen, userEvent, waitFor } from 'tests/test-utils';
import { rest, server } from 'mocks-server/server';
import { CloudAccount } from 'container/Integrations/types';

import AccountSettingsDrawer from '../EditAccount/AccountSettingsDrawer';
import {
	GCP_ACCOUNT_ID,
	GCP_ACCOUNTS_URL,
	gcpAccount,
	gcpAgentAccount,
	listAccountsResponse,
} from './mockData';

// `useAccountSettingsDrawer` imports logEvent by relative path, which the
// jest.config moduleNameMapper (keyed on the `api/common/logEvent` alias) does
// not intercept, so mock the resolved module directly.
jest.mock('../../../../../api/common/logEvent', () => ({
	__esModule: true,
	default: jest.fn(),
}));

type AccountSettingsDrawerProps = ComponentProps<typeof AccountSettingsDrawer>;

const onClose = jest.fn() as jest.MockedFunction<
	AccountSettingsDrawerProps['onClose']
>;
const setActiveAccount = jest.fn() as jest.MockedFunction<
	AccountSettingsDrawerProps['setActiveAccount']
>;

const renderDrawer = (account: CloudAccount = gcpAccount): void => {
	render(
		<AccountSettingsDrawer
			onClose={onClose}
			account={account}
			setActiveAccount={setActiveAccount}
		/>,
	);
};

describe('GCP AccountSettingsDrawer by connection method', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		server.use(
			rest.get(GCP_ACCOUNTS_URL, (_req, res, ctx) =>
				res(ctx.status(200), ctx.json(listAccountsResponse)),
			),
		);
	});

	it('disconnects the account with the GCP-specific confirmation copy', async () => {
		let disconnectedId: string | null = null;
		server.use(
			rest.delete(`${GCP_ACCOUNTS_URL}/:id`, (req, res, ctx) => {
				disconnectedId = req.params.id as string;
				return res(ctx.status(204));
			}),
		);

		const user = userEvent.setup();
		renderDrawer();

		await user.click(screen.getByRole('button', { name: /disconnect/i }));

		await expect(
			screen.findByText(/manually tear down/i),
		).resolves.toBeInTheDocument();

		await user.click(screen.getByRole('button', { name: /remove account/i }));

		await waitFor(() => {
			expect(disconnectedId).toBe(GCP_ACCOUNT_ID);
		});
		expect(setActiveAccount).toHaveBeenCalledWith(null);
		expect(onClose).toHaveBeenCalledTimes(1);
	});

	it('shows agent accounts read-only, since the backend rejects updates to them', () => {
		renderDrawer(gcpAgentAccount);

		expect(screen.getByTestId('gcp-agent-monitored-projects')).toHaveTextContent(
			'my-agent-project',
		);
		expect(
			screen.queryByTestId('gcp-edit-project-ids-select'),
		).not.toBeInTheDocument();
		expect(
			screen.queryByTestId('gcp-update-account-btn'),
		).not.toBeInTheDocument();
	});

	it('explains the agent-specific cleanup when disconnecting an agent account', async () => {
		const user = userEvent.setup();
		renderDrawer(gcpAgentAccount);

		await user.click(screen.getByRole('button', { name: /disconnect/i }));

		await expect(
			screen.findByText(/signoz-integration-bootstrap Infrastructure/i),
		).resolves.toBeInTheDocument();
		expect(screen.queryByText(/manually tear down/i)).not.toBeInTheDocument();
	});
});
