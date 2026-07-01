import { render, screen } from 'tests/test-utils';

import { AttributeMappingStore } from '../../../hooks/useAttributeMappingStore';
import { buildDraftGroup } from '../../../../utils';
import { makeGroup } from '../../../../__tests__/fixtures';
import MapperGroupsTable from '../MapperGroupsTable';

function storeWith(
	overrides: Partial<AttributeMappingStore>,
): AttributeMappingStore {
	return {
		groups: [],
		isLoading: false,
		isError: false,
		isDirty: false,
		isSaving: false,
		saveError: null,
		upsertGroup: jest.fn(),
		removeGroup: jest.fn(),
		toggleGroup: jest.fn(),
		save: jest.fn(),
		discard: jest.fn(),
		...overrides,
	};
}

// The table is driven by the container's store plus edit/add callbacks. These
// tests focus on rendering, so the callbacks are no-ops.
function renderTable(store: AttributeMappingStore): void {
	render(
		<MapperGroupsTable
			store={store}
			onEditGroup={jest.fn()}
			onAddGroup={jest.fn()}
		/>,
	);
}

describe('MapperGroupsTable', () => {
	beforeEach(() => {
		// The shared TanStackTable owns page/limit URL state via nuqs, which
		// reads window.location — jsdom shares that across tests in a file.
		window.history.pushState(null, '', '/');
	});

	it('renders the empty state when not loading and there are no groups', () => {
		renderTable(storeWith({ groups: [] }));

		expect(screen.getByTestId('mapper-groups-empty')).toHaveTextContent(
			'No mapping groups yet.',
		);
	});

	it('does not show the empty state while loading even with no groups', () => {
		renderTable(storeWith({ groups: [], isLoading: true }));

		expect(screen.queryByTestId('mapper-groups-empty')).not.toBeInTheDocument();
		expect(screen.getByTestId('mapper-groups-table')).toBeInTheDocument();
	});

	it('renders a row with its name, condition filters and enabled status', () => {
		const group = buildDraftGroup(
			makeGroup({
				id: 'group-1',
				name: 'demo',
				enabled: true,
				condition: {
					attributes: ['ai.embeddings'],
					resource: ['cloud.account.id'],
				},
			}),
			[],
		);
		renderTable(storeWith({ groups: [group] }));

		expect(screen.getByTestId('group-name-group-1')).toHaveTextContent('demo');
		const filters = screen.getByTestId('group-filters-group-1');
		expect(filters).toHaveTextContent('attribute');
		expect(filters).toHaveTextContent('contains ai.embeddings');
		expect(filters).toHaveTextContent('resource');
		expect(filters).toHaveTextContent('contains cloud.account.id');
		expect(screen.getByTestId('group-enabled-group-1')).toBeChecked();
	});

	it('shows a disabled badge for a disabled group', () => {
		const group = buildDraftGroup(
			makeGroup({ id: 'group-2', enabled: false, condition: null }),
			[],
		);
		renderTable(storeWith({ groups: [group] }));

		expect(screen.getByTestId('group-enabled-group-2')).not.toBeChecked();
	});

	it('shows the no-condition placeholder when a group has no attribute/resource keys', () => {
		const group = buildDraftGroup(
			makeGroup({ id: 'group-3', condition: null }),
			[],
		);
		renderTable(storeWith({ groups: [group] }));

		expect(screen.getByTestId('group-filters-group-3')).toHaveTextContent(
			'No condition · always runs',
		);
	});

	// NOTE: the expand/collapse affordance is verified end-to-end in
	// AttributeMappingsTab.test.tsx ("lazily fetches and renders a group's
	// mappers on first expand"). It isn't re-tested here because the shared
	// TanStackTable keeps row-expanded state in URL params (nuqs), which does
	// not toggle reliably when the table is mounted in isolation in jsdom.
});
