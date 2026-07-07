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

describe('AttributeMappingsTab (integration)', () => {
	beforeEach(() => {
		// The shared TanStackTable owns page/limit URL state via nuqs, which reads
		// window.location — jsdom shares that across tests in a file.
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

	it('shows the empty state when there are no groups', async () => {
		setupGroups([]);
		render(<AttributeMappingsTab />);

		await expect(
			screen.findByTestId('mapper-groups-empty'),
		).resolves.toHaveTextContent('No mapping groups yet.');
	});

	it('renders each group row with its name, condition filters and status', async () => {
		setupGroups();
		render(<AttributeMappingsTab />);

		// group-1: enabled, with attribute + resource condition keys.
		const enabledRow = (await screen.findByTestId('group-name-group-1')).closest(
			'tr',
		) as HTMLElement;
		expect(
			within(enabledRow).getByTestId('group-name-group-1'),
		).toHaveTextContent('demo');
		const filters = within(enabledRow).getByTestId('group-filters-group-1');
		expect(filters).toHaveTextContent('attribute');
		expect(filters).toHaveTextContent('contains ai.embeddings');
		expect(filters).toHaveTextContent('resource');
		expect(filters).toHaveTextContent('contains cloud.account.id');
		expect(within(enabledRow).getByText('Enabled')).toBeInTheDocument();

		// group-2: disabled, with no condition keys.
		const disabledRow = screen
			.getByTestId('group-name-group-2')
			.closest('tr') as HTMLElement;
		expect(within(disabledRow).getByText('Tool')).toBeInTheDocument();
		expect(within(disabledRow).getByText('Disabled')).toBeInTheDocument();
		expect(
			within(disabledRow).getByTestId('group-filters-group-2'),
		).toHaveTextContent('No condition · always runs');
	});

	it("reveals a group's mappers on expand and hides them on collapse", async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		setupGroups();
		setupMappers([makeMapper({ id: 'mapper-1' })]);
		render(<AttributeMappingsTab />);

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
		render(<AttributeMappingsTab />);

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
		// Writes-to field context + enabled status.
		expect(within(mapperRow).getByText('attribute')).toBeInTheDocument();
		expect(within(mapperRow).getByText('Enabled')).toBeInTheDocument();
	});

	it('shows the mappers error state when the mappers request fails', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		setupGroups();
		server.use(
			rest.get(mappersEndpoint('group-1'), (_req, res, ctx) =>
				res(ctx.status(500)),
			),
		);
		render(<AttributeMappingsTab />);

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
		render(<AttributeMappingsTab />);

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
		render(<AttributeMappingsTab />);

		await screen.findByTestId('group-name-group-1');
		await expandGroup(user);

		await expect(screen.findByText('+2 more')).resolves.toBeInTheDocument();
	});

	it('shows a muted placeholder when a mapper has no sources', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		setupGroups();
		setupMappers([makeMapper({ id: 'mapper-1', config: { sources: [] } })]);
		render(<AttributeMappingsTab />);

		await screen.findByTestId('group-name-group-1');
		await expandGroup(user);

		await waitFor(() =>
			expect(screen.getByTestId('mapper-sources-mapper-1')).toHaveTextContent('—'),
		);
	});
});
