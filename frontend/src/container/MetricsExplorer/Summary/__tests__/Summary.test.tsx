import type { Mock } from 'vitest';
import { useSearchParams } from 'react-router-dom-v5-compat';
import * as metricsHooks from 'api/generated/services/metrics';
import { initialQueriesMap } from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import * as useQueryBuilderHooks from 'hooks/queryBuilder/useQueryBuilder';
import { render, screen, waitFor } from 'tests/test-utils';
import { DataSource, QueryBuilderContextType } from 'types/common/queryBuilder';

import Summary from '../Summary';

vi.mock('d3-hierarchy', () => ({
	stratify: vi.fn().mockReturnValue({
		id: vi.fn().mockReturnValue({
			parentId: vi.fn().mockReturnValue(
				vi.fn().mockReturnValue({
					sum: vi.fn().mockReturnValue({
						descendants: vi.fn().mockReturnValue([]),
						eachBefore: vi.fn().mockReturnValue([]),
					}),
				}),
			),
		}),
	}),
	treemapBinary: vi.fn(),
}));
vi.mock('react-use', async () => ({
	...(await vi.importActual('react-use')),
	useWindowSize: vi.fn().mockReturnValue({ width: 1000, height: 1000 }),
}));
vi.mock('react-router-dom-v5-compat', async () => {
	const actual = await vi.importActual('react-router-dom-v5-compat');
	return {
		...actual,
		useSearchParams: vi.fn(),
		useNavigationType: (): any => 'PUSH',
	};
});
vi.mock('react-router-dom', async () => ({
	...(await vi.importActual('react-router-dom')),
	useLocation: (): { pathname: string } => ({
		pathname: `${ROUTES.METRICS_EXPLORER_BASE}`,
	}),
}));
vi.mock('hooks/queryBuilder/useShareBuilderUrl', () => ({
	useShareBuilderUrl: vi.fn(),
}));

// so filter expression assertions easy
vi.mock('../MetricsSearch', () => ({
	default: function MockMetricsSearch(props: {
		currentQueryFilterExpression: string;
	}): JSX.Element {
		return (
			<div data-testid="metrics-search-expression">
				{props.currentQueryFilterExpression}
			</div>
		);
	},
}));

const mockSetSearchParams = vi.fn();
const mockGetMetricsStats = vi.fn();
const mockGetMetricsTreemap = vi.fn();

const mockUseQueryBuilderData = {
	handleRunQuery: vi.fn(),
	stagedQuery: initialQueriesMap[DataSource.METRICS],
	updateAllQueriesOperators: vi.fn(),
	currentQuery: initialQueriesMap[DataSource.METRICS],
	resetQuery: vi.fn(),
	redirectWithQueryBuilderData: vi.fn(),
	isStagedQueryUpdated: vi.fn(),
	handleSetQueryData: vi.fn(),
	handleSetFormulaData: vi.fn(),
	handleSetQueryItemData: vi.fn(),
	handleSetConfig: vi.fn(),
	removeQueryBuilderEntityByIndex: vi.fn(),
	removeQueryTypeItemByIndex: vi.fn(),
	isDefaultQuery: vi.fn(),
};

vi.mock('api/generated/services/metrics', { spy: true });
vi.mock('hooks/queryBuilder/useQueryBuilder', { spy: true });

const useGetMetricsStatsSpy = vi.mocked(metricsHooks.useGetMetricsStats);
const useGetMetricsTreemapSpy = vi.mocked(metricsHooks.useGetMetricsTreemap);
const useQueryBuilderSpy = vi.mocked(useQueryBuilderHooks.useQueryBuilder);

describe('Summary', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		(useSearchParams as Mock).mockReturnValue([
			new URLSearchParams(),
			mockSetSearchParams,
		]);

		useGetMetricsStatsSpy.mockReturnValue({
			data: null,
			mutate: mockGetMetricsStats,
			isLoading: true,
			isError: false,
			error: null,
			isIdle: true,
			isSuccess: false,
			reset: vi.fn(),
			status: 'idle',
		} as any);

		useGetMetricsTreemapSpy.mockReturnValue({
			data: null,
			mutate: mockGetMetricsTreemap,
			isLoading: true,
			isError: false,
			error: null,
			isIdle: true,
			isSuccess: false,
			reset: vi.fn(),
			status: 'idle',
		} as any);

		useQueryBuilderSpy.mockReturnValue({
			...mockUseQueryBuilderData,
		} as Partial<QueryBuilderContextType> as QueryBuilderContextType);
	});

	it('does not carry filter expression from a previous page', async () => {
		const staleFilterExpression = "service.name = 'redis'";

		// prev filter from logs explorer
		const staleQuery = {
			...initialQueriesMap[DataSource.METRICS],
			builder: {
				...initialQueriesMap[DataSource.METRICS].builder,
				queryData: [
					{
						...initialQueriesMap[DataSource.METRICS].builder.queryData[0],
						filter: { expression: staleFilterExpression },
					},
				],
			},
		};

		// stagedQuery has stale filter (before QueryBuilder resets it)
		useQueryBuilderSpy.mockReturnValue({
			...mockUseQueryBuilderData,
			stagedQuery: staleQuery,
			currentQuery: staleQuery,
		} as Partial<QueryBuilderContextType> as QueryBuilderContextType);

		const { rerender } = render(<Summary />);

		expect(screen.getByTestId('metrics-search-expression')).toHaveTextContent(
			staleFilterExpression,
		);

		// QB route change effect resets stagedQuery to null
		useQueryBuilderSpy.mockReturnValue({
			...mockUseQueryBuilderData,
			stagedQuery: null,
			currentQuery: initialQueriesMap[DataSource.METRICS],
		} as Partial<QueryBuilderContextType> as QueryBuilderContextType);

		rerender(<Summary />);

		await waitFor(() => {
			expect(
				screen.getByTestId('metrics-search-expression'),
			).toBeEmptyDOMElement();
		});
	});

	it('persists inspect modal open state across page refresh', () => {
		(useSearchParams as Mock).mockReturnValue([
			new URLSearchParams({
				isInspectModalOpen: 'true',
				selectedMetricName: 'test-metric',
			}),
			mockSetSearchParams,
		]);

		render(<Summary />);

		expect(screen.queryByText('Proportion View')).not.toBeInTheDocument();
	});

	it('persists metric details modal state across page refresh', () => {
		(useSearchParams as Mock).mockReturnValue([
			new URLSearchParams({
				isMetricDetailsOpen: 'true',
				selectedMetricName: 'test-metric',
			}),
			mockSetSearchParams,
		]);

		render(<Summary />);

		expect(screen.queryByText('Proportion View')).not.toBeInTheDocument();
	});
});
