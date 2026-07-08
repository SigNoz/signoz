import {
	SpantypesFieldContextDTO as FieldContext,
	SpantypesSpanMapperOperationDTO as MapperOperation,
} from 'api/generated/services/sigNoz.schemas';
import { rest, server } from 'mocks-server/server';
import { render, screen, userEvent, waitFor, within } from 'tests/test-utils';

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

function setupGroups(groups = mockGroups): void {
	server.use(
		rest.get(GROUPS_ENDPOINT, (_req, res, ctx) =>
			res(ctx.status(200), ctx.json(makeGroupsResponse(groups))),
		),
	);
}

function setupMappers(mappers = mockMappers, groupId = 'group-1'): void {
	server.use(
		rest.get(mappersEndpoint(groupId), (_req, res, ctx) =>
			res(ctx.status(200), ctx.json(makeMappersResponse(mappers))),
		),
	);
}

async function expandGroup(
	user: ReturnType<typeof userEvent.setup>,
	groupId = 'group-1',
): Promise<void> {
	await user.click(screen.getByTestId(`group-expand-${groupId}`));
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
		// Reset URL state between tests — jsdom shares window.location across a file.
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

	it('shows the empty state when there are no groups', async () => {
		setupGroups([]);
		render(<AttributeMappingHarness />);

		await expect(
			screen.findByTestId('mapper-groups-empty'),
		).resolves.toHaveTextContent('No mapping groups yet.');
	});

	it('renders each group header row with its name and enabled status', async () => {
		setupGroups();
		render(<AttributeMappingHarness />);

		// Condition filters are no longer shown inline — they live in the group
		// drawer now — so the header row only carries the name and the toggle.
		// group-1: enabled.
		const enabledRow = (await screen.findByTestId('group-name-group-1')).closest(
			'tr',
		) as HTMLElement;
		expect(
			within(enabledRow).getByTestId('group-name-group-1'),
		).toHaveTextContent('demo');
		expect(within(enabledRow).getByTestId('group-enabled-group-1')).toBeChecked();

		// group-2: disabled.
		const disabledRow = screen
			.getByTestId('group-name-group-2')
			.closest('tr') as HTMLElement;
		expect(within(disabledRow).getByText('Tool')).toBeInTheDocument();
		expect(
			within(disabledRow).getByTestId('group-enabled-group-2'),
		).not.toBeChecked();
	});

	it("reveals a group's mappers on expand and hides them on collapse", async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		setupGroups();
		setupMappers([makeMapper({ id: 'mapper-1' })]);
		render(<AttributeMappingHarness />);

		await screen.findByTestId('group-name-group-1');
		expect(screen.getByTestId('group-expand-group-1')).toHaveAccessibleName(
			'Expand group',
		);

		await expandGroup(user);
		await expect(
			screen.findByTestId('mapper-target-mapper-1'),
		).resolves.toBeInTheDocument();

		await expandGroup(user);
		await waitFor(() =>
			expect(
				screen.queryByTestId('mapper-target-mapper-1'),
			).not.toBeInTheDocument(),
		);
	});

	it("lazily fetches and renders a group's mappers on first expand", async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		setupGroups();
		setupMappers([
			makeMapper({ id: 'mapper-1', name: 'gen_ai.request.model', enabled: true }),
		]);
		render(<AttributeMappingHarness />);

		await screen.findByTestId('group-name-group-1');
		// Mappers are not fetched until the row is expanded.
		expect(
			screen.queryByTestId('mapper-target-mapper-1'),
		).not.toBeInTheDocument();

		await expandGroup(user);

		const target = await screen.findByTestId('mapper-target-mapper-1');
		expect(target).toHaveTextContent('gen_ai.request.model');
		const mapperRow = target.closest('tr') as HTMLElement;
		// Sources ordered by priority, highest first (see fixtures).
		const sources = within(mapperRow).getByTestId('mapper-sources-mapper-1');
		expect(sources).toHaveTextContent('genai.model');
		expect(sources).toHaveTextContent('llm.model');
		// Writes-to field context + enabled status (an inline Switch, not text).
		expect(within(mapperRow).getByText('attribute')).toBeInTheDocument();
		expect(
			within(mapperRow).getByTestId('mapper-enabled-mapper-1'),
		).toBeChecked();
	});

	it('shows the mappers error state when the mappers request fails', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		setupGroups();
		server.use(
			rest.get(mappersEndpoint('group-1'), (_req, res, ctx) =>
				res(ctx.status(500)),
			),
		);
		render(<AttributeMappingHarness />);

		await screen.findByTestId('group-name-group-1');
		await expandGroup(user);

		await expect(
			screen.findByTestId('mappers-error-group-1'),
		).resolves.toHaveTextContent('Failed to load mappings. Please try again.');
	});

	it('shows the mappers empty state when a group has no mappers', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		setupGroups();
		setupMappers([]);
		render(<AttributeMappingHarness />);

		await screen.findByTestId('group-name-group-1');
		await expandGroup(user);

		await expect(
			screen.findByTestId('mappers-empty-group-1'),
		).resolves.toHaveTextContent('No mappings in this group yet.');
	});

	it('collapses extra mapper sources into a "+N more" label beyond the visible cap', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		setupGroups();
		setupMappers([
			makeMapper({
				id: 'mapper-1',
				config: {
					sources: [1, 2, 3, 4, 5].map((priority) => ({
						key: `source-${priority}`,
						context: FieldContext.attribute,
						operation: MapperOperation.copy,
						priority,
					})),
				},
			}),
		]);
		render(<AttributeMappingHarness />);

		await screen.findByTestId('group-name-group-1');
		await expandGroup(user);

		await expect(screen.findByText('+2 more')).resolves.toBeInTheDocument();
	});

	it('shows a muted placeholder when a mapper has no sources', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		setupGroups();
		setupMappers([makeMapper({ id: 'mapper-1', config: { sources: [] } })]);
		render(<AttributeMappingHarness />);

		await screen.findByTestId('group-name-group-1');
		await expandGroup(user);

		await waitFor(() =>
			expect(screen.getByTestId('mapper-sources-mapper-1')).toHaveTextContent('—'),
		);
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

	// The mapper drawer is owned by MappingsTable (a single useMapperFormDrawer +
	// MapperFormDrawer instance, targeted at whichever group triggered it), so
	// these flows reach it through the same store-backed harness by expanding a
	// group first. Persistence is staged into the draft store, so the assertions
	// are on the resulting table rows and the store's dirty state rather than any
	// network call.
	describe('mapper drawer', () => {
		async function openGroupWithMapper(
			user: ReturnType<typeof userEvent.setup>,
		): Promise<void> {
			setupGroups();
			setupMappers([makeMapper({ id: 'mapper-1', name: 'gen_ai.request.model' })]);
			render(<AttributeMappingHarness />);

			await screen.findByTestId('group-name-group-1');
			await expandGroup(user);
			await screen.findByTestId('mapper-target-mapper-1');
		}

		it('opens the add-mapping drawer from a group\'s "Add mapping" button', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			await openGroupWithMapper(user);

			expect(screen.queryByTestId('mapper-form-drawer')).not.toBeInTheDocument();
			await user.click(screen.getByTestId('add-mapper-group-1'));

			await expect(
				screen.findByTestId('mapper-form-drawer'),
			).resolves.toBeInTheDocument();
			expect(screen.getByText('New custom mapping')).toBeInTheDocument();
		});

		it('opens the edit drawer prefilled and locks the target attribute', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			await openGroupWithMapper(user);

			// DropdownMenuSimple drops the trigger's testId, so target it by its label.
			await user.click(screen.getByRole('button', { name: 'Mapping actions' }));
			await user.click(await screen.findByRole('menuitem', { name: 'Edit' }));

			await expect(
				screen.findByTestId('mapper-form-drawer'),
			).resolves.toBeInTheDocument();
			expect(screen.getByText('Edit mapping')).toBeInTheDocument();
			const target = screen.getByTestId('mapper-form-target');
			expect(target).toHaveValue('gen_ai.request.model');
			// The target attribute is the mapper's identity — immutable after create.
			expect(target).toBeDisabled();
		});

		it("toggles a mapper's enabled state through the store", async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			await openGroupWithMapper(user);

			const toggle = screen.getByTestId('mapper-enabled-mapper-1');
			expect(toggle).toBeChecked();

			await user.click(toggle);

			// The switch is driven by the draft, so a flip proves the store round-trip.
			await waitFor(() =>
				expect(screen.getByTestId('mapper-enabled-mapper-1')).not.toBeChecked(),
			);
		});

		it('removes a mapper via the row action menu', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			await openGroupWithMapper(user);

			await user.click(screen.getByRole('button', { name: 'Mapping actions' }));
			await user.click(await screen.findByRole('menuitem', { name: 'Delete' }));

			// The row is dropped from the draft; the group falls back to its empty state.
			await waitFor(() =>
				expect(
					screen.queryByTestId('mapper-target-mapper-1'),
				).not.toBeInTheDocument(),
			);
			expect(screen.getByTestId('mappers-empty-group-1')).toBeInTheDocument();
		});

		it('creates a new mapping through the drawer and appends it to the group', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			await openGroupWithMapper(user);

			await user.click(screen.getByTestId('add-mapper-group-1'));
			await screen.findByTestId('mapper-form-drawer');

			// Create stays disabled until the draft has a target and a non-empty source.
			expect(screen.getByTestId('mapper-form-save')).toBeDisabled();

			await user.type(
				screen.getByTestId('mapper-form-target'),
				'gen_ai.response.model',
			);
			await user.type(screen.getByTestId('mapper-form-source-0'), 'raw.model');

			const create = screen.getByTestId('mapper-form-save');
			await waitFor(() => expect(create).toBeEnabled());
			await user.click(create);

			// Drawer closes and the new mapping shows up as a row in the group.
			await waitFor(() =>
				expect(screen.queryByTestId('mapper-form-drawer')).not.toBeInTheDocument(),
			);
			await expect(
				screen.findByText('gen_ai.response.model'),
			).resolves.toBeInTheDocument();
		});
	});
});
