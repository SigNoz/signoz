import { act, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
	type DashboardtypesPanelDTO,
	TelemetrytypesSignalDTO,
} from 'api/generated/services/sigNoz.schemas';
import { PANEL_TYPES } from 'constants/queryBuilder';
import type { DrilldownContext } from 'pages/DashboardPage/DashboardContainer/Panels/types/drilldown';
import { EQueryType } from 'types/common/dashboard';
import * as basePath from 'utils/basePath';

import { useDrilldown } from '../hooks/useDrilldown';

const mockOpenViewWithQuery = jest.fn();
const mockNavigate = jest.fn();
const mockGetBuilderQueries = jest.fn();
const mockGetPanelQueryType = jest.fn();
let mockResolved = { resolvedQuery: 'RESOLVED_QUERY', isResolving: false };
let mockContextVariables: Record<string, string> = {};
let mockDashboardVariables: {
	hasFieldVariables: boolean;
	actions: unknown[];
} = {
	hasFieldVariables: true,
	actions: [],
};

// Boundaries tested elsewhere / needing external context — mocked so this suite isolates
// useDrilldown's orchestration (gating, which menu shows, the View-modal handoff).
jest.mock('../hooks/useViewPanel', () => ({
	useViewPanel: (): unknown => ({ openViewWithQuery: mockOpenViewWithQuery }),
}));
// Variable-substitution boundary (redux/store/react-query) — its own logic is out of scope here.
jest.mock('../hooks/useResolvedDrilldownQuery', () => ({
	useResolvedDrilldownQuery: (): unknown => mockResolved,
}));
jest.mock('../hooks/useDrilldownBreakout', () => ({
	useDrilldownBreakout: (): unknown => ({
		queryData: { queryName: 'A' },
		onBreakout: jest.fn(),
	}),
}));
jest.mock('../DrilldownMenu/DrilldownBreakoutMenu', () => ({
	__esModule: true,
	default: (): JSX.Element => <div data-testid="breakout-submenu" />,
}));
jest.mock('../hooks/useDrilldownDashboardVariables', () => ({
	useDrilldownDashboardVariables: (): unknown => mockDashboardVariables,
}));
jest.mock('../DrilldownMenu/DrilldownDashboardVariablesMenu', () => ({
	__esModule: true,
	default: (): JSX.Element => <div data-testid="dashboard-variables-submenu" />,
}));
// Context-link variable map (redux global time + store) — out of scope for this suite.
jest.mock('../hooks/useDrilldownContextVariables', () => ({
	useDrilldownContextVariables: (): unknown => mockContextVariables,
}));
jest.mock('container/QueryTable/Drilldown/useBaseDrilldownNavigate', () => ({
	__esModule: true,
	default: (): unknown => mockNavigate,
}));
jest.mock('container/QueryTable/Drilldown/contextConfig', () => ({
	getGroupContextMenuConfig: ({
		onColumnClick,
	}: {
		onColumnClick: (op: string) => void;
	}): unknown => ({
		items: (
			<button
				type="button"
				data-testid="filter-op"
				onClick={(): void => onColumnClick('=')}
			>
				Is this
			</button>
		),
	}),
}));
jest.mock('container/QueryTable/Drilldown/drilldownUtils', () => ({
	addFilterToQuery: jest.fn(() => 'REFINED_QUERY'),
	getAggregateColumnHeader: (): unknown => ({
		aggregations: 'sum(x)',
		dataSource: 'metrics',
	}),
	getBaseMeta: (): unknown => undefined,
	isNumberDataType: (): boolean => false,
}));
jest.mock(
	'pages/DashboardPage/DashboardContainer/queryV5/persesQueryAdapters',
	() => ({
		fromPerses: (): string => 'V1_QUERY',
		toPerses: jest.fn(() => [{ kind: 'REFINED' }]),
	}),
);
jest.mock(
	'pages/DashboardPage/DashboardContainer/Panels/utils/getBuilderQueries',
	() => ({
		getBuilderQueries: (...args: unknown[]): unknown =>
			mockGetBuilderQueries(...args),
	}),
);
jest.mock(
	'pages/DashboardPage/DashboardContainer/Panels/utils/getPanelQueryType',
	() => ({
		getPanelQueryType: (...args: unknown[]): unknown =>
			mockGetPanelQueryType(...args),
	}),
);
// Capability lookup mocked (its per-kind values are data in the definitions); avoids
// importing the whole renderer registry into the test.
jest.mock('pages/DashboardPage/DashboardContainer/Panels/registry', () => ({
	getPanelDefinition: (kind: string): unknown => ({
		actions: { drilldown: kind !== 'signoz/ListPanel' },
	}),
}));

function panelOfKind(kind: string): DashboardtypesPanelDTO {
	return {
		spec: { plugin: { kind, spec: {} }, queries: [{ x: 1 }] },
		display: { name: 'P' },
	} as unknown as DashboardtypesPanelDTO;
}

const tsPanel = panelOfKind('signoz/TimeSeriesPanel');

const aggregateContext: DrilldownContext = {
	queryName: 'A',
	signal: TelemetrytypesSignalDTO.metrics,
	filters: [],
	label: 'frontend',
	seriesColor: '#fff',
};

const groupContext: DrilldownContext = {
	queryName: 'A',
	signal: TelemetrytypesSignalDTO.metrics,
	filters: [],
	columnKind: 'group',
	clickedKey: 'service.name',
	clickedValue: 'frontend',
};

describe('useDrilldown', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockGetBuilderQueries.mockReturnValue([{ name: 'A' }]);
		mockGetPanelQueryType.mockReturnValue(EQueryType.QUERY_BUILDER);
		mockResolved = { resolvedQuery: 'RESOLVED_QUERY', isResolving: false };
		mockContextVariables = {};
		mockDashboardVariables = {
			hasFieldVariables: true,
			actions: [],
		};
	});

	describe('enableDrillDown', () => {
		it('is true when the kind declares drilldown and has a builder query', () => {
			const { result } = renderHook(() => useDrilldown(tsPanel, 'p1'));
			expect(result.current.enableDrillDown).toBe(true);
		});

		it('is false when there is no builder query', () => {
			mockGetBuilderQueries.mockReturnValue([]);
			const { result } = renderHook(() => useDrilldown(tsPanel, 'p1'));
			expect(result.current.enableDrillDown).toBe(false);
		});

		it.each([EQueryType.PROM, EQueryType.CLICKHOUSE, undefined])(
			'is false when the query type is %s (not the builder)',
			(queryType) => {
				mockGetPanelQueryType.mockReturnValue(queryType);
				const { result } = renderHook(() => useDrilldown(tsPanel, 'p1'));
				expect(result.current.enableDrillDown).toBe(false);
			},
		);

		it('is false for a kind that opts out of drilldown', () => {
			const { result } = renderHook(() =>
				useDrilldown(panelOfKind('signoz/ListPanel'), 'p1'),
			);
			expect(result.current.enableDrillDown).toBe(false);
		});
	});

	describe('aggregate menu', () => {
		afterEach(() => {
			jest.restoreAllMocks();
		});

		it.each([true, false, undefined])(
			'honors targetBlank=%s when clicking resolved panel context links',
			async (targetBlank) => {
				const user = userEvent.setup();
				const open = jest.spyOn(window, 'open').mockReturnValue(null);
				mockContextVariables = { service: 'frontend' };
				const panel = {
					...tsPanel,
					spec: {
						...tsPanel.spec,
						links: [
							{ name: 'External', url: 'https://wiki/{{service}}', targetBlank },
							{ name: 'Internal', url: '/logs?service={{service}}', targetBlank },
							{
								name: 'Literal',
								url: '/logs?service={{service}}',
								targetBlank,
								renderVariables: false,
							},
						],
					},
				};
				const { result } = renderHook(() => useDrilldown(panel, 'p1'));
				const view = render(<div />);
				for (let index = 0; index < panel.spec.links.length; index++) {
					act(() =>
						result.current.onPanelClick({
							coordinates: { x: 1, y: 1 },
							context: aggregateContext,
						}),
					);
					view.rerender(<div>{result.current.contextMenuProps.items}</div>);
					await user.click(screen.getAllByTestId('drilldown-context-link')[index]);
					expect(result.current.contextMenuProps.coordinates).toBeNull();
				}

				const target = targetBlank === false ? '_self' : '_blank';
				expect(open.mock.calls).toStrictEqual([
					['https://wiki/frontend', target],
					['/logs?service=frontend', target],
					['/logs?service={{service}}', target],
				]);
				expect(result.current.contextMenuProps.coordinates).toBeNull();
			},
		);

		it.each([true, false])(
			'preserves the deployment base path with targetBlank=%s',
			async (targetBlank) => {
				const user = userEvent.setup();
				const open = jest.spyOn(window, 'open').mockReturnValue(null);
				const base = document.createElement('base');
				base.setAttribute('href', '/signoz/');
				document.head.prepend(base);
				try {
					jest.isolateModules(() => {
						const isolated = jest.requireActual<typeof basePath>('utils/basePath');
						jest
							.spyOn(basePath, 'withBasePath')
							.mockImplementation(isolated.withBasePath);
					});
					const panel = {
						...tsPanel,
						spec: {
							...tsPanel.spec,
							links: [
								{ url: '/logs', targetBlank },
								{ url: '/signoz/logs', targetBlank },
								{ url: 'https://wiki/runbook', targetBlank },
							],
						},
					};
					const { result } = renderHook(() => useDrilldown(panel, 'p1'));
					const view = render(<div />);
					for (let index = 0; index < panel.spec.links.length; index++) {
						act(() =>
							result.current.onPanelClick({
								coordinates: { x: 1, y: 1 },
								context: aggregateContext,
							}),
						);
						view.rerender(<div>{result.current.contextMenuProps.items}</div>);
						await user.click(screen.getAllByTestId('drilldown-context-link')[index]);
					}
					const target = targetBlank ? '_blank' : '_self';
					expect(open.mock.calls).toStrictEqual([
						['/signoz/logs', target],
						['/signoz/logs', target],
						['https://wiki/runbook', target],
					]);
				} finally {
					base.remove();
				}
			},
		);

		it.each([
			'javascript:alert(1)',
			'java\nscript:alert(1)',
			'data:text/html,example',
			'https://[',
		])(
			'does not navigate the current page to an unsafe or malformed URL: %s',
			async (destination) => {
				const user = userEvent.setup();
				const open = jest.spyOn(window, 'open').mockReturnValue(null);
				mockContextVariables = { destination };
				const panel = {
					...tsPanel,
					spec: {
						...tsPanel.spec,
						links: [
							{ name: 'Imported link', url: '{{destination}}', targetBlank: false },
						],
					},
				};
				const { result } = renderHook(() => useDrilldown(panel, 'p1'));
				act(() =>
					result.current.onPanelClick({
						coordinates: { x: 1, y: 1 },
						context: aggregateContext,
					}),
				);
				render(<div>{result.current.contextMenuProps.items}</div>);

				await user.click(screen.getByTestId('drilldown-context-link'));
				expect(open).not.toHaveBeenCalled();
				expect(result.current.contextMenuProps.coordinates).toBeNull();
			},
		);

		it('keeps automatic trace links opening in a new tab', async () => {
			const user = userEvent.setup();
			const open = jest.spyOn(window, 'open').mockReturnValue(null);
			const { result } = renderHook(() => useDrilldown(tsPanel, 'p1'));
			act(() =>
				result.current.onPanelClick({
					coordinates: { x: 1, y: 1 },
					context: {
						...aggregateContext,
						filters: [
							{ filterKey: 'trace_id', filterValue: 'abc123', operator: '=' },
						],
					},
				}),
			);
			render(<div>{result.current.contextMenuProps.items}</div>);

			await user.click(screen.getByTestId('drilldown-data-link'));
			expect(open).toHaveBeenCalledWith('/trace/abc123', '_blank');
		});

		it('shows View in Logs/Traces + Breakout on an aggregate click', () => {
			const { result } = renderHook(() => useDrilldown(tsPanel, 'p1'));
			act(() =>
				result.current.onPanelClick({
					coordinates: { x: 1, y: 1 },
					context: aggregateContext,
				}),
			);
			render(<div>{result.current.contextMenuProps.items}</div>);

			expect(screen.getByTestId('drilldown-view-logs')).toBeInTheDocument();
			expect(screen.getByTestId('drilldown-view-traces')).toBeInTheDocument();
			expect(screen.getByTestId('drilldown-breakout')).toBeInTheDocument();
		});

		it('navigates to logs when View in Logs is clicked', async () => {
			const user = userEvent.setup();
			const { result } = renderHook(() => useDrilldown(tsPanel, 'p1'));
			act(() =>
				result.current.onPanelClick({
					coordinates: { x: 1, y: 1 },
					context: aggregateContext,
				}),
			);
			render(<div>{result.current.contextMenuProps.items}</div>);

			await user.click(screen.getByTestId('drilldown-view-logs'));
			expect(mockNavigate).toHaveBeenCalledWith('view_logs');
		});

		it('disables navigation while dashboard variables resolve', async () => {
			mockResolved = { resolvedQuery: 'RESOLVED_QUERY', isResolving: true };
			const user = userEvent.setup();
			const { result } = renderHook(() => useDrilldown(tsPanel, 'p1'));
			act(() =>
				result.current.onPanelClick({
					coordinates: { x: 1, y: 1 },
					context: aggregateContext,
				}),
			);
			render(<div>{result.current.contextMenuProps.items}</div>);

			await user.click(screen.getByTestId('drilldown-view-logs'));
			expect(mockNavigate).not.toHaveBeenCalled();
		});

		it('swaps to the breakout submenu when "Breakout by .." is clicked', async () => {
			const user = userEvent.setup();
			const { result } = renderHook(() => useDrilldown(tsPanel, 'p1'));
			act(() =>
				result.current.onPanelClick({
					coordinates: { x: 1, y: 1 },
					context: aggregateContext,
				}),
			);
			const view = render(<div>{result.current.contextMenuProps.items}</div>);

			await user.click(screen.getByTestId('drilldown-breakout'));
			view.rerender(<div>{result.current.contextMenuProps.items}</div>);

			expect(screen.getByTestId('breakout-submenu')).toBeInTheDocument();
		});

		it('shows the Dashboard Variables entry when the click has group-by fields', () => {
			const { result } = renderHook(() => useDrilldown(tsPanel, 'p1'));
			act(() =>
				result.current.onPanelClick({
					coordinates: { x: 1, y: 1 },
					context: aggregateContext,
				}),
			);
			render(<div>{result.current.contextMenuProps.items}</div>);

			expect(
				screen.getByTestId('drilldown-dashboard-variables'),
			).toBeInTheDocument();
		});

		it('hides the Dashboard Variables entry when there are no group-by fields', () => {
			mockDashboardVariables = { hasFieldVariables: false, actions: [] };
			const { result } = renderHook(() => useDrilldown(tsPanel, 'p1'));
			act(() =>
				result.current.onPanelClick({
					coordinates: { x: 1, y: 1 },
					context: aggregateContext,
				}),
			);
			render(<div>{result.current.contextMenuProps.items}</div>);

			expect(
				screen.queryByTestId('drilldown-dashboard-variables'),
			).not.toBeInTheDocument();
		});

		it('swaps to the Dashboard Variables submenu when clicked', async () => {
			const user = userEvent.setup();
			const { result } = renderHook(() => useDrilldown(tsPanel, 'p1'));
			act(() =>
				result.current.onPanelClick({
					coordinates: { x: 1, y: 1 },
					context: aggregateContext,
				}),
			);
			const view = render(<div>{result.current.contextMenuProps.items}</div>);

			await user.click(screen.getByTestId('drilldown-dashboard-variables'));
			view.rerender(<div>{result.current.contextMenuProps.items}</div>);

			expect(
				screen.getByTestId('dashboard-variables-submenu'),
			).toBeInTheDocument();
		});
	});

	describe('filter-by-value', () => {
		it('opens the View modal with the refined query on a group-column filter', async () => {
			const user = userEvent.setup();
			const { result } = renderHook(() => useDrilldown(tsPanel, 'p1'));
			act(() =>
				result.current.onPanelClick({
					coordinates: { x: 1, y: 1 },
					context: groupContext,
				}),
			);
			render(<div>{result.current.contextMenuProps.items}</div>);

			await user.click(screen.getByTestId('filter-op'));
			// Opens the View modal on the refined query at the panel's kind — persisted in the URL.
			expect(mockOpenViewWithQuery).toHaveBeenCalledWith(
				'p1',
				'REFINED_QUERY',
				PANEL_TYPES.TIME_SERIES,
			);
		});
	});
});
