import { render, screen, userEvent, waitFor } from 'tests/test-utils';
import { rest, server } from 'mocks-server/server';
import { RestRequest } from 'msw';

import CloudAccountSetupModal from '../AddNewAccount/CloudAccountSetupModal';

// `useIntegrationModal` imports logEvent by relative path, which the
// jest.config moduleNameMapper (keyed on the `api/common/logEvent` alias) does
// not intercept, so mock the resolved module directly.
jest.mock('../../../../../api/common/logEvent', () => ({
	__esModule: true,
	default: jest.fn(),
}));

// The form flow drives antd selects and typing, which outruns the 5s default on CI.
jest.setTimeout(15_000);

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

describe('AWS CloudAccountSetupModal', () => {
	it('creates the account and shows its setup command', async () => {
		const api = mockApi();
		const openSpy = jest.spyOn(window, 'open').mockImplementation(() => null);
		const user = userEvent.setup();
		const onClose = jest.fn();

		render(<CloudAccountSetupModal onClose={onClose} />);

		await user.click(await screen.findByRole('combobox'));
		await user.click(await screen.findByText('US East (N. Virginia)'));
		await user.click(await screen.findByRole('checkbox', { name: /us-east-1/i }));
		await user.click(screen.getByTestId('aws-generate-command-btn'));

		await waitFor(() => {
			expect(screen.getByTestId('aws-agent-command')).toHaveTextContent(
				cliCommand,
			);
		});

		expect(api.createAccountPayload).toStrictEqual({
			config: { aws: { deploymentRegion: 'us-east-1', regions: ['us-east-1'] } },
			credentials,
		});
		expect(
			screen.queryByTestId('aws-generate-command-btn'),
		).not.toBeInTheDocument();
		expect(screen.queryAllByRole('combobox')).toHaveLength(0);
		expect(screen.getByText(/waiting for connection/i)).toBeInTheDocument();
		expect(openSpy).not.toHaveBeenCalled();

		openSpy.mockRestore();

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
		const user = userEvent.setup();
		const onClose = jest.fn();

		render(<CloudAccountSetupModal onClose={onClose} />);

		await user.click(await screen.findByTestId('aws-cancel-btn'));

		expect(onClose).toHaveBeenCalledTimes(1);
		expect(screen.queryByTestId('aws-close-setup-btn')).not.toBeInTheDocument();
	});

	it('resumes polling with Check Again after the connection check fails', async () => {
		const api = mockApi({ failFirstPoll: true });
		const user = userEvent.setup();

		render(<CloudAccountSetupModal onClose={jest.fn()} />);

		await user.click(await screen.findByRole('combobox'));
		await user.click(await screen.findByText('US East (N. Virginia)'));
		await user.click(await screen.findByRole('checkbox', { name: /us-east-1/i }));
		await user.click(screen.getByTestId('aws-generate-command-btn'));

		await user.click(await screen.findByTestId('aws-check-connection-btn'));

		await waitFor(() => expect(api.pollCount()).toBe(2));

		await screen.findByText(/waiting for connection/i);
		expect(
			screen.queryByTestId('aws-check-connection-btn'),
		).not.toBeInTheDocument();
		expect(screen.getByTestId('aws-agent-command')).toHaveTextContent(cliCommand);
	});
});
