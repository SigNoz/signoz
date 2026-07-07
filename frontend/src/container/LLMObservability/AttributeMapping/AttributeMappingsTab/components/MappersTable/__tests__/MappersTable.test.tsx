import {
	SpantypesFieldContextDTO as FieldContext,
	SpantypesSpanMapperOperationDTO as MapperOperation,
} from 'api/generated/services/sigNoz.schemas';
import { rest, server } from 'mocks-server/server';
import { render, screen, waitFor } from 'tests/test-utils';

import { AttributeMappingStore } from '../../../hooks/useAttributeMappingStore';
import {
	makeGroup,
	makeMapper,
	makeMappersResponse,
	mappersEndpoint,
} from '../../../../__tests__/fixtures';
import { buildDraftGroup } from '../../../../utils';
import MappersTable from '../MappersTable';

// MappersTable is store-driven: it renders the group's draft mappers and folds
// the lazy fetch into the store via hydrateGroupMappers. These rendering tests
// supply the draft mappers on the group directly and stub the store callbacks.
function storeWith(
	overrides: Partial<AttributeMappingStore> = {},
): AttributeMappingStore {
	return {
		groups: [],
		snapshot: [],
		isLoading: false,
		isError: false,
		isDirty: false,
		isSaving: false,
		saveError: null,
		upsertGroup: jest.fn(),
		removeGroup: jest.fn(),
		toggleGroup: jest.fn(),
		hydrateGroupMappers: jest.fn(),
		upsertMapper: jest.fn(),
		removeMapper: jest.fn(),
		toggleMapper: jest.fn(),
		save: jest.fn(),
		discard: jest.fn(),
		...overrides,
	};
}

function setupMappers(mappers = [makeMapper()]): void {
	server.use(
		rest.get(mappersEndpoint('group-1'), (_req, res, ctx) =>
			res(ctx.status(200), ctx.json(makeMappersResponse(mappers))),
		),
	);
}

describe('MappersTable', () => {
	afterEach(() => {
		server.resetHandlers();
	});

	it('shows the error state when the mappers request fails', async () => {
		server.use(
			rest.get(mappersEndpoint('group-1'), (_req, res, ctx) =>
				res(ctx.status(500)),
			),
		);
		render(
			<MappersTable
				group={buildDraftGroup(makeGroup({ id: 'group-1' }), [])}
				store={storeWith()}
			/>,
		);

		await expect(
			screen.findByTestId('mappers-error-group-1'),
		).resolves.toHaveTextContent('Failed to load mappings. Please try again.');
	});

	it('shows the empty state when the group has no mappers', async () => {
		setupMappers([]);
		render(
			<MappersTable
				group={buildDraftGroup(makeGroup({ id: 'group-1' }), [])}
				store={storeWith()}
			/>,
		);

		await expect(
			screen.findByTestId('mappers-empty-group-1'),
		).resolves.toHaveTextContent('No mappings in this group yet.');
	});

	it('does not fetch and shows the empty state for a group with no server id', () => {
		const fetchSpy = jest.fn();
		server.use(
			rest.get(mappersEndpoint('group-1'), (_req, res, ctx) => {
				fetchSpy();
				return res(ctx.status(200), ctx.json(makeMappersResponse([])));
			}),
		);
		const draftGroup = {
			...buildDraftGroup(makeGroup({ id: 'group-1' }), []),
			serverId: null,
		};

		render(<MappersTable group={draftGroup} store={storeWith()} />);

		expect(screen.getByTestId('mappers-empty-group-1')).toBeInTheDocument();
		expect(fetchSpy).not.toHaveBeenCalled();
	});

	it('renders a mapper row with target, sources, field context and status', async () => {
		const mapper = makeMapper({
			id: 'mapper-1',
			name: 'gen_ai.request.model',
			enabled: true,
		});
		setupMappers([mapper]);
		render(
			<MappersTable
				group={buildDraftGroup(makeGroup({ id: 'group-1' }), [mapper])}
				store={storeWith()}
			/>,
		);

		await waitFor(() =>
			expect(screen.getByTestId('mapper-target-mapper-1')).toBeInTheDocument(),
		);
		expect(screen.getByTestId('mapper-target-mapper-1')).toHaveTextContent(
			'gen_ai.request.model',
		);
		const sources = screen.getByTestId('mapper-sources-mapper-1');
		expect(sources).toHaveTextContent('genai.model');
		expect(sources).toHaveTextContent('llm.model');
		expect(screen.getByText('attribute')).toBeInTheDocument();
		expect(screen.getByTestId('mapper-enabled-mapper-1')).toBeChecked();
	});

	it('collapses extra sources into a "+N more" label beyond the visible cap', async () => {
		const mapper = makeMapper({
			id: 'mapper-1',
			config: {
				sources: [1, 2, 3, 4, 5].map((priority) => ({
					key: `source-${priority}`,
					context: FieldContext.attribute,
					operation: MapperOperation.copy,
					priority,
				})),
			},
		});
		setupMappers([mapper]);
		render(
			<MappersTable
				group={buildDraftGroup(makeGroup({ id: 'group-1' }), [mapper])}
				store={storeWith()}
			/>,
		);

		await expect(screen.findByText('+2 more')).resolves.toBeInTheDocument();
	});

	it('shows a muted placeholder when a mapper has no sources', async () => {
		const mapper = makeMapper({ id: 'mapper-1', config: { sources: [] } });
		setupMappers([mapper]);
		render(
			<MappersTable
				group={buildDraftGroup(makeGroup({ id: 'group-1' }), [mapper])}
				store={storeWith()}
			/>,
		);

		await waitFor(() =>
			expect(screen.getByTestId('mapper-sources-mapper-1')).toHaveTextContent('—'),
		);
	});
});
