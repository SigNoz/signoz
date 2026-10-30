import { usePreferredPageSizeStore } from 'components/TanStackTableView/usePreferredPageSize.store';
import { initialQueriesMap } from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import { DataSource } from 'types/common/queryBuilder';
import { fireEvent, render, screen, waitFor } from 'tests/test-utils';

import K8sHeader from '../Base/K8sHeader';
import EntityDateTimeSelector from '../EntityDetailsUtils/EntityDateTimeSelector/EntityDateTimeSelector';
import {
	InfraMonitoringEntity,
	INFRA_MONITORING_K8S_PARAMS_KEYS,
	K8sCategories,
} from '../constants';
import {
	useInfraMonitoringCategory,
	useInfraMonitoringSelectedItemParams,
} from '../hooks';
import InfraMonitoringK8s from '../InfraMonitoringK8s';

// The real hook: a navigation made while a nuqs write is queued drops that write,
// which is what these tests guard. The extension slips past jest.config.ts's mock.
jest.mock('hooks/useSafeNavigate', () =>
	jest.requireActual('../../../hooks/useSafeNavigate.ts'),
);

jest.mock('components/QuickFilters/QuickFilters', () => ({
	__esModule: true,
	default: (): JSX.Element => <div data-testid="quick-filters" />,
}));

// Keeps the list's own URL write on mount: the page size.
jest.mock('../Base/K8sDynamicList', () => {
	const { useTableParams } = jest.requireActual('components/TanStackTableView');
	function K8sDynamicList(): JSX.Element {
		useTableParams(
			{ page: 'page', limit: 'pageSize' },
			{ page: 1, limit: 10, storageKey: 'k8s-containers' },
		);
		return <div data-testid="k8s-dynamic-list" />;
	}
	return { __esModule: true, K8sDynamicList, default: K8sDynamicList };
});

jest.mock('components/QueryBuilderV2/QueryV2/QuerySearch/QuerySearch', () => ({
	__esModule: true,
	default: ({ onRun }: { onRun: (expression: string) => void }): JSX.Element => (
		<button
			type="button"
			aria-label="Run filter"
			data-testid="run-filter"
			onClick={(): void => onRun("k8s.pod.name = 'pod-1'")}
		/>
	),
}));

jest.mock('lib/navigation', () => ({
	getNavigationReferrer: (): string => 'direct',
}));

const route = ROUTES.INFRASTRUCTURE_MONITORING_KUBERNETES;

function DrawerHarness(): JSX.Element {
	const [, setCategory] = useInfraMonitoringCategory();
	const [selectedItemParams, setSelectedItemParams] =
		useInfraMonitoringSelectedItemParams();

	return (
		<>
			<button
				type="button"
				aria-label="Select category"
				data-testid="select-category"
				onClick={(): void => {
					void setCategory(K8sCategories.PODS);
				}}
			/>
			<button
				type="button"
				aria-label="Open row"
				data-testid="open-row"
				onClick={(): void =>
					setSelectedItemParams({
						selectedItem: 'pod-1',
						clusterName: null,
						namespaceName: null,
					})
				}
			/>
			{selectedItemParams.selectedItem && (
				<div data-testid="drawer">
					<EntityDateTimeSelector
						eventEntity="k8s"
						category={InfraMonitoringEntity.PODS}
						view="overview"
					/>
				</div>
			)}
		</>
	);
}

function getUrlParam(key: string): string | null {
	return new URLSearchParams(window.location.search).get(key);
}

describe('K8s URL writes queued by nuqs', () => {
	afterEach(() => {
		usePreferredPageSizeStore
			.getState()
			.setPreferredPageSize('k8s-containers', null);
	});

	it('opens the drawer on the first click after an earlier shallow write', async () => {
		render(<DrawerHarness />, undefined, {
			initialRoute: `${route}?relativeTime=15m`,
		});

		fireEvent.click(screen.getByTestId('select-category'));
		await waitFor(() =>
			expect(getUrlParam(INFRA_MONITORING_K8S_PARAMS_KEYS.CATEGORY)).toBe(
				K8sCategories.PODS,
			),
		);

		fireEvent.click(screen.getByTestId('open-row'));

		await waitFor(() =>
			expect(getUrlParam(INFRA_MONITORING_K8S_PARAMS_KEYS.SELECTED_ITEM)).toBe(
				'pod-1',
			),
		);
		expect(screen.getByTestId('drawer')).toBeInTheDocument();
	});

	it('switches category on the first click while a filter is applied', async () => {
		const query = initialQueriesMap[DataSource.METRICS];
		const filteredQuery = {
			...query,
			builder: {
				...query.builder,
				queryData: [
					{
						...query.builder.queryData[0],
						filter: { expression: "k8s.pod.name = 'pod-1'" },
					},
				],
			},
		};
		const params = new URLSearchParams({
			[INFRA_MONITORING_K8S_PARAMS_KEYS.CATEGORY]: K8sCategories.PODS,
			compositeQuery: encodeURIComponent(JSON.stringify(filteredQuery)),
		});

		render(<InfraMonitoringK8s />, undefined, {
			initialRoute: `${route}?${params.toString()}`,
		});

		fireEvent.click(
			await screen.findByTestId(`category-${K8sCategories.CONTAINERS}`),
		);

		await waitFor(() => {
			const compositeQuery = JSON.parse(
				decodeURIComponent(getUrlParam('compositeQuery') ?? ''),
			);
			expect(compositeQuery.builder.queryData[0].filter.expression).toBe('');
		});
		await waitFor(() =>
			expect(getUrlParam(INFRA_MONITORING_K8S_PARAMS_KEYS.CATEGORY)).toBe(
				K8sCategories.CONTAINERS,
			),
		);
	});

	it('goes back to the first page when a filter runs', async () => {
		render(
			<K8sHeader
				entity={InfraMonitoringEntity.PODS}
				showAutoRefresh={false}
				cancelQuery={jest.fn()}
			/>,
			undefined,
			{ initialRoute: `${route}?relativeTime=30m&page=3` },
		);

		fireEvent.click(screen.getByTestId('run-filter'));

		await waitFor(() => {
			const compositeQuery = JSON.parse(
				decodeURIComponent(getUrlParam('compositeQuery') ?? ''),
			);
			expect(compositeQuery.builder.queryData[0].filter.expression).toBe(
				"k8s.pod.name = 'pod-1'",
			);
		});
		await waitFor(() =>
			expect(getUrlParam(INFRA_MONITORING_K8S_PARAMS_KEYS.PAGE)).toBe('1'),
		);
	});

	it('keeps the page size the list writes while the default query loads', async () => {
		usePreferredPageSizeStore
			.getState()
			.setPreferredPageSize('k8s-containers', 25);

		render(<InfraMonitoringK8s />, undefined, { initialRoute: route });

		await waitFor(() => expect(getUrlParam('compositeQuery')).not.toBeNull());
		await waitFor(() =>
			expect(getUrlParam(INFRA_MONITORING_K8S_PARAMS_KEYS.PAGE_SIZE)).toBe('25'),
		);
	});
});
