import { ComponentProps } from 'react';
import { render, screen, userEvent, waitFor, within } from 'tests/test-utils';
import { NO_DELAY_USER_EVENT } from 'tests/noDelayUserEvent';
import { rest, server } from 'mocks-server/server';
import { RestRequest } from 'msw';
import type { Region } from 'utils/regions';
import type logEvent from '../../../../../api/common/logEvent';

import CloudAccountSetupModal from '../AddNewAccount/CloudAccountSetupModal';

// `useIntegrationModal` imports logEvent by relative path, which the
// jest.config moduleNameMapper (keyed on the `api/common/logEvent` alias) does
// not intercept, so mock the resolved module directly.
jest.mock('../../../../../api/common/logEvent', () => ({
	__esModule: true,
	default: jest.fn() as jest.MockedFunction<typeof logEvent>,
}));

jest.mock('utils/regions', () => {
	const regions: Region[] = [
		{
			id: 'north-america',
			name: 'North America',
			subRegions: [
				{
					id: 'us-east-1',
					name: 'us-east-1',
					displayName: 'US East (N. Virginia)',
				},
				{ id: 'us-east-2', name: 'us-east-2', displayName: 'US East (Ohio)' },
			],
		},
	];
	return { regions };
});

type OnClose = ComponentProps<typeof CloudAccountSetupModal>['onClose'];

const mockOnClose = (): jest.MockedFunction<OnClose> =>
	jest.fn() as jest.MockedFunction<OnClose>;

const AWS_CREDENTIALS_URL =
	'http://localhost/api/v1/cloud_integrations/aws/credentials';
const AWS_ACCOUNTS_URL =
	'http://localhost/api/v1/cloud_integrations/aws/accounts';
const ACCOUNT_ID = 'ci-aws-1234';

const credentials = {
	sigNozApiUrl: 'https://signoz.example.com',
	sigNozApiKey: 'signoz-api-key',
	ingestionUrl: 'https://ingest.example.com',
	ingestionKey: 'ingestion-key',
};

const cliCommand = `curl -fsSL 'https://signoz.io/foundry.sh' | bash -s -- cloudintegration aws cloudformation --region 'us-east-1'`;

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
		rest.get(AWS_CREDENTIALS_URL, (_req, res, ctx) =>
			res(ctx.status(200), ctx.json({ status: 'success', data: credentials })),
		),
		rest.post(AWS_ACCOUNTS_URL, async (req: RestRequest, res, ctx) => {
			api.createAccountPayload = await req.json();
			return res(
				ctx.status(201),
				ctx.json({
					status: 'success',
					data: { id: ACCOUNT_ID, connectionArtifact: { aws: { cliCommand } } },
				}),
			);
		}),
		rest.get(`${AWS_ACCOUNTS_URL}/${ACCOUNT_ID}`, (_req, res, ctx) => {
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

const generateCommand = async (user: User): Promise<void> => {
	const select = await screen.findByTestId('aws-deployment-region-select');
	await user.click(within(select).getByRole('combobox', { hidden: true }));
	await user.click(await screen.findByText('US East (N. Virginia)'));
	await user.click(screen.getByTestId('aws-region-us-east-1'));
	await user.click(screen.getByTestId('aws-generate-command-btn'));
	await screen.findByTestId('aws-agent-command');
};

describe('AWS CloudAccountSetupModal', () => {
	it('creates the account and shows its setup command', async () => {
		const api = mockApi();
		const openSpy = jest.spyOn(window, 'open').mockImplementation(() => null);
		const user = userEvent.setup(NO_DELAY_USER_EVENT);

		render(<CloudAccountSetupModal onClose={mockOnClose()} />);

		await generateCommand(user);

		expect(screen.getByTestId('aws-agent-command')).toHaveTextContent(cliCommand);
		expect(api.createAccountPayload).toStrictEqual({
			config: { aws: { deploymentRegion: 'us-east-1', regions: ['us-east-1'] } },
			credentials,
		});
		expect(
			screen.queryByTestId('aws-generate-command-btn'),
		).not.toBeInTheDocument();
		expect(
			screen.queryByTestId('aws-deployment-region-select'),
		).not.toBeInTheDocument();
		expect(screen.getByTestId('cloud-connect-waiting')).toHaveTextContent(
			/waiting for connection/i,
		);
		expect(openSpy).not.toHaveBeenCalled();

		openSpy.mockRestore();
	});

	it('asks before closing once a setup command exists', async () => {
		mockApi();
		const user = userEvent.setup(NO_DELAY_USER_EVENT);
		const onClose = mockOnClose();

		render(<CloudAccountSetupModal onClose={onClose} />);

		await generateCommand(user);

		await user.click(screen.getByTestId('aws-cancel-btn'));
		await user.click(await screen.findByTestId('aws-continue-setup-btn'));
		await waitFor(() => {
			expect(
				screen.queryByTestId('aws-continue-setup-btn'),
			).not.toBeInTheDocument();
		});
		expect(onClose).not.toHaveBeenCalled();

		await user.click(screen.getByTestId('aws-cancel-btn'));
		await user.click(await screen.findByTestId('aws-close-setup-btn'));
		expect(onClose).toHaveBeenCalledTimes(1);
	});

	it('closes without asking before a setup command exists', async () => {
		mockApi();
		const user = userEvent.setup(NO_DELAY_USER_EVENT);
		const onClose = mockOnClose();

		render(<CloudAccountSetupModal onClose={onClose} />);

		await user.click(await screen.findByTestId('aws-cancel-btn'));

		expect(onClose).toHaveBeenCalledTimes(1);
		expect(screen.queryByTestId('aws-close-setup-btn')).not.toBeInTheDocument();
	});

	it('resumes polling with Check Again after the connection check fails', async () => {
		const api = mockApi({ failFirstPoll: true });
		const user = userEvent.setup(NO_DELAY_USER_EVENT);

		render(<CloudAccountSetupModal onClose={mockOnClose()} />);

		await generateCommand(user);

		await user.click(await screen.findByTestId('aws-check-connection-btn'));

		await waitFor(() => expect(api.pollCount()).toBe(2));

		await expect(
			screen.findByTestId('cloud-connect-waiting'),
		).resolves.toHaveTextContent(/waiting for connection/i);
		expect(
			screen.queryByTestId('aws-check-connection-btn'),
		).not.toBeInTheDocument();
		expect(screen.getByTestId('aws-agent-command')).toHaveTextContent(cliCommand);
	});
});
