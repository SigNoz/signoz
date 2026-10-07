import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InfraMonitoringEvents } from 'constants/events';
import {
	NuqsTestingAdapter,
	type OnUrlUpdateFunction,
} from 'nuqs/adapters/testing';
import { act, render, waitFor } from 'tests/test-utils';

import {
	INFRA_MONITORING_K8S_PARAMS_KEYS,
	InfraMonitoringEntity,
} from '../../constants';
import K8sBaseDetails from '../K8sBaseDetails';
import { useDrawerHistoryStore } from '../useDrawerHistoryStore';

jest.mock('container/TopNav/DateTimeSelectionV2/index.tsx', () => ({
	__esModule: true,
	default: (): JSX.Element => <div data-testid="mock-datetime" />,
}));

type TestEntity = { name: string };

const mockEntity: TestEntity = { name: 'test-container' };

const NODE_PARAMS = {
	selectedItem: 'node-1',
	category: InfraMonitoringEntity.NODES,
	clusterName: null,
	namespaceName: null,
};

/** What the drawer records before opening a resource from the node's overview */
const NODE_ENTRY = {
	params: NODE_PARAMS,
	category: InfraMonitoringEntity.NODES,
	label: 'node-1',
	entity: { name: 'node-1' },
	queryKeyPrefix: 'node',
};

function renderDrawer(onUrlUpdate?: OnUrlUpdateFunction): void {
	render(
		<NuqsTestingAdapter
			searchParams={{
				[INFRA_MONITORING_K8S_PARAMS_KEYS.SELECTED_ITEM]: 'container-1',
			}}
			onUrlUpdate={onUrlUpdate}
		>
			<K8sBaseDetails<TestEntity>
				category={InfraMonitoringEntity.CONTAINERS}
				eventCategory={InfraMonitoringEvents.Pod}
				getSelectedItemExpression={(): string => "k8s.pod.uid = 'abc'"}
				fetchEntityData={jest
					.fn()
					.mockResolvedValue({ data: mockEntity, error: null })}
				getEntityName={(entity): string => entity.name}
				getInitialLogTracesExpression={(): string => ''}
				getInitialEventsExpression={(): string => ''}
				metadataConfig={[
					{ label: 'Name', getValue: (entity): string => entity.name },
				]}
				entityWidgetInfo={[{ title: 'CPU', yAxisUnit: 'percent' }]}
				getEntityQueryPayload={jest.fn().mockReturnValue([])}
				queryKeyPrefix="testContainer"
			/>
		</NuqsTestingAdapter>,
	);
}

describe('K8sBaseDetails - back navigation', () => {
	beforeEach(() => {
		useDrawerHistoryStore.getState().reset();
	});

	it('closes rather than going back when opened from the list', async () => {
		act(() => {
			renderDrawer();
		});

		await waitFor(() => {
			expect(screen.getAllByText('test-container').length).toBeGreaterThan(0);
		});

		expect(screen.queryByTestId('drawer-back-button')).not.toBeInTheDocument();
		expect(screen.getByTestId('close-drawer-button')).toBeInTheDocument();
	});

	it('replaces the close control while there is somewhere to go back to', async () => {
		useDrawerHistoryStore.getState().push(NODE_ENTRY);

		act(() => {
			renderDrawer();
		});

		const backButton = await screen.findByTestId('drawer-back-button');

		// The control stays an icon, and names the resource it returns to
		expect(backButton).toHaveTextContent('');
		expect(backButton).toHaveAccessibleName('Back to node: node-1');
		expect(screen.queryByTestId('close-drawer-button')).not.toBeInTheDocument();
	});

	it('returns to the resource this one was opened from', async () => {
		const user = userEvent.setup();
		const onUrlUpdate = jest.fn();

		useDrawerHistoryStore.getState().push(NODE_ENTRY);

		act(() => {
			renderDrawer(onUrlUpdate);
		});

		const backButton = await screen.findByTestId('drawer-back-button');
		await user.click(backButton);

		await waitFor(() => {
			const params = onUrlUpdate.mock.calls.map((call) => call[0].searchParams);
			expect(
				params.some(
					(searchParams) =>
						searchParams.get(INFRA_MONITORING_K8S_PARAMS_KEYS.SELECTED_ITEM) ===
							'node-1' &&
						searchParams.get(
							INFRA_MONITORING_K8S_PARAMS_KEYS.SELECTED_ITEM_CATEGORY,
						) === InfraMonitoringEntity.NODES,
				),
			).toBe(true);
		});

		// The trail is one step shorter, so a second back closes instead
		expect(useDrawerHistoryStore.getState().entries).toHaveLength(0);
	});

	it('drops the trail when the drawer is dismissed', async () => {
		const user = userEvent.setup();

		useDrawerHistoryStore.getState().push(NODE_ENTRY);

		act(() => {
			renderDrawer();
		});

		await screen.findByTestId('drawer-back-button');
		// Dismissing from outside the drawer, the way a click on the overlay does
		await user.keyboard('{Escape}');

		await waitFor(() => {
			expect(useDrawerHistoryStore.getState().entries).toHaveLength(0);
		});
	});
});
