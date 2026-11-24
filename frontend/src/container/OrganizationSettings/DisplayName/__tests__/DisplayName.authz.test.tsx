import {
	buildOrganizationReadPermission,
	buildOrganizationUpdatePermission,
} from 'lib/authz/hooks/useAuthZ/permissions/organization.permissions';
import {
	setupAuthzAdmin,
	setupAuthzDeny,
} from 'lib/authz/utils/authz-test-utils';
import { rest, server } from 'mocks-server/server';
import { render, screen, waitFor } from 'tests/test-utils';

import DisplayName from '../index';

const ORG_ID = 'does-not-matter-id';
const ORG_ME_ENDPOINT = '*/api/v2/orgs/me';

function renderWithoutSavedName(): void {
	render(<DisplayName index={0} id={ORG_ID} />, undefined, {
		appContextOverrides: {
			org: [{ createdAt: 0, id: ORG_ID, displayName: '' }],
		},
	});
}

function useOrgFetchHandler(): { calls: () => number } {
	let calls = 0;
	server.use(
		rest.get(ORG_ME_ENDPOINT, (_, res, ctx) => {
			calls += 1;
			return res(
				ctx.status(200),
				ctx.json({
					status: 'success',
					data: { id: ORG_ID, displayName: 'Fetched Org' },
				}),
			);
		}),
	);
	return { calls: (): number => calls };
}

describe('DisplayName — authz', () => {
	afterEach(() => {
		server.resetHandlers();
	});

	it('disables the input and submit with the denied permission when update is denied', async () => {
		server.use(setupAuthzDeny(buildOrganizationUpdatePermission(ORG_ID)));

		render(<DisplayName index={0} id={ORG_ID} />);

		await waitFor(() =>
			expect(screen.getByTestId('org-display-name-submit')).not.toHaveAttribute(
				'aria-busy',
			),
		);
		const submit = screen.getByTestId('org-display-name-submit');
		expect(submit).toHaveAttribute('aria-disabled', 'true');
		expect(submit).toHaveAttribute(
			'data-denied-permissions',
			expect.stringContaining('update'),
		);
		expect(screen.getByTestId('org-display-name-input-field')).toBeDisabled();
	});

	it('shows the denial instead of the form and skips the fetch when read is denied', async () => {
		server.use(setupAuthzDeny(buildOrganizationReadPermission(ORG_ID)));
		const fetch = useOrgFetchHandler();

		renderWithoutSavedName();

		await expect(
			screen.findByText(/is not authorized/i),
		).resolves.toBeInTheDocument();
		expect(screen.getByText(/read:organization/i)).toBeInTheDocument();
		expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
		expect(
			screen.queryByTestId('org-display-name-submit'),
		).not.toBeInTheDocument();
		expect(fetch.calls()).toBe(0);
	});

	it('fetches the organization when read is granted', async () => {
		const fetch = useOrgFetchHandler();
		server.use(setupAuthzAdmin());

		renderWithoutSavedName();

		await waitFor(() => expect(fetch.calls()).toBe(1));
	});
});
