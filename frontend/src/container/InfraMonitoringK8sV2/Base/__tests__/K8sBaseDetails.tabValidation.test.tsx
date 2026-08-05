import { Box } from '@signozhq/icons';
import { screen } from '@testing-library/react';
import { InfraMonitoringEvents } from 'constants/events';
import userEvent from '@testing-library/user-event';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
import { act, render, waitFor } from 'tests/test-utils';

import {
	InfraMonitoringEntity,
	INFRA_MONITORING_K8S_PARAMS_KEYS,
	VIEW_TYPES,
} from '../../constants';
import K8sBaseDetails from '../K8sBaseDetails';

jest.mock('container/TopNav/DateTimeSelectionV2/index.tsx', () => ({
	__esModule: true,
	default: (): JSX.Element => <div data-testid="mock-datetime" />,
}));

type TestEntity = {
	name: string;
	namespace: string;
	cluster: string;
};

const mockEntity: TestEntity = {
	name: 'test-pod',
	namespace: 'default',
	cluster: 'test-cluster',
};

function createBaseProps() {
	return {
		category: InfraMonitoringEntity.PODS,
		eventCategory: InfraMonitoringEvents.Pod,
		getSelectedItemExpression: (): string => 'k8s.pod.name = "test-pod"',
		fetchEntityData: jest
			.fn()
			.mockResolvedValue({ data: mockEntity, error: null }),
		getEntityName: (e: TestEntity): string => e.name,
		getInitialLogTracesExpression: (): string => 'k8s.pod.name = "test-pod"',
		getInitialEventsExpression: (): string => 'k8s.pod.name = "test-pod"',
		metadataConfig: [
			{ label: 'Name', getValue: (e: TestEntity): string => e.name },
		],
		entityWidgetInfo: [{ title: 'CPU', yAxisUnit: 'percent' }],
		getEntityQueryPayload: jest.fn().mockReturnValue([]),
		queryKeyPrefix: 'testPod',
	};
}

interface RenderOptions {
	view?: string;
	tabsConfig?: {
		showMetrics?: boolean;
		showLogs?: boolean;
		showTraces?: boolean;
		showEvents?: boolean;
	};
	customTabs?: Array<{
		key: string;
		label: string;
		icon: React.ReactNode;
		render: () => React.ReactNode;
	}>;
}

function renderK8sBaseDetails({
	view = VIEW_TYPES.METRICS,
	tabsConfig,
	customTabs,
}: RenderOptions = {}) {
	const searchParams: Record<string, string> = {
		[INFRA_MONITORING_K8S_PARAMS_KEYS.SELECTED_ITEM]: 'test-pod',
		[INFRA_MONITORING_K8S_PARAMS_KEYS.VIEW]: view,
	};

	return render(
		<NuqsTestingAdapter searchParams={searchParams}>
			<K8sBaseDetails<TestEntity>
				{...createBaseProps()}
				tabsConfig={tabsConfig}
				customTabs={customTabs}
			/>
		</NuqsTestingAdapter>,
	);
}

function getSelectedTabText(): string | null {
	const selectedTab = document.querySelector('[aria-checked="true"]');
	return selectedTab?.textContent ?? null;
}

describe('K8sBaseDetails - Tab Validation', () => {
	it('should reset view to METRICS when selected view is invalid', async () => {
		act(() => {
			renderK8sBaseDetails({ view: 'invalid-tab' });
		});

		await waitFor(() => {
			expect(screen.getAllByText('test-pod').length).toBeGreaterThan(0);
		});

		await waitFor(() => {
			expect(getSelectedTabText()).toContain('Metrics');
		});
	});

	it('should reset to first available tab when METRICS is disabled and view is invalid', async () => {
		act(() => {
			renderK8sBaseDetails({
				view: 'invalid-tab',
				tabsConfig: { showMetrics: false },
			});
		});

		await waitFor(() => {
			expect(screen.getAllByText('test-pod').length).toBeGreaterThan(0);
		});

		await waitFor(() => {
			expect(getSelectedTabText()).toContain('Logs');
		});
	});

	it('should reset to custom tab when all standard tabs disabled and custom tab exists', async () => {
		const customTabKey = 'pod-metrics';

		act(() => {
			renderK8sBaseDetails({
				view: 'invalid-tab',
				tabsConfig: {
					showMetrics: false,
					showLogs: false,
					showTraces: false,
					showEvents: false,
				},
				customTabs: [
					{
						key: customTabKey,
						label: 'Pod Metrics',
						icon: <Box size={14} />,
						render: (): React.ReactNode => <div>Custom Tab</div>,
					},
				],
			});
		});

		await waitFor(() => {
			expect(screen.getAllByText('test-pod').length).toBeGreaterThan(0);
		});

		await waitFor(() => {
			expect(getSelectedTabText()).toContain('Pod Metrics');
		});
	});

	it('should NOT reset view when selected view is valid', async () => {
		act(() => {
			renderK8sBaseDetails({ view: VIEW_TYPES.LOGS });
		});

		await waitFor(() => {
			expect(screen.getAllByText('test-pod').length).toBeGreaterThan(0);
		});

		await waitFor(() => {
			expect(getSelectedTabText()).toContain('Logs');
		});
	});

	it('should NOT reset view when custom tab is selected and exists', async () => {
		const customTabKey = 'pod-metrics';

		act(() => {
			renderK8sBaseDetails({
				view: customTabKey,
				customTabs: [
					{
						key: customTabKey,
						label: 'Pod Metrics',
						icon: <Box size={14} />,
						render: (): React.ReactNode => <div>Custom Tab</div>,
					},
				],
			});
		});

		await waitFor(() => {
			expect(screen.getAllByText('test-pod').length).toBeGreaterThan(0);
		});

		await waitFor(() => {
			expect(getSelectedTabText()).toContain('Pod Metrics');
		});
	});

	it('should keep the selected tab when the active tab is clicked again (untoggle guard)', async () => {
		const user = userEvent.setup();

		act(() => {
			renderK8sBaseDetails({ view: VIEW_TYPES.LOGS });
		});

		await waitFor(() => {
			expect(screen.getAllByText('test-pod').length).toBeGreaterThan(0);
		});

		await waitFor(() => {
			expect(getSelectedTabText()).toContain('Logs');
		});

		const selectedTab = document.querySelector('[aria-checked="true"]');
		expect(selectedTab).not.toBeNull();

		await user.click(selectedTab as Element);

		await waitFor(() => {
			expect(getSelectedTabText()).toContain('Logs');
		});
	});
});
