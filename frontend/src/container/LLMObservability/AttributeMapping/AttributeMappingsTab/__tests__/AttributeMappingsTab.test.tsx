import { rest, server } from 'mocks-server/server';
import { render, screen, userEvent, waitFor } from 'tests/test-utils';

import {
	GROUPS_ENDPOINT,
	makeGroupsResponse,
	makeMappersResponse,
	mappersEndpoint,
	mockGroups,
	mockMappers,
} from '../../__tests__/fixtures';
import AttributeMappingsTab from '../AttributeMappingsTab';

function setupGroups(): void {
	server.use(
		rest.get(GROUPS_ENDPOINT, (_req, res, ctx) =>
			res(ctx.status(200), ctx.json(makeGroupsResponse(mockGroups))),
		),
	);
}

describe('AttributeMappingsTab (integration)', () => {
	beforeEach(() => {
		window.history.pushState(null, '', '/');
	});

	afterEach(() => {
		server.resetHandlers();
	});

	it('renders no error banner on a successful load', async () => {
		setupGroups();
		render(<AttributeMappingsTab />);

		await waitFor(() =>
			expect(screen.getByTestId('group-name-group-1')).toBeInTheDocument(),
		);
		expect(screen.queryByRole('alert')).not.toBeInTheDocument();
	});

	it('shows an error banner when the groups request fails', async () => {
		server.use(
			rest.get(GROUPS_ENDPOINT, (_req, res, ctx) => res(ctx.status(500))),
		);
		render(<AttributeMappingsTab />);

		await expect(screen.findByRole('alert')).resolves.toHaveTextContent(
			'Failed to load mapping groups. Please try again.',
		);
	});

	it("lazily fetches and renders a group's mappers on first expand", async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		setupGroups();
		server.use(
			rest.get(mappersEndpoint('group-1'), (_req, res, ctx) =>
				res(ctx.status(200), ctx.json(makeMappersResponse(mockMappers))),
			),
		);
		render(<AttributeMappingsTab />);

		await waitFor(() =>
			expect(screen.getByTestId('group-name-group-1')).toBeInTheDocument(),
		);
		expect(
			screen.queryByTestId('mapper-target-mapper-1'),
		).not.toBeInTheDocument();

		await user.click(screen.getByTestId('group-expand-group-1'));

		await expect(
			screen.findByTestId('mapper-target-mapper-1'),
		).resolves.toHaveTextContent('gen_ai.request.model');
	});
});
