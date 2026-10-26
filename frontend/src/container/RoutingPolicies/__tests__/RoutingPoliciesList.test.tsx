import { VirtuosoMockContext } from 'react-virtuoso';
import { render, screen, userEvent } from 'tests/test-utils';

import RoutingPolicyList from '../RoutingPolicyList';
import { getRoutingPolicyColumns } from '../table.config';
import { RoutingPolicyListProps } from '../types';
import { MOCK_ROUTING_POLICY_1, MOCK_ROUTING_POLICY_2 } from './testUtils';

const POLICIES = [MOCK_ROUTING_POLICY_1, MOCK_ROUTING_POLICY_2];

function renderList(
	overrides: Partial<RoutingPolicyListProps> = {},
): RoutingPolicyListProps {
	const props: RoutingPolicyListProps = {
		columns: getRoutingPolicyColumns((date) => date),
		routingPolicies: POLICIES,
		pagedPolicies: POLICIES,
		calculatedPageSize: null,
		onLimitChange: jest.fn(),
		isFetching: false,
		isError: false,
		refetch: jest.fn(),
		canEdit: true,
		onEdit: jest.fn(),
		onDelete: jest.fn(),
		onCreate: jest.fn(),
		hasSearchTerm: false,
		onClearSearch: jest.fn(),
		...overrides,
	};
	render(
		<VirtuosoMockContext.Provider value={{ viewportHeight: 800, itemHeight: 46 }}>
			<RoutingPolicyList {...props} />
		</VirtuosoMockContext.Provider>,
	);
	return props;
}

describe('RoutingPolicyList', () => {
	it('renders the key policy fields and hides audit columns by default', async () => {
		renderList();

		await expect(
			screen.findByTestId(`routing-policy-row-${MOCK_ROUTING_POLICY_1.id}-name`),
		).resolves.toHaveTextContent(MOCK_ROUTING_POLICY_1.name);
		expect(
			screen.getByTestId(`routing-policy-row-${MOCK_ROUTING_POLICY_2.id}-name`),
		).toHaveTextContent(MOCK_ROUTING_POLICY_2.name);

		expect(
			screen.getByText(MOCK_ROUTING_POLICY_1.expression),
		).toBeInTheDocument();
		expect(
			screen.queryByText(MOCK_ROUTING_POLICY_1.description as string),
		).not.toBeInTheDocument();
		expect(
			screen.getByText(MOCK_ROUTING_POLICY_1.channels?.[0] || ''),
		).toBeInTheDocument();
		expect(
			screen.queryByText(MOCK_ROUTING_POLICY_1.createdBy as string),
		).not.toBeInTheDocument();
		expect(
			screen.queryByText(MOCK_ROUTING_POLICY_2.updatedBy as string),
		).not.toBeInTheDocument();
	});

	it('lets every data column be resized', async () => {
		renderList();

		await screen.findByText(MOCK_ROUTING_POLICY_1.name);
		const resizable = Array.from(document.querySelectorAll('th'))
			.filter((th) => th.querySelector('[title="Drag to resize column"]'))
			.map((th) => th.textContent?.trim());
		expect(resizable).toStrictEqual(['Routing Policy', 'Expression', 'Channels']);
	});

	it('opens the policy on row click', async () => {
		const { onEdit } = renderList();

		await userEvent.click(
			await screen.findByTestId(
				`routing-policy-row-${MOCK_ROUTING_POLICY_1.id}-name`,
			),
		);

		expect(onEdit).toHaveBeenCalledWith(
			MOCK_ROUTING_POLICY_1,
			MOCK_ROUTING_POLICY_1.id,
			expect.anything(),
		);
	});

	it('edits and deletes from the actions menu', async () => {
		const { onEdit, onDelete } = renderList();
		const actions = `routing-policy-actions-${MOCK_ROUTING_POLICY_1.id}`;

		await userEvent.click(await screen.findByTestId(actions));
		await userEvent.click(await screen.findByText('Edit'));
		expect(onEdit).toHaveBeenCalledWith(MOCK_ROUTING_POLICY_1);

		await userEvent.click(screen.getByTestId(actions));
		await userEvent.click(await screen.findByText('Delete'));
		expect(onDelete).toHaveBeenCalledWith(MOCK_ROUTING_POLICY_1);
	});

	it('hides actions and row click for viewers', async () => {
		const { onEdit } = renderList({ canEdit: false });

		await userEvent.click(
			await screen.findByTestId(
				`routing-policy-row-${MOCK_ROUTING_POLICY_1.id}-name`,
			),
		);

		expect(
			screen.queryByTestId(`routing-policy-actions-${MOCK_ROUTING_POLICY_1.id}`),
		).not.toBeInTheDocument();
		expect(onEdit).not.toHaveBeenCalled();
	});

	it('renders the error state with a refresh', async () => {
		const { refetch } = renderList({ isError: true, routingPolicies: [] });

		expect(screen.getByTestId('error-title')).toHaveTextContent(
			'Failed to load routing policies',
		);
		await userEvent.click(screen.getByTestId('error-refresh-button'));
		expect(refetch).toHaveBeenCalled();
	});

	it('renders the no-results state when a search matches nothing', async () => {
		const { onClearSearch } = renderList({
			routingPolicies: [],
			pagedPolicies: [],
			hasSearchTerm: true,
		});

		await userEvent.click(screen.getByTestId('no-results-clear-button'));
		expect(onClearSearch).toHaveBeenCalled();
	});

	it('renders the empty state with a create action', async () => {
		const { onCreate } = renderList({ routingPolicies: [], pagedPolicies: [] });

		expect(
			screen.getByTestId('routing-policies-empty-state'),
		).toBeInTheDocument();
		await userEvent.click(screen.getByTestId('routing-policies-empty-create'));
		expect(onCreate).toHaveBeenCalled();
	});

	it('hides the empty-state create action for viewers', () => {
		renderList({ routingPolicies: [], pagedPolicies: [], canEdit: false });

		expect(
			screen.queryByTestId('routing-policies-empty-create'),
		).not.toBeInTheDocument();
	});
});
