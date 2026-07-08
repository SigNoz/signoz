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
} from 'container/LLMObservability/AttributeMapping/__tests__/fixtures';
import { DraftGroup } from 'container/LLMObservability/AttributeMapping/types';
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

// DropdownMenuSimple drops the trigger's testId, so the kebab is reached via
// its accessible name instead.
async function openGroupActionsMenu(
	user: ReturnType<typeof userEvent.setup>,
	groupId: string,
): Promise<void> {
	const row = screen
		.getByTestId(`group-name-${groupId}`)
		.closest('.ant-collapse-item') as HTMLElement;
	await user.click(within(row).getByRole('button', { name: 'Group actions' }));
}

interface HarnessProps {
	onEditGroup?: (group: DraftGroup) => void;
	onAddGroup?: () => void;
}

// The tab is a presentational view over a store owned by the container, so the
// harness creates the store (via the hook, backed by the mocked API) and wires
// the edit/add callbacks the tab needs.
function AttributeMappingHarness({
	onEditGroup,
	onAddGroup,
}: HarnessProps): JSX.Element {
	const store = useAttributeMappingStore();
	return (
		<AttributeMappingsTab
			store={store}
			onEditGroup={onEditGroup ?? jest.fn()}
			onAddGroup={onAddGroup ?? jest.fn()}
		/>
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

	it('renders each group header row with its name, condition count and status', async () => {
		setupGroups();
		render(<AttributeMappingHarness />);

		// Condition filters are no longer shown inline as clauses — the header
		// carries a count instead (the keys surface in the group drawer).
		// Group headers are antd Collapse panels, so rows scope to the panel item.
		// group-1: enabled, with attribute + resource condition keys.
		const enabledRow = (await screen.findByTestId('group-name-group-1')).closest(
			'.ant-collapse-item',
		) as HTMLElement;
		expect(
			within(enabledRow).getByTestId('group-name-group-1'),
		).toHaveTextContent('demo');
		expect(
			within(enabledRow).getByTestId('group-condition-count-group-1'),
		).toHaveTextContent('2 conditions');
		expect(within(enabledRow).getByTestId('group-enabled-group-1')).toBeChecked();

		// group-2: disabled, with no condition keys.
		const disabledRow = screen
			.getByTestId('group-name-group-2')
			.closest('.ant-collapse-item') as HTMLElement;
		expect(within(disabledRow).getByText('Tool')).toBeInTheDocument();
		expect(
			within(disabledRow).getByTestId('group-condition-count-group-2'),
		).toHaveTextContent('0 conditions');
		expect(
			within(disabledRow).getByTestId('group-enabled-group-2'),
		).not.toBeChecked();
	});

	it("stages a toggle of the group's enabled state via the header switch", async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		setupGroups();
		render(<AttributeMappingHarness />);

		const toggle = await screen.findByTestId('group-enabled-group-1');
		expect(toggle).toBeChecked();

		await user.click(toggle);
		// The flip lands in the store's working copy (persisted on page save).
		expect(screen.getByTestId('group-enabled-group-1')).not.toBeChecked();
	});

	it('invokes onAddGroup from the toolbar button', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		const onAddGroup = jest.fn();
		setupGroups();
		render(<AttributeMappingHarness onAddGroup={onAddGroup} />);

		await screen.findByTestId('group-name-group-1');
		await user.click(screen.getByTestId('add-group-row'));

		expect(onAddGroup).toHaveBeenCalledTimes(1);
	});

	it('invokes onEditGroup with the group when Edit is chosen from the actions menu', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		const onEditGroup = jest.fn();
		setupGroups();
		render(<AttributeMappingHarness onEditGroup={onEditGroup} />);

		await screen.findByTestId('group-name-group-1');
		await openGroupActionsMenu(user, 'group-1');
		await user.click(await screen.findByRole('menuitem', { name: 'Edit' }));

		expect(onEditGroup).toHaveBeenCalledTimes(1);
		expect(onEditGroup.mock.calls[0][0]).toMatchObject({
			localId: 'group-1',
			name: 'demo',
		});
	});

	it('stages a group removal when Delete is chosen from the actions menu', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		setupGroups();
		render(<AttributeMappingHarness />);

		await screen.findByTestId('group-name-group-1');
		await openGroupActionsMenu(user, 'group-1');
		await user.click(await screen.findByRole('menuitem', { name: 'Delete' }));

		// The row leaves the working copy immediately; the delete is persisted on
		// the page-level save.
		await waitFor(() =>
			expect(screen.queryByTestId('group-name-group-1')).not.toBeInTheDocument(),
		);
		expect(screen.getByTestId('group-name-group-2')).toBeInTheDocument();
	});

	it("reveals a group's mappers on expand and hides them on collapse", async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		setupGroups();
		setupMappers([makeMapper({ id: 'mapper-1' })]);
		render(<AttributeMappingHarness />);

		await screen.findByTestId('group-name-group-1');
		// The toggle is the antd Collapse header, which owns the expanded state.
		const header = screen
			.getByTestId('group-expand-group-1')
			.closest('.ant-collapse-header') as HTMLElement;
		expect(header).toHaveAttribute('aria-expanded', 'false');

		await expandGroup(user);
		expect(header).toHaveAttribute('aria-expanded', 'true');
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

	it("renders a mapper's enable state as a read-only switch", async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		setupGroups();
		setupMappers([makeMapper({ id: 'mapper-1', enabled: true })]);
		render(<AttributeMappingHarness />);

		await screen.findByTestId('group-name-group-1');
		await expandGroup(user);

		// Unlike the group switch, a mapper's status switch reflects state without
		// accepting flips — mapper editing lands in a later PR.
		const toggle = await screen.findByTestId('mapper-enabled-mapper-1');
		expect(toggle).toBeChecked();
		expect(toggle).toBeDisabled();
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
});
