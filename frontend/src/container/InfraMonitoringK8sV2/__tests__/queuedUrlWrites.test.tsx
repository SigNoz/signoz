import { initialQueriesMap } from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import { DataSource } from 'types/common/queryBuilder';
import { fireEvent, render, screen, waitFor } from 'tests/test-utils';

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

jest.mock('../Base/K8sDynamicList', () => ({
	__esModule: true,
	K8sDynamicList: (): JSX.Element => <div data-testid="k8s-dynamic-list" />,
	default: (): JSX.Element => <div data-testid="k8s-dynamic-list" />,
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
});
