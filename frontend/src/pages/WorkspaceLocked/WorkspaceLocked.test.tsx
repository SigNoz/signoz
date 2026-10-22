import {
	setupAuthzAdmin,
	setupAuthzDenyAll,
} from 'lib/authz/utils/authz-test-utils';
import { licensesSuccessWorkspaceLockedResponse } from 'mocks-server/__mockdata__/licenses';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { act, render, screen, waitFor } from 'tests/test-utils';

import WorkspaceLocked from '.';

describe('WorkspaceLocked', () => {
	const apiURL = 'http://localhost/api/v2/licenses';

	it('Should render the component', async () => {
		server.use(
			rest.get(apiURL, (req, res, ctx) =>
				res(ctx.status(200), ctx.json(licensesSuccessWorkspaceLockedResponse)),
			),
		);

		act(() => {
			render(<WorkspaceLocked />);
		});

		const workspaceLocked = await screen.findByRole('heading', {
			name: /upgrade to continue/i,
		});
		expect(workspaceLocked).toBeInTheDocument();

		const contactUsBtn = await screen.findByRole('button', {
			name: /Contact Us/i,
		});
		expect(contactUsBtn).toBeInTheDocument();
	});

	it('enables the upgrade action when subscription create is granted', async () => {
		server.use(
			rest.get(apiURL, (req, res, ctx) =>
				res(ctx.status(200), ctx.json(licensesSuccessWorkspaceLockedResponse)),
			),
			setupAuthzAdmin(),
		);

		render(<WorkspaceLocked />);
		const updateCreditCardBtn = await screen.findByRole('button', {
			name: /continue my journey/i,
		});
		await waitFor(() => {
			expect(updateCreditCardBtn).toBeEnabled();
		});
	});

	it('disables the upgrade action when subscription create is denied', async () => {
		server.use(
			rest.get(apiURL, (req, res, ctx) =>
				res(ctx.status(200), ctx.json(licensesSuccessWorkspaceLockedResponse)),
			),
			setupAuthzDenyAll(),
		);

		render(<WorkspaceLocked />, {}, { role: 'VIEWER' });
		const updateCreditCardBtn = await screen.findByRole('button', {
			name: /continue my journey/i,
		});
		await waitFor(() => {
			expect(updateCreditCardBtn).toBeDisabled();
		});
	});
});
