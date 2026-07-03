import { act, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
	type DashboardtypesPanelDTO,
	TelemetrytypesSignalDTO,
} from 'api/generated/services/sigNoz.schemas';
import type { DrilldownContext } from 'pages/DashboardPageV2/DashboardContainer/Panels/types/drilldown';

import { useDrilldown } from '../hooks/useDrilldown';

const mockNavigate = jest.fn();
const mockGetBuilderQueries = jest.fn();

// Boundaries tested elsewhere / needing external context — mocked so this suite isolates
// useDrilldown's orchestration (gating, the aggregate menu, navigation).
jest.mock('container/QueryTable/Drilldown/useBaseDrilldownNavigate', () => ({
	__esModule: true,
	default: (): unknown => mockNavigate,
}));
jest.mock('container/QueryTable/Drilldown/drilldownUtils', () => ({
	getAggregateColumnHeader: (): unknown => ({
		aggregations: 'sum(x)',
		dataSource: 'metrics',
	}),
}));
jest.mock(
	'pages/DashboardPageV2/DashboardContainer/queryV5/persesQueryAdapters',
	() => ({
		fromPerses: (): string => 'V1_QUERY',
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

describe('useDrilldown', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockGetBuilderQueries.mockReturnValue([{ name: 'A' }]);
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
	});
});
