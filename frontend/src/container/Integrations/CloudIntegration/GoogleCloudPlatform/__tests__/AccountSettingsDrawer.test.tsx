import { ComponentProps } from 'react';
import { render, screen, userEvent, waitFor, within } from 'tests/test-utils';
import { toast } from '@signozhq/ui/sonner';
import { rest, server } from 'mocks-server/server';
import { RestRequest } from 'msw';

import AccountSettingsDrawer from '../EditAccount/AccountSettingsDrawer';
import {
	GCP_ACCOUNT_URL,
	GCP_ACCOUNTS_URL,
	gcpAccount,
	gcpAccountConfig,
	listAccountsResponse,
} from './mockData';
import { addProjectIds } from './projectIdsTestUtils';

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

type AccountSettingsDrawerProps = ComponentProps<typeof AccountSettingsDrawer>;

const onClose = jest.fn() as jest.MockedFunction<
	AccountSettingsDrawerProps['onClose']
>;
const setActiveAccount = jest.fn() as jest.MockedFunction<
	AccountSettingsDrawerProps['setActiveAccount']
>;

const renderDrawer = (): void => {
	render(
		<AccountSettingsDrawer
			onClose={onClose}
			account={gcpAccount}
			setActiveAccount={setActiveAccount}
		/>,
	);
};

/** Each selected project ID renders as a pill with its own remove button. */
const getProjectIdRemoveButtons = (): HTMLElement[] =>
	within(screen.getByTestId('gcp-edit-project-ids-select')).queryAllByLabelText(
		/^Remove /,
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

		const projectIdsInput = screen.getByTestId('gcp-edit-project-ids-select');
		gcpAccountConfig.project_ids.forEach((projectId) => {
			expect(projectIdsInput).toHaveTextContent(projectId);
		});
	});

	it('keeps save disabled until the project IDs actually change', async () => {
		const user = userEvent.setup();
		renderDrawer();

		expect(screen.getByTestId('gcp-update-account-btn')).toHaveAttribute(
			'aria-disabled',
			'true',
		);

		await addProjectIds(user, 'gcp-edit-project-ids-select', ['project-c']);

		await waitFor(() => {
			expect(screen.getByTestId('gcp-update-account-btn')).not.toHaveAttribute(
				'aria-disabled',
				'true',
			);
		});
	});

	it('sends the updated project IDs while preserving the immutable deployment fields', async () => {
		const user = userEvent.setup();
		renderDrawer();

		await addProjectIds(user, 'gcp-edit-project-ids-select', ['project-c']);
		await waitFor(() => {
			expect(screen.getByTestId('gcp-update-account-btn')).not.toHaveAttribute(
				'aria-disabled',
				'true',
			);
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
					...gcpAccountConfig,
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
		while (getProjectIdRemoveButtons().length > 0) {
			// eslint-disable-next-line no-await-in-loop
			await user.click(getProjectIdRemoveButtons()[0]);
		}

		await waitFor(() => {
			expect(screen.getByTestId('gcp-update-account-btn')).not.toHaveAttribute(
				'aria-disabled',
				'true',
			);
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

		await addProjectIds(user, 'gcp-edit-project-ids-select', ['project-c']);
		await waitFor(() => {
			expect(screen.getByTestId('gcp-update-account-btn')).not.toHaveAttribute(
				'aria-disabled',
				'true',
			);
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
});
