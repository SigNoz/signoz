import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from '@signozhq/ui/sonner';
import { TooltipProvider } from '@signozhq/ui/tooltip';
import { server } from 'mocks-server/server';
import { rest, RestRequest } from 'msw';
import MockQueryClientProvider from 'providers/test/MockQueryClientProvider';

import AccountSettingsDrawer from '../EditAccount/AccountSettingsDrawer';
import {
	GCP_ACCOUNT_ID,
	GCP_ACCOUNT_URL,
	GCP_ACCOUNTS_URL,
	gcpAccount,
	gcpAccountConfig,
	listAccountsResponse,
} from './mockData';

// `useAccountSettingsDrawer` imports logEvent by relative path, which the
// jest.config moduleNameMapper (keyed on the `api/common/logEvent` alias) does
// not intercept — so mock the resolved module directly.
jest.mock('../../../../../api/common/logEvent', () => ({
	__esModule: true,
	default: jest.fn(),
}));

jest.mock('@signozhq/ui/sonner', () => ({
	...jest.requireActual('@signozhq/ui/sonner'),
	toast: {
		success: jest.fn(),
		error: jest.fn(),
	},
}));

const onClose = jest.fn();
const setActiveAccount = jest.fn();

const renderDrawer = (): void => {
	render(
		<MockQueryClientProvider>
			<TooltipProvider>
				<AccountSettingsDrawer
					onClose={onClose}
					account={gcpAccount}
					setActiveAccount={setActiveAccount}
				/>
			</TooltipProvider>
		</MockQueryClientProvider>,
	);
};

/** The antd tags Select renders its text input inside the testId wrapper. */
const getProjectIdsInput = (): HTMLElement =>
	within(screen.getByTestId('gcp-edit-project-ids-select')).getByRole(
		'combobox',
	);

/** Each selected tag carries an antd "close" icon that removes it. */
const getProjectIdTagRemoveButtons = (): HTMLElement[] =>
	within(screen.getByTestId('gcp-edit-project-ids-select')).queryAllByLabelText(
		'close',
	);

describe('GCP AccountSettingsDrawer', () => {
	let updatePayload: Record<string, unknown> | null;

	beforeEach(() => {
		updatePayload = null;

		server.use(
			rest.get(GCP_ACCOUNTS_URL, (_req, res, ctx) =>
				res(ctx.status(200), ctx.json(listAccountsResponse)),
			),
			rest.put(GCP_ACCOUNT_URL, async (req: RestRequest, res, ctx) => {
				updatePayload = await req.json();
				return res(ctx.status(204));
			}),
		);
	});

	it('renders the connected account details and existing project IDs', () => {
		renderDrawer();

		expect(screen.getByText(gcpAccount.providerAccountId)).toBeInTheDocument();
		expect(
			screen.getByText(gcpAccountConfig.deployment_project_id),
		).toBeInTheDocument();
		expect(
			screen.getByText(gcpAccountConfig.deployment_region),
		).toBeInTheDocument();

		gcpAccountConfig.project_ids.forEach((projectId) => {
			expect(screen.getByTitle(projectId)).toBeInTheDocument();
		});
	});

	it('keeps save disabled until the project IDs actually change', async () => {
		const user = userEvent.setup();
		renderDrawer();

		expect(screen.getByTestId('gcp-update-account-btn')).toBeDisabled();

		await user.type(getProjectIdsInput(), 'project-c,');

		await waitFor(() => {
			expect(screen.getByTestId('gcp-update-account-btn')).toBeEnabled();
		});
	});

	it('sends the updated project IDs while preserving the immutable deployment fields', async () => {
		const user = userEvent.setup();
		renderDrawer();

		await user.type(getProjectIdsInput(), 'project-c,');
		await waitFor(() => {
			expect(screen.getByTestId('gcp-update-account-btn')).toBeEnabled();
		});
		await user.click(screen.getByTestId('gcp-update-account-btn'));

		await waitFor(() => {
			expect(updatePayload).not.toBeNull();
		});

		expect(updatePayload).toStrictEqual({
			config: {
				gcp: {
					deploymentRegion: gcpAccountConfig.deployment_region,
					deploymentProjectId: gcpAccountConfig.deployment_project_id,
					projectIds: ['project-a', 'project-b', 'project-c'],
				},
			},
		});

		await waitFor(() => {
			expect(setActiveAccount).toHaveBeenCalledWith({
				...gcpAccount,
				config: {
					deployment_region: gcpAccountConfig.deployment_region,
					deployment_project_id: gcpAccountConfig.deployment_project_id,
					project_ids: ['project-a', 'project-b', 'project-c'],
				},
			});
		});
		expect(onClose).toHaveBeenCalledTimes(1);
		expect(toast.success).toHaveBeenCalledWith(
			'Account settings updated successfully',
			expect.anything(),
		);
	});

	it('blocks the update and shows a validation error when every project ID is removed', async () => {
		const user = userEvent.setup();
		renderDrawer();

		// Strip every tag via its remove icon; the list shrinks as we go.
		while (getProjectIdTagRemoveButtons().length > 0) {
			// eslint-disable-next-line no-await-in-loop
			await user.click(getProjectIdTagRemoveButtons()[0]);
		}

		await waitFor(() => {
			expect(screen.getByTestId('gcp-update-account-btn')).toBeEnabled();
		});
		await user.click(screen.getByTestId('gcp-update-account-btn'));

		await waitFor(() => {
			expect(
				screen.getByText('Please add at least one project ID'),
			).toBeInTheDocument();
		});
		expect(updatePayload).toBeNull();
		expect(onClose).not.toHaveBeenCalled();
	});

	it('surfaces a toast and keeps the drawer open when the update fails', async () => {
		server.use(
			rest.put(GCP_ACCOUNT_URL, (_req, res, ctx) =>
				res(
					ctx.status(500),
					ctx.json({ status: 'error', error: { message: 'update failed' } }),
				),
			),
		);

		const user = userEvent.setup();
		renderDrawer();

		await user.type(getProjectIdsInput(), 'project-c,');
		await waitFor(() => {
			expect(screen.getByTestId('gcp-update-account-btn')).toBeEnabled();
		});
		await user.click(screen.getByTestId('gcp-update-account-btn'));

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith(
				'Failed to update account settings',
				expect.anything(),
			);
		});
		expect(setActiveAccount).not.toHaveBeenCalled();
		expect(onClose).not.toHaveBeenCalled();
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
});
