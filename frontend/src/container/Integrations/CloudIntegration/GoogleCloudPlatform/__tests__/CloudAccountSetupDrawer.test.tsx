import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TooltipProvider } from '@signozhq/ui/tooltip';
import { server } from 'mocks-server/server';
import { rest, RestRequest } from 'msw';
import MockQueryClientProvider from 'providers/test/MockQueryClientProvider';

import CloudAccountSetupDrawer from '../AddNewAccount/CloudAccountSetupDrawer';
import {
	checkInResponse,
	CLOUD_INTEGRATION_ID,
	connectionCredentials,
	connectionCredentialsResponse,
	createAccountResponse,
	GCP_ACCOUNTS_URL,
	GCP_CHECK_IN_URL,
	GCP_CREDENTIALS_URL,
} from './mockData';

// `useCloudAccountSetupDrawer` imports logEvent by relative path, which the
// jest.config moduleNameMapper (keyed on the `api/common/logEvent` alias) does
// not intercept — so mock the resolved module directly.
jest.mock('../../../../../api/common/logEvent', () => ({
	__esModule: true,
	default: jest.fn(),
}));

const onClose = jest.fn();

const renderDrawer = (): void => {
	render(
		<MockQueryClientProvider>
			<TooltipProvider>
				<CloudAccountSetupDrawer onClose={onClose} />
			</TooltipProvider>
		</MockQueryClientProvider>,
	);
};

describe('GCP CloudAccountSetupDrawer', () => {
	let createAccountPayload: Record<string, unknown> | null;
	let checkInPayload: Record<string, unknown> | null;

	beforeEach(() => {
		createAccountPayload = null;
		checkInPayload = null;

		server.use(
			rest.get(GCP_CREDENTIALS_URL, (_req, res, ctx) =>
				res(ctx.status(200), ctx.json(connectionCredentialsResponse)),
			),
			// check_in is registered first — it is a more specific path than
			// /accounts and msw matches handlers in registration order.
			rest.post(GCP_CHECK_IN_URL, async (req: RestRequest, res, ctx) => {
				checkInPayload = await req.json();
				return res(ctx.status(200), ctx.json(checkInResponse));
			}),
			rest.post(GCP_ACCOUNTS_URL, async (req: RestRequest, res, ctx) => {
				createAccountPayload = await req.json();
				return res(ctx.status(201), ctx.json(createAccountResponse));
			}),
		);
	});

	it('renders SigNoz-provided credentials as read-only fields', async () => {
		renderDrawer();

		await waitFor(() => {
			expect(screen.getByTestId('gcp-signoz-api-url-input')).toHaveTextContent(
				connectionCredentials.sigNozApiUrl,
			);
		});

		expect(screen.getByTestId('gcp-signoz-api-key-input')).toHaveTextContent(
			connectionCredentials.sigNozApiKey,
		);
		expect(screen.getByTestId('gcp-ingestion-url-input')).toHaveTextContent(
			connectionCredentials.ingestionUrl,
		);
		expect(screen.getByTestId('gcp-ingestion-key-input')).toHaveTextContent(
			connectionCredentials.ingestionKey,
		);
		expect(screen.getByText('Auto-filled by SigNoz')).toBeInTheDocument();
	});

	it('blocks submission and surfaces validation errors when the form is empty', async () => {
		const user = userEvent.setup();
		renderDrawer();

		await waitFor(() => {
			expect(screen.getByTestId('gcp-connect-account-btn')).toBeEnabled();
		});

		await user.click(screen.getByTestId('gcp-connect-account-btn'));

		await waitFor(() => {
			expect(screen.getByText('Please enter an account name')).toBeInTheDocument();
		});
		expect(
			screen.getByText('Please enter the deployment project ID'),
		).toBeInTheDocument();
		expect(screen.getByText('Please select a region')).toBeInTheDocument();
		expect(
			screen.getByText('Please add at least one project ID'),
		).toBeInTheDocument();

		expect(createAccountPayload).toBeNull();
		expect(onClose).not.toHaveBeenCalled();
	});

	it('creates the account, checks the agent in, and closes the drawer', async () => {
		const user = userEvent.setup();
		renderDrawer();

		await waitFor(() => {
			expect(screen.getByTestId('gcp-connect-account-btn')).toBeEnabled();
		});

		await user.type(
			screen.getByTestId('gcp-account-name-input'),
			'billing@company.com',
		);
		await user.type(
			screen.getByTestId('gcp-deployment-project-id-input'),
			'my-deployment-project-123',
		);

		await user.click(screen.getByTestId('gcp-deployment-region-select'));
		await user.click(await screen.findByText('Mumbai (asia-south1)'));

		const projectIdsInput = document.querySelector(
			'#gcp-project-ids-select',
		) as HTMLInputElement;
		await user.type(projectIdsInput, 'project-a,project-b,');

		await user.click(screen.getByTestId('gcp-connect-account-btn'));

		await waitFor(() => {
			expect(createAccountPayload).not.toBeNull();
		});

		expect(createAccountPayload).toStrictEqual({
			config: {
				gcp: {
					deploymentRegion: 'asia-south1',
					deploymentProjectId: 'my-deployment-project-123',
					projectIds: ['project-a', 'project-b'],
				},
			},
			// Backend-provided credentials win over anything in the form.
			credentials: connectionCredentials,
		});

		await waitFor(() => {
			expect(checkInPayload).toStrictEqual({
				providerAccountId: 'billing@company.com',
				cloudIntegrationId: CLOUD_INTEGRATION_ID,
				data: {},
			});
		});

		await waitFor(() => {
			expect(onClose).toHaveBeenCalledTimes(1);
		});
	});

	it('shows the backend error inline when account creation fails', async () => {
		server.use(
			rest.post(GCP_ACCOUNTS_URL, (_req, res, ctx) =>
				res(
					ctx.status(400),
					ctx.json({
						status: 'error',
						error: { message: 'deployment project id is not accessible' },
					}),
				),
			),
		);

		const user = userEvent.setup();
		renderDrawer();

		await waitFor(() => {
			expect(screen.getByTestId('gcp-connect-account-btn')).toBeEnabled();
		});

		await user.type(screen.getByTestId('gcp-account-name-input'), 'my-org');
		await user.type(
			screen.getByTestId('gcp-deployment-project-id-input'),
			'my-deployment-project-123',
		);
		await user.click(screen.getByTestId('gcp-deployment-region-select'));
		await user.click(await screen.findByText('Mumbai (asia-south1)'));

		const projectIdsInput = document.querySelector(
			'#gcp-project-ids-select',
		) as HTMLInputElement;
		await user.type(projectIdsInput, 'project-a,');

		await user.click(screen.getByTestId('gcp-connect-account-btn'));

		await waitFor(() => {
			expect(screen.getByTestId('gcp-connect-error')).toHaveTextContent(
				'deployment project id is not accessible',
			);
		});
		expect(checkInPayload).toBeNull();
		expect(onClose).not.toHaveBeenCalled();
	});
});
