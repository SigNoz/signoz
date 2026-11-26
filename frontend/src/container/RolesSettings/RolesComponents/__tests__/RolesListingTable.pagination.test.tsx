import userEvent from '@testing-library/user-event';
import { customRoles } from 'mocks-server/__mockdata__/roles';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { setupAuthzAdmin } from 'lib/authz/utils/authz-test-utils';
import { getCurrentLocation } from 'lib/router/navigation';
import { render, screen, waitFor } from 'tests/test-utils';

import RolesListingTable from '../RolesListingTable';

const manyRoles = Array.from({ length: 25 }, (_, index) => ({
	...customRoles[0],
	id: `custom-role-${index}`,
	name: `custom-role-${index}`,
}));

beforeEach(() => {
	server.use(
		setupAuthzAdmin(),
		rest.get('*/api/v1/roles', (_req, res, ctx) =>
			res(ctx.status(200), ctx.json({ status: 'success', data: manyRoles })),
		),
	);
});

afterEach(() => {
	server.resetHandlers();
});

describe('RolesListingTable - pagination', () => {
	it('writes the page into the search and keeps the pathname', async () => {
		const user = userEvent.setup();
		render(<RolesListingTable searchQuery="" />, undefined, {
			initialRoute: '/settings/roles',
		});

		await screen.findByText('custom-role-0');
		await user.click(screen.getByTitle('2'));

		await waitFor(() => {
			expect(getCurrentLocation().search).toBe('?page=2');
		});
		expect(getCurrentLocation().pathname).toBe('/settings/roles');
	});
});
