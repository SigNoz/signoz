import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
import logEvent from 'api/common/logEvent';
import { act, render, waitFor } from 'tests/test-utils';

import {
	INFRA_MONITORING_K8S_PARAMS_KEYS,
	InfraMonitoringEntity,
} from '../../constants';
import K8sBaseDetails from '../K8sBaseDetails';
import {
	DrawerHistoryEntry,
	useDrawerHistoryStore,
} from '../useDrawerHistoryStore';

jest.mock('container/TopNav/DateTimeSelectionV2/index.tsx', () => ({
	__esModule: true,
	default: (): JSX.Element => <div data-testid="mock-datetime" />,
}));

jest.mock('api/common/logEvent', () => ({
	__esModule: true,
	default: jest.fn(() => Promise.resolve()),
}));

const logEventMock = jest.mocked(logEvent);

// The breadcrumb of the trail reads `maxWidth`, which the fallback style of
// jest.setup.ts does not carry.
const baseGetComputedStyle = window.getComputedStyle;

beforeAll(() => {
	window.getComputedStyle = (
		element: Element,
		pseudoElement?: string | null,
	): CSSStyleDeclaration => {
		const style = baseGetComputedStyle(element, pseudoElement);

		return style.maxWidth === undefined
			? ({ ...style, maxWidth: '' } as CSSStyleDeclaration)
			: style;
	};
});

afterAll(() => {
	window.getComputedStyle = baseGetComputedStyle;
});

type TestEntity = { name: string };

const mockEntity: TestEntity = { name: 'test-container' };

const entryFor = (
	category: InfraMonitoringEntity,
	name: string,
	queryKeyPrefix: string,
): DrawerHistoryEntry => ({
	params: {
		selectedItem: name,
		category,
		clusterName: null,
		namespaceName: null,
	},
	category,
	label: name,
	entity: { name },
	queryKeyPrefix,
});

/** What the drawer records before opening a resource from another's overview */
const CLUSTER_ENTRY = entryFor(
	InfraMonitoringEntity.CLUSTERS,
	'cluster-1',
	'cluster',
);
const NODE_ENTRY = entryFor(InfraMonitoringEntity.NODES, 'node-1', 'node');

const trail = (): HTMLElement => screen.getByTestId('drawer-wrapper-trail');

const crumb = (name: string): HTMLElement =>
	within(trail()).getByRole('button', { name });

const selectedItems = (onUrlUpdate: jest.Mock): (string | null)[] =>
	onUrlUpdate.mock.calls.map((call) =>
		call[0].searchParams.get(INFRA_MONITORING_K8S_PARAMS_KEYS.SELECTED_ITEM),
	);

function renderDrawer(onUrlUpdate?: jest.Mock): void {
	render(
		<NuqsTestingAdapter
			searchParams={{
				[INFRA_MONITORING_K8S_PARAMS_KEYS.SELECTED_ITEM]: 'container-1',
			}}
			onUrlUpdate={onUrlUpdate}
		>
			<K8sBaseDetails<TestEntity>
				category={InfraMonitoringEntity.CONTAINERS}
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

describe('K8sBaseDetails - trail', () => {
	beforeEach(() => {
		useDrawerHistoryStore.getState().reset();
		logEventMock.mockClear();
	});

	it('shows no trail when opened from the list', async () => {
		act(() => {
			renderDrawer();
		});

		await waitFor(() => {
			expect(screen.getAllByText('test-container').length).toBeGreaterThan(0);
		});

		expect(screen.queryByTestId('drawer-wrapper-trail')).not.toBeInTheDocument();
		expect(screen.queryByTestId('drawer-back-button')).not.toBeInTheDocument();
		expect(screen.getByTestId('drawer-wrapper-close')).toBeInTheDocument();
	});

	it('lists the resources this one was opened from, root first, ending on itself', async () => {
		useDrawerHistoryStore.getState().push(CLUSTER_ENTRY);
		useDrawerHistoryStore.getState().push(NODE_ENTRY);

		act(() => {
			renderDrawer();
		});

		await screen.findByTestId('drawer-wrapper-trail');

		const items = [0, 1, 2].map((index) =>
			screen.getByTestId(`drawer-wrapper-trail-breadcrumb-item-${index}`),
		);

		expect(items[0]).toHaveTextContent('cluster-1');
		expect(items[1]).toHaveTextContent('node-1');
		await waitFor(() => expect(items[2]).toHaveTextContent('test-container'));
		expect(within(items[2]).queryByRole('button')).not.toBeInTheDocument();
		expect(screen.getByTestId('drawer-wrapper-close')).toBeInTheDocument();
	});

	it('returns to a resource when its crumb is pressed', async () => {
		const user = userEvent.setup();
		const onUrlUpdate = jest.fn();

		useDrawerHistoryStore.getState().push(NODE_ENTRY);

		act(() => {
			renderDrawer(onUrlUpdate);
		});

		await screen.findByTestId('drawer-wrapper-trail');
		await user.click(crumb('node-1'));

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

		expect(useDrawerHistoryStore.getState().entries).toHaveLength(0);
	});

	it('drops the crumbs after the one pressed', async () => {
		const user = userEvent.setup();
		const onUrlUpdate = jest.fn();

		useDrawerHistoryStore.getState().push(CLUSTER_ENTRY);
		useDrawerHistoryStore.getState().push(NODE_ENTRY);

		act(() => {
			renderDrawer(onUrlUpdate);
		});

		await screen.findByTestId('drawer-wrapper-trail');
		await user.click(crumb('cluster-1'));

		await waitFor(() => {
			expect(selectedItems(onUrlUpdate)).toContain('cluster-1');
		});

		expect(useDrawerHistoryStore.getState().entries).toHaveLength(0);
	});

	it('steps back one resource on Escape and stays open', async () => {
		const user = userEvent.setup();
		const onUrlUpdate = jest.fn();

		useDrawerHistoryStore.getState().push(CLUSTER_ENTRY);
		useDrawerHistoryStore.getState().push(NODE_ENTRY);

		act(() => {
			renderDrawer(onUrlUpdate);
		});

		await screen.findByTestId('drawer-wrapper-trail');
		await user.keyboard('{Escape}');

		await waitFor(() => {
			expect(selectedItems(onUrlUpdate)).toContain('node-1');
		});

		expect(useDrawerHistoryStore.getState().entries).toEqual([CLUSTER_ENTRY]);
		expect(selectedItems(onUrlUpdate)).not.toContain(null);
	});

	it('closes on Escape once there is no trail left', async () => {
		const user = userEvent.setup();
		const onUrlUpdate = jest.fn();

		act(() => {
			renderDrawer(onUrlUpdate);
		});

		await waitFor(() => {
			expect(screen.getAllByText('test-container').length).toBeGreaterThan(0);
		});

		await user.keyboard('{Escape}');

		await waitFor(() => {
			expect(selectedItems(onUrlUpdate)).toContain(null);
		});
	});

	it('closes the whole drawer from the close button and drops the trail', async () => {
		const user = userEvent.setup();
		const onUrlUpdate = jest.fn();

		useDrawerHistoryStore.getState().push(CLUSTER_ENTRY);
		useDrawerHistoryStore.getState().push(NODE_ENTRY);

		act(() => {
			renderDrawer(onUrlUpdate);
		});

		await screen.findByTestId('drawer-wrapper-trail');
		await user.click(screen.getByTestId('drawer-wrapper-close'));

		await waitFor(() => {
			expect(selectedItems(onUrlUpdate)).toContain(null);
		});

		expect(selectedItems(onUrlUpdate)).not.toContain('node-1');
		expect(useDrawerHistoryStore.getState().entries).toHaveLength(0);
	});

	it('logs a drawer visit for a resource reached from the cache', async () => {
		const user = userEvent.setup();

		useDrawerHistoryStore
			.getState()
			.push(
				entryFor(InfraMonitoringEntity.CONTAINERS, 'container-0', 'testContainer'),
			);

		act(() => {
			renderDrawer();
		});

		const drawerVisits = (): number =>
			logEventMock.mock.calls.filter(
				([name]) => name === 'Infra Monitoring: Drawer tab viewed',
			).length;

		await waitFor(() => expect(drawerVisits()).toBe(1));

		await user.click(crumb('container-0'));

		await waitFor(() => expect(drawerVisits()).toBe(2));
	});
});
