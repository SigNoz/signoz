import { rest, server } from 'mocks-server/server';
import { screen, waitFor } from 'tests/test-utils';
import { renderWithNoAuth } from 'tests/no-auth-test-utils';

import AuthDomain from '../index';
import { AUTH_DOMAINS_LIST_ENDPOINT, mockEmptyDomainsResponse } from './mocks';

describe('AuthDomain — no-auth mode', () => {
	afterEach(() => {
		server.resetHandlers();
	});

	it('renders no-auth guard sentinel for Add Domain button', async () => {
		server.use(
			rest.get(AUTH_DOMAINS_LIST_ENDPOINT, (_, res, ctx) =>
				res(ctx.status(200), ctx.json(mockEmptyDomainsResponse)),
			),
		);

		renderWithNoAuth(<AuthDomain />);

		await waitFor(() => {
			expect(screen.getByTestId('no-auth-add-domain')).toBeInTheDocument();
		});
	});
});
