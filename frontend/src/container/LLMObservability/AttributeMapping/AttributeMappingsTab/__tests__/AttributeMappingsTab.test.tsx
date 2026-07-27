import {
	SpantypesFieldContextDTO as FieldContext,
	SpantypesSpanMapperOperationDTO as MapperOperation,
} from 'api/generated/services/sigNoz.schemas';
import { toast } from '@signozhq/ui/sonner';
import { rest, server } from 'mocks-server/server';
import { render, screen, userEvent, waitFor, within } from 'tests/test-utils';

jest.mock('@signozhq/ui/sonner', () => ({
	...jest.requireActual('@signozhq/ui/sonner'),
	toast: {
		success: jest.fn(),
		error: jest.fn(),
		warning: jest.fn(),
	},
}));

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
import { useAttributeMappingEditor } from '../../hooks/useAttributeMappingEditor';

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

async function openGroupActionsMenu(
	user: ReturnType<typeof userEvent.setup>,
	groupId: string,
): Promise<void> {
	await user.click(screen.getByTestId(`group-actions-${groupId}`));
}

interface AttributeMappingsTabWithStoreProps {
	onEditGroup?: (group: DraftGroup) => void;
	onAddGroup?: () => void;
}
function AttributeMappingsTabWithStore({
	onEditGroup,
	onAddGroup,
}: AttributeMappingsTabWithStoreProps): JSX.Element {
	const editor = useAttributeMappingEditor();
	return (
		<AttributeMappingsTab
			editor={editor}
			onEditGroup={onEditGroup ?? jest.fn()}
			onAddGroup={onAddGroup ?? jest.fn()}
		/>
	);
}

function SaveableHarness(): JSX.Element {
	const editor = useAttributeMappingEditor();
	return (
		<>
			<button
				type="button"
				data-testid="save-button"
				onClick={(): void => {
					void editor.save();
				}}
			>
				Save
			</button>
			<AttributeMappingsTab
				editor={editor}
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
		render(<AttributeMappingsTabWithStore />);

		await waitFor(() =>
			expect(screen.getByTestId('group-name-group-1')).toBeInTheDocument(),
		);
		expect(screen.queryByRole('alert')).not.toBeInTheDocument();
	});

	it('shows an error banner when the groups request fails', async () => {
		server.use(
			rest.get(GROUPS_ENDPOINT, (_req, res, ctx) => res(ctx.status(500))),
		);
		render(<AttributeMappingsTabWithStore />);

		await expect(screen.findByRole('alert')).resolves.toHaveTextContent(
			'Failed to load mapping groups. Please try again.',
		);
	});

	it('shows the empty state when there are no groups', async () => {
		setupGroups([]);
		render(<AttributeMappingsTabWithStore />);

		await expect(
			screen.findByTestId('mapper-groups-empty'),
		).resolves.toHaveTextContent('No mapping groups yet.');
	});

	it('renders each group header row with its name, condition count and status', async () => {
		setupGroups();
		render(<AttributeMappingsTabWithStore />);

		// Condition filters are no longer shown inline as clauses — the header
		// carries a count instead (the keys surface in the group drawer).
		// Every field carries a group-scoped testId, so assert on them directly.
		await screen.findByTestId('group-name-group-1');

		// group-1: enabled, with attribute + resource condition keys.
		expect(screen.getByTestId('group-name-group-1')).toHaveTextContent('demo');
		expect(screen.getByTestId('group-condition-count-group-1')).toHaveTextContent(
			'2 conditions',
		);
		expect(screen.getByTestId('group-enabled-group-1')).toBeChecked();

		// group-2: disabled.
		expect(screen.getByTestId('group-name-group-2')).toHaveTextContent('Tool');
		expect(screen.getByTestId('group-condition-count-group-2')).toHaveTextContent(
			'0 conditions',
		);
		expect(screen.getByTestId('group-enabled-group-2')).not.toBeChecked();
	});

	it("stages a toggle of the group's enabled state via the header switch", async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		setupGroups();
		render(<AttributeMappingsTabWithStore />);

		const toggle = await screen.findByTestId('group-enabled-group-1');
		expect(toggle).toBeChecked();

		await user.click(toggle);
		expect(screen.getByTestId('group-enabled-group-1')).not.toBeChecked();
	});

	it('invokes onAddGroup from the toolbar button', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		const onAddGroup = jest.fn();
		setupGroups();
		render(<AttributeMappingsTabWithStore onAddGroup={onAddGroup} />);

		await screen.findByTestId('group-name-group-1');
		await user.click(screen.getByTestId('add-group-row'));

		expect(onAddGroup).toHaveBeenCalledTimes(1);
	});

	it('invokes onEditGroup with the group when Edit is chosen from the actions menu', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		const onEditGroup = jest.fn();
		setupGroups();
		render(<AttributeMappingsTabWithStore onEditGroup={onEditGroup} />);

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
		render(<AttributeMappingsTabWithStore />);

		await screen.findByTestId('group-name-group-1');
		await openGroupActionsMenu(user, 'group-1');
		await user.click(await screen.findByRole('menuitem', { name: 'Delete' }));

		await waitFor(() =>
			expect(screen.queryByTestId('group-name-group-1')).not.toBeInTheDocument(),
		);
		expect(screen.getByTestId('group-name-group-2')).toBeInTheDocument();
	});

	it("reveals a group's mappers on expand and hides them on collapse", async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		setupGroups();
		setupMappers([makeMapper({ id: 'mapper-1' })]);
		render(<AttributeMappingsTabWithStore />);

		await screen.findByTestId('group-name-group-1');
		// The clickable Collapse header owns the expanded state; find it by the
		// aria-expanded contract rather than any framework-internal class.
		const header = screen
			.getByTestId('group-expand-group-1')
			.closest('[aria-expanded]') as HTMLElement;
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
		render(<AttributeMappingsTabWithStore />);

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
		render(<AttributeMappingsTabWithStore />);

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
		render(<AttributeMappingsTabWithStore />);

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
		render(<AttributeMappingsTabWithStore />);

		await screen.findByTestId('group-name-group-1');
		await expandGroup(user);

		await expect(screen.findByText('+2 more')).resolves.toBeInTheDocument();
	});

	it('shows a muted placeholder when a mapper has no sources', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		setupGroups();
		setupMappers([makeMapper({ id: 'mapper-1', config: { sources: [] } })]);
		render(<AttributeMappingsTabWithStore />);

		await screen.findByTestId('group-name-group-1');
		await expandGroup(user);

		await waitFor(() =>
			expect(screen.getByTestId('mapper-sources-mapper-1')).toHaveTextContent('—'),
		);
	});

	it("re-fetches an open group's mappers on save instead of showing stale rows", async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		setupGroups();

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

		mappers = [makeMapper({ id: 'mapper-2', name: 'gen_ai.response.model' })];

		await user.click(screen.getByTestId('save-button'));

		await expect(
			screen.findByTestId('mapper-target-mapper-2'),
		).resolves.toHaveTextContent('gen_ai.response.model');
		expect(
			screen.queryByTestId('mapper-target-mapper-1'),
		).not.toBeInTheDocument();
	});

	it('warns and keeps the working copy when the post-save refresh fails', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		(toast.success as jest.Mock).mockClear();
		(toast.warning as jest.Mock).mockClear();

		let failRefresh = false;
		server.use(
			rest.get(GROUPS_ENDPOINT, (_req, res, ctx) =>
				failRefresh
					? res(ctx.status(500), ctx.json({ status: 'error' }))
					: res(ctx.status(200), ctx.json(makeGroupsResponse(mockGroups))),
			),
			rest.patch(`${GROUPS_ENDPOINT}/:groupId`, (_req, res, ctx) =>
				res(ctx.status(200), ctx.json({ status: 'ok' })),
			),
		);
		render(<SaveableHarness />);

		const toggle = await screen.findByTestId('group-enabled-group-1');
		expect(toggle).toBeChecked();

		await user.click(toggle);
		expect(screen.getByTestId('group-enabled-group-1')).not.toBeChecked();

		failRefresh = true;
		await user.click(screen.getByTestId('save-button'));

		await waitFor(() => expect(toast.warning).toHaveBeenCalled());
		expect(toast.success).not.toHaveBeenCalled();
	});

	describe('mapper drawer', () => {
		async function openGroupWithMapper(
			user: ReturnType<typeof userEvent.setup>,
		): Promise<void> {
			setupGroups();
			setupMappers([makeMapper({ id: 'mapper-1', name: 'gen_ai.request.model' })]);
			render(<AttributeMappingsTabWithStore />);

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

			await user.click(screen.getByRole('button', { name: 'Mapping actions' }));
			await user.click(await screen.findByRole('menuitem', { name: 'Edit' }));

			await expect(
				screen.findByTestId('mapper-form-drawer'),
			).resolves.toBeInTheDocument();
			expect(screen.getByText('Edit mapping')).toBeInTheDocument();
			const target = screen.getByTestId('mapper-form-target');
			expect(target).toHaveValue('gen_ai.request.model');
			expect(target).toBeDisabled();
		});

		it("toggles a mapper's enabled state through the store", async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			await openGroupWithMapper(user);

			const toggle = screen.getByTestId('mapper-enabled-mapper-1');
			expect(toggle).toBeChecked();

			await user.click(toggle);

			await waitFor(() =>
				expect(screen.getByTestId('mapper-enabled-mapper-1')).not.toBeChecked(),
			);
		});

		it('removes a mapper via the row action menu', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			await openGroupWithMapper(user);

			await user.click(screen.getByRole('button', { name: 'Mapping actions' }));
			await user.click(await screen.findByRole('menuitem', { name: 'Delete' }));

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

			expect(screen.getByTestId('mapper-form-save')).toBeDisabled();

			await user.type(
				screen.getByTestId('mapper-form-target'),
				'gen_ai.response.model',
			);
			await user.type(screen.getByTestId('mapper-form-source-0'), 'raw.model');

			const create = screen.getByTestId('mapper-form-save');
			await waitFor(() => expect(create).toBeEnabled());
			await user.click(create);

			await waitFor(() =>
				expect(screen.queryByTestId('mapper-form-drawer')).not.toBeInTheDocument(),
			);
			await expect(
				screen.findByText('gen_ai.response.model'),
			).resolves.toBeInTheDocument();
		});
	});
});
