import { rest, server } from 'mocks-server/server';
import { render, screen, userEvent, waitFor } from 'tests/test-utils';

import {
	GROUPS_ENDPOINT,
	makeGroupsResponse,
	makeMapper,
	makeMappersResponse,
	mappersEndpoint,
	mockGroups,
	mockMappers,
} from '../../__tests__/fixtures';
import AttributeMappingsTab from '../AttributeMappingsTab';

import { useAttributeMappingStore } from '../hooks/useAttributeMappingStore';

function setupGroups(): void {
	server.use(
		rest.get(GROUPS_ENDPOINT, (_req, res, ctx) =>
			res(ctx.status(200), ctx.json(makeGroupsResponse(mockGroups))),
		),
	);
}

// The tab is a presentational view over a store owned by the container, so the
// harness creates the store (via the hook, backed by the mocked API) and wires
// the edit/add callbacks the tab needs. This suite only exercises the listing,
// so the callbacks are no-ops.
function AttributeMappingHarness(): JSX.Element {
	const store = useAttributeMappingStore();
	return (
		<AttributeMappingsTab
			store={store}
			onEditGroup={jest.fn()}
			onAddGroup={jest.fn()}
		/>
	);
}

// The real Save button lives in the page header; this harness exposes the same
// store.save() path the header wires up, so the tab suite can exercise it.
function SaveableHarness(): JSX.Element {
	const store = useAttributeMappingStore();
	return (
		<>
			<button
				type="button"
				data-testid="save-button"
				onClick={(): void => {
					void store.save();
				}}
			>
				Save
			</button>
			<AttributeMappingsTab
				store={store}
				onEditGroup={jest.fn()}
				onAddGroup={jest.fn()}
			/>
		</>
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
		render(<AttributeMappingHarness />);

		await waitFor(() =>
			expect(screen.getByTestId('group-name-group-1')).toBeInTheDocument(),
		);
		expect(screen.queryByRole('alert')).not.toBeInTheDocument();
	});

	it('shows an error banner when the groups request fails', async () => {
		server.use(
			rest.get(GROUPS_ENDPOINT, (_req, res, ctx) => res(ctx.status(500))),
		);
		render(<AttributeMappingHarness />);

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
		render(<AttributeMappingHarness />);

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

	it("re-fetches an open group's mappers on save instead of showing stale rows", async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		setupGroups();

		// The mapper list changes server-side between the first open and the save
		// (e.g. another edit landed, or the save reconciled ids). The open table
		// must reflect the latest list — not the list cached on first expand.
		let mappers = mockMappers;
		server.use(
			rest.get(mappersEndpoint('group-1'), (_req, res, ctx) =>
				res(ctx.status(200), ctx.json(makeMappersResponse(mappers))),
			),
		);
		render(<SaveableHarness />);

		await waitFor(() =>
			expect(screen.getByTestId('group-name-group-1')).toBeInTheDocument(),
		);

		await user.click(screen.getByTestId('group-expand-group-1'));
		await expect(
			screen.findByTestId('mapper-target-mapper-1'),
		).resolves.toBeInTheDocument();

		// Server now returns a different mapper for the group.
		mappers = [makeMapper({ id: 'mapper-2', name: 'gen_ai.response.model' })];

		await user.click(screen.getByTestId('save-button'));

		// Fresh row appears; the stale one is gone. Without removeQueries the table
		// would keep showing mapper-1 (the hydrate once-guard blocks the update).
		await expect(
			screen.findByTestId('mapper-target-mapper-2'),
		).resolves.toHaveTextContent('gen_ai.response.model');
		expect(
			screen.queryByTestId('mapper-target-mapper-1'),
		).not.toBeInTheDocument();
	});
});
