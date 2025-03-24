import { licensesSuccessWorkspaceLockedResponse } from 'mocks-server/__mockdata__/licenses';
import { server } from 'mocks-server/server';
import { http, HttpResponse } from 'msw';
import { act, render, screen } from 'tests/test-utils';

import WorkspaceLocked from '.';

describe('WorkspaceLocked', () => {
	const apiURL = 'http://localhost/api/v2/licenses';

	test('Should render the component', async () => {
		server.use(
			http.get(apiURL, () =>
				HttpResponse.json(licensesSuccessWorkspaceLockedResponse, { status: 200 }),
			),
		);

		act(() => {
			render(<WorkspaceLocked />);
		});

		const workspaceLocked = await screen.findByRole('heading', {
			name: /upgrade to continue/i,
		});
		expect(workspaceLocked).toBeInTheDocument();

		const gotQuestionText = await screen.findByText(/got question?/i);
		expect(gotQuestionText).toBeInTheDocument();

		const contactUsBtn = await screen.findByRole('button', {
			name: /Contact Us/i,
		});
		expect(contactUsBtn).toBeInTheDocument();
	});

	test('Render for Admin', async () => {
		server.use(
			http.get(apiURL, () =>
				HttpResponse.json(licensesSuccessWorkspaceLockedResponse, { status: 200 }),
			),
		);

		render(<WorkspaceLocked />);
		const contactAdminMessage = await screen.queryByText(
			/contact your admin to proceed with the upgrade./i,
		);
		expect(contactAdminMessage).not.toBeInTheDocument();
		const updateCreditCardBtn = await screen.findByRole('button', {
			name: /continue my journey/i,
		});
		expect(updateCreditCardBtn).toBeInTheDocument();
	});

	test('Render for non Admin', async () => {
		server.use(
			http.get(apiURL, () =>
				HttpResponse.json(licensesSuccessWorkspaceLockedResponse, { status: 200 }),
			),
		);

		render(<WorkspaceLocked />, {}, 'VIEWER');
		const updateCreditCardBtn = await screen.queryByRole('button', {
			name: /Continue My Journey/i,
		});
		expect(updateCreditCardBtn).not.toBeInTheDocument();

		const contactAdminMessage = await screen.findByText(
			/contact your admin to proceed with the upgrade./i,
		);
		expect(contactAdminMessage).toBeInTheDocument();
	});
});
