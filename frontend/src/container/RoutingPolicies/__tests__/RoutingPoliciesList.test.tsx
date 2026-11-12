import { VirtuosoMockContext } from 'react-virtuoso';
import { render, screen, userEvent, waitFor } from 'tests/test-utils';
import { server } from 'mocks-server/server';
import {
	setupAuthzAdmin,
	setupAuthzAllow,
	setupAuthzDenyAll,
} from 'lib/authz/utils/authz-test-utils';
import {
	buildRoutePolicyDeletePermission,
	RoutePolicyAttachPermission,
	RoutePolicyCreatePermission,
} from 'lib/authz/hooks/useAuthZ/permissions/route-policy.permissions';

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

const EDIT_ROW = `routing-policy-edit-${MOCK_ROUTING_POLICY_1.id}`;
const DELETE_ROW = `routing-policy-delete-${MOCK_ROUTING_POLICY_1.id}`;

async function openActions(): Promise<void> {
	await userEvent.click(
		await screen.findByTestId(
			`routing-policy-actions-${MOCK_ROUTING_POLICY_1.id}`,
		),
	);
	// The row's check is batched with others, which can outlast the 1s default.
	await waitFor(
		() =>
			expect(screen.getByTestId(EDIT_ROW)).not.toHaveAttribute('data-loading'),
		{ timeout: 5000 },
	);
}

describe('RoutingPolicyList', () => {
	afterEach(() => {
		server.resetHandlers();
	});

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
		expect(resizable).toStrictEqual(['Routing Policy', 'Channels', 'Expression']);
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

	it('edits and deletes from the actions menu when granted', async () => {
		server.use(setupAuthzAdmin());
		const { onEdit, onDelete } = renderList();

		await openActions();
		await userEvent.click(screen.getByTestId(EDIT_ROW));
		expect(onEdit).toHaveBeenCalledWith(MOCK_ROUTING_POLICY_1);

		await openActions();
		await userEvent.click(screen.getByTestId(DELETE_ROW));
		expect(onDelete).toHaveBeenCalledWith(MOCK_ROUTING_POLICY_1);
	});

	it('disables Edit and Delete when denied', async () => {
		server.use(setupAuthzDenyAll());
		const { onEdit } = renderList();

		await openActions();
		await waitFor(() =>
			expect(screen.getByTestId(EDIT_ROW)).toHaveAttribute('data-disabled'),
		);
		expect(screen.getByTestId(DELETE_ROW)).toHaveAttribute('data-disabled');

		await userEvent.click(screen.getByTestId(EDIT_ROW));
		expect(onEdit).not.toHaveBeenCalled();
	});

	it('gates Edit and Delete on that policy separately', async () => {
		server.use(
			setupAuthzAllow(buildRoutePolicyDeletePermission(MOCK_ROUTING_POLICY_1.id)),
		);
		renderList();

		await openActions();
		await waitFor(() =>
			expect(screen.getByTestId(EDIT_ROW)).toHaveAttribute('data-disabled'),
		);
		expect(screen.getByTestId(DELETE_ROW)).not.toHaveAttribute('data-disabled');
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

	it('renders the empty state with a create action when granted', async () => {
		server.use(setupAuthzAdmin());
		const { onCreate } = renderList({ routingPolicies: [], pagedPolicies: [] });

		expect(
			screen.getByTestId('routing-policies-empty-state'),
		).toBeInTheDocument();
		await waitFor(() =>
			expect(
				screen.getByTestId('routing-policies-empty-create'),
			).not.toHaveAttribute('aria-busy'),
		);
		await userEvent.click(screen.getByTestId('routing-policies-empty-create'));
		expect(onCreate).toHaveBeenCalled();
	});

	it('disables the empty-state create action without attach', async () => {
		server.use(setupAuthzAllow(RoutePolicyCreatePermission));
		renderList({ routingPolicies: [], pagedPolicies: [] });

		await waitFor(() =>
			expect(screen.getByTestId('routing-policies-empty-create')).toHaveAttribute(
				'data-denied-permissions',
				RoutePolicyAttachPermission,
			),
		);
		expect(screen.getByTestId('routing-policies-empty-create')).toHaveAttribute(
			'aria-disabled',
			'true',
		);
	});
});
