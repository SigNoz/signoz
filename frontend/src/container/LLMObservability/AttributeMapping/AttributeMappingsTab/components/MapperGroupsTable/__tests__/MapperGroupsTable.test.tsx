import { render, screen, userEvent } from 'tests/test-utils';

import { AttributeMappingStore } from '../../../hooks/useAttributeMappingStore';
import { buildDraftGroup } from '../../../../utils';
import { makeGroup } from '../../../../__tests__/fixtures';
import MapperGroupsTable from '../MapperGroupsTable';

function storeWith(
	overrides: Partial<AttributeMappingStore>,
): AttributeMappingStore {
	return { groups: [], isLoading: false, isError: false, ...overrides };
}

describe('MapperGroupsTable', () => {
	beforeEach(() => {
		// The shared TanStackTable owns page/limit URL state via nuqs, which
		// reads window.location — jsdom shares that across tests in a file.
		window.history.pushState(null, '', '/');
	});

	it('renders the empty state when not loading and there are no groups', () => {
		render(<MapperGroupsTable store={storeWith({ groups: [] })} />);

		expect(screen.getByTestId('mapper-groups-empty')).toHaveTextContent(
			'No mapping groups yet.',
		);
	});

	it('does not show the empty state while loading even with no groups', () => {
		render(
			<MapperGroupsTable store={storeWith({ groups: [], isLoading: true })} />,
		);

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
		render(<MapperGroupsTable store={storeWith({ groups: [group] })} />);

		expect(screen.getByTestId('group-name-group-1')).toHaveTextContent('demo');
		const filters = screen.getByTestId('group-filters-group-1');
		expect(filters).toHaveTextContent('attribute');
		expect(filters).toHaveTextContent('contains ai.embeddings');
		expect(filters).toHaveTextContent('resource');
		expect(filters).toHaveTextContent('contains cloud.account.id');
		expect(screen.getByText('Enabled')).toBeInTheDocument();
	});

	it('shows a disabled badge for a disabled group', () => {
		const group = buildDraftGroup(
			makeGroup({ id: 'group-2', enabled: false, condition: null }),
			[],
		);
		render(<MapperGroupsTable store={storeWith({ groups: [group] })} />);

		expect(screen.getByText('Disabled')).toBeInTheDocument();
	});

	it('shows the no-condition placeholder when a group has no attribute/resource keys', () => {
		const group = buildDraftGroup(
			makeGroup({ id: 'group-3', condition: null }),
			[],
		);
		render(<MapperGroupsTable store={storeWith({ groups: [group] })} />);

		expect(screen.getByTestId('group-filters-group-3')).toHaveTextContent(
			'No condition · always runs',
		);
	});

	it('toggles the expand button label when a row is expanded and collapsed', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		const group = buildDraftGroup(makeGroup({ id: 'group-1' }), []);
		render(<MapperGroupsTable store={storeWith({ groups: [group] })} />);

		const expandButton = screen.getByTestId('group-expand-group-1');
		expect(expandButton).toHaveAccessibleName('Expand group');

		await user.click(expandButton);
		expect(expandButton).toHaveAccessibleName('Collapse group');

		await user.click(expandButton);
		expect(expandButton).toHaveAccessibleName('Expand group');
	});
});
