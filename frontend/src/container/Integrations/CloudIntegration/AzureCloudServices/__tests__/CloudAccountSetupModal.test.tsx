import { ComponentProps } from 'react';
import { render, screen, userEvent, waitFor, within } from 'tests/test-utils';
import { rest, server } from 'mocks-server/server';
import { RestRequest } from 'msw';
import type logEvent from '../../../../../api/common/logEvent';

import CloudAccountSetupModal from '../AddNewAccount/CloudAccountSetupModal';

// `useIntegrationModal` imports logEvent by relative path, which the
// jest.config moduleNameMapper (keyed on the `api/common/logEvent` alias) does
// not intercept, so mock the resolved module directly.
jest.mock('../../../../../api/common/logEvent', () => ({
	__esModule: true,
	default: jest.fn() as jest.MockedFunction<typeof logEvent>,
}));

type OnClose = ComponentProps<typeof CloudAccountSetupModal>['onClose'];

const mockOnClose = (): jest.MockedFunction<OnClose> =>
	jest.fn() as jest.MockedFunction<OnClose>;

const AZURE_CREDENTIALS_URL =
	'http://localhost/api/v1/cloud_integrations/azure/credentials';
const AZURE_ACCOUNTS_URL =
	'http://localhost/api/v1/cloud_integrations/azure/accounts';
const ACCOUNT_ID = 'ci-azure-1234';

const credentials = {
	sigNozApiUrl: 'https://signoz.example.com',
	sigNozApiKey: 'signoz-api-key',
	ingestionUrl: 'https://ingest.example.com',
	ingestionKey: 'ingestion-key',
};

const cliCommand = `curl -fsSL 'https://signoz.io/foundry.sh' | bash -s -- cloudintegration azure bicep --region 'australiaeast'`;

const mockApi = ({ failFirstPoll = false } = {}): {
	createAccountPayload: unknown;
	pollCount: () => number;
} => {
	let polls = 0;
	const api = {
		createAccountPayload: null as unknown,
		pollCount: (): number => polls,
	};

	server.use(
		rest.get(AZURE_CREDENTIALS_URL, (_req, res, ctx) =>
			res(ctx.status(200), ctx.json({ status: 'success', data: credentials })),
		),
		rest.post(AZURE_ACCOUNTS_URL, async (req: RestRequest, res, ctx) => {
			api.createAccountPayload = await req.json();
			return res(
				ctx.status(201),
				ctx.json({
					status: 'success',
					data: { id: ACCOUNT_ID, connectionArtifact: { azure: { cliCommand } } },
				}),
			);
		}),
		rest.get(`${AZURE_ACCOUNTS_URL}/${ACCOUNT_ID}`, (_req, res, ctx) => {
			polls += 1;
			if (failFirstPoll && polls === 1) {
				return res(ctx.status(500), ctx.json({ status: 'error' }));
			}
			return res(
				ctx.status(200),
				ctx.json({
					status: 'success',
					data: {
						id: ACCOUNT_ID,
						providerAccountId: null,
						agentReport: null,
						removedAt: null,
					},
				}),
			);
		}),
	);

	return api;
};

type User = ReturnType<typeof userEvent.setup>;

const antdSelectInput = (testId: string): HTMLElement =>
	within(screen.getByTestId(testId)).getByRole('combobox', { hidden: true });

const generateCommand = async (user: User): Promise<void> => {
	await screen.findByTestId('azure-deployment-region-select');
	await user.click(antdSelectInput('azure-deployment-region-select'));
	await user.click(await screen.findByText('Australia East (australiaeast)'));
	await user.click(antdSelectInput('azure-resource-groups-select'));
	// antd reads the legacy keyCode on Enter, which user-event leaves at 0, so
	// commit the tag with the select's comma separator instead.
	await user.paste('prod-platform-rg,');
	await user.click(screen.getByTestId('azure-generate-command-btn'));
	await screen.findByTestId('azure-agent-command');
};

describe('Azure CloudAccountSetupModal', () => {
	it('creates the account and shows its setup command', async () => {
		const api = mockApi();
		const user = userEvent.setup();

		render(<CloudAccountSetupModal onClose={mockOnClose()} />);

		await generateCommand(user);

		expect(screen.getByTestId('azure-agent-command')).toHaveTextContent(
			cliCommand,
		);
		expect(api.createAccountPayload).toStrictEqual({
			config: {
				azure: {
					deploymentRegion: 'australiaeast',
					resourceGroups: ['prod-platform-rg'],
				},
			},
			credentials,
		});
		expect(
			screen.queryByTestId('azure-generate-command-btn'),
		).not.toBeInTheDocument();
		expect(
			screen.queryByTestId('azure-deployment-region-select'),
		).not.toBeInTheDocument();
		expect(
			screen.queryByTestId('azure-resource-groups-select'),
		).not.toBeInTheDocument();
		expect(
			screen.getByText(/waiting for azure account connection/i),
		).toBeInTheDocument();
	});

	it('asks before closing once a setup command exists', async () => {
		mockApi();
		const user = userEvent.setup();
		const onClose = mockOnClose();

		render(<CloudAccountSetupModal onClose={onClose} />);

		await generateCommand(user);

		await user.click(screen.getByTestId('azure-cancel-btn'));
		await user.click(await screen.findByTestId('azure-continue-setup-btn'));
		await waitFor(() => {
			expect(
				screen.queryByTestId('azure-continue-setup-btn'),
			).not.toBeInTheDocument();
		});
		expect(onClose).not.toHaveBeenCalled();

		await user.click(screen.getByTestId('azure-cancel-btn'));
		await user.click(await screen.findByTestId('azure-close-setup-btn'));
		expect(onClose).toHaveBeenCalledTimes(1);
	});

	it('closes without asking before a setup command exists', async () => {
		mockApi();
		const user = userEvent.setup();
		const onClose = mockOnClose();

		render(<CloudAccountSetupModal onClose={onClose} />);

		await user.click(await screen.findByTestId('azure-cancel-btn'));

		expect(onClose).toHaveBeenCalledTimes(1);
		expect(screen.queryByTestId('azure-close-setup-btn')).not.toBeInTheDocument();
	});

	it('resumes polling with Check Again after the connection check fails', async () => {
		const api = mockApi({ failFirstPoll: true });
		const user = userEvent.setup();

		render(<CloudAccountSetupModal onClose={mockOnClose()} />);

		await generateCommand(user);

		await user.click(await screen.findByTestId('azure-check-connection-btn'));

		await waitFor(() => expect(api.pollCount()).toBe(2));

		await screen.findByText(/waiting for azure account connection/i);
		expect(
			screen.queryByTestId('azure-check-connection-btn'),
		).not.toBeInTheDocument();
		expect(screen.getByTestId('azure-agent-command')).toHaveTextContent(
			cliCommand,
		);
	});
});
