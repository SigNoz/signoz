import { act, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
	type DashboardtypesPanelDTO,
	TelemetrytypesSignalDTO,
} from 'api/generated/services/sigNoz.schemas';
import { PANEL_TYPES } from 'constants/queryBuilder';
import type { DrilldownContext } from 'pages/DashboardPageV2/DashboardContainer/Panels/types/drilldown';

import { useDrilldown } from '../hooks/useDrilldown';

const mockOpenViewWithQuery = jest.fn();
const mockNavigate = jest.fn();
const mockGetBuilderQueries = jest.fn();
let mockResolved = { resolvedQuery: 'RESOLVED_QUERY', isResolving: false };

// Boundaries tested elsewhere / needing external context — mocked so this suite isolates
// useDrilldown's orchestration (gating, which menu shows, the View-modal handoff).
jest.mock('../hooks/useViewPanel', () => ({
	useViewPanel: (): unknown => ({ openViewWithQuery: mockOpenViewWithQuery }),
}));
// Variable-substitution boundary (redux/store/react-query) — its own logic is out of scope here.
jest.mock('../hooks/useResolvedDrilldownQuery', () => ({
	useResolvedDrilldownQuery: (): unknown => mockResolved,
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
	'pages/DashboardPageV2/DashboardContainer/queryV5/persesQueryAdapters',
	() => ({
		fromPerses: (): string => 'V1_QUERY',
		toPerses: jest.fn(() => [{ kind: 'REFINED' }]),
	}),
);
jest.mock(
	'pages/DashboardPageV2/DashboardContainer/Panels/utils/getBuilderQueries',
	() => ({
		getBuilderQueries: (...args: unknown[]): unknown =>
			mockGetBuilderQueries(...args),
	}),
);
// Capability lookup mocked (its per-kind values are data in the definitions); avoids
// importing the whole renderer registry into the test.
jest.mock('pages/DashboardPageV2/DashboardContainer/Panels/registry', () => ({
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
		mockResolved = { resolvedQuery: 'RESOLVED_QUERY', isResolving: false };
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

		it('is false for a kind that opts out of drilldown', () => {
			const { result } = renderHook(() =>
				useDrilldown(panelOfKind('signoz/ListPanel'), 'p1'),
			);
			expect(result.current.enableDrillDown).toBe(false);
		});
	});

	describe('aggregate menu', () => {
		it('shows View in Logs/Traces on an aggregate click', () => {
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
