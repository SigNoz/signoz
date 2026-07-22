import { renderHook } from '@testing-library/react';
import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import { prepareScalarTables } from 'pages/DashboardPageV2/DashboardContainer/queryV5/prepareScalarTables';
import type { PanelQueryData } from 'pages/DashboardPageV2/DashboardContainer/queryV5/types';

import { useTableColumns } from '../useTableColumns';

jest.mock(
	'pages/DashboardPageV2/DashboardContainer/queryV5/prepareScalarTables',
	() => ({ prepareScalarTables: jest.fn() }),
);
jest.mock(
	'pages/DashboardPageV2/DashboardContainer/queryV5/v5ResponseData',
	() => ({ getScalarResults: jest.fn(() => []) }),
);

const mockPrepareScalarTables = prepareScalarTables as unknown as jest.Mock;

const DATA = {
	response: undefined,
	legendMap: {},
	requestPayload: undefined,
} as unknown as PanelQueryData;

function tablePanel(
	columnUnits: Record<string, string> = {},
): DashboardtypesPanelDTO {
	return {
		kind: 'Panel',
		spec: {
			display: { name: 'T' },
			plugin: { kind: 'signoz/TablePanel', spec: { formatting: { columnUnits } } },
			queries: [],
		},
	} as unknown as DashboardtypesPanelDTO;
}

function tableWith(columns: unknown[]): void {
	mockPrepareScalarTables.mockReturnValue([{ columns, rows: [] }]);
}

describe('useTableColumns', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('returns [] for a non-table panel kind', () => {
		const panel = {
			kind: 'Panel',
			spec: { plugin: { kind: 'signoz/TimeSeriesPanel', spec: {} }, queries: [] },
		} as unknown as DashboardtypesPanelDTO;

		const { result } = renderHook(() => useTableColumns(panel, DATA));

		expect(result.current).toStrictEqual([]);
		expect(mockPrepareScalarTables).not.toHaveBeenCalled();
	});

	it('returns [] when there is no scalar table with columns', () => {
		mockPrepareScalarTables.mockReturnValue([{ columns: [], rows: [] }]);

		const { result } = renderHook(() => useTableColumns(tablePanel(), DATA));

		expect(result.current).toStrictEqual([]);
	});

	it('keeps only value columns and maps them to key/label', () => {
		tableWith([
			{ id: 'service.name', name: 'service.name', isValueColumn: false },
			{ id: 'A', name: 'p99', isValueColumn: true },
		]);

		const { result } = renderHook(() => useTableColumns(tablePanel(), DATA));

		expect(result.current).toStrictEqual([
			{ key: 'A', label: 'p99', unit: undefined },
		]);
	});

	it('falls back to the column name when the column has no id', () => {
		tableWith([{ name: 'count', isValueColumn: true }]);

		const { result } = renderHook(() => useTableColumns(tablePanel(), DATA));

		expect(result.current[0].key).toBe('count');
	});

	it('resolves a column unit by its key', () => {
		tableWith([{ id: 'A', name: 'p99', isValueColumn: true }]);

		const { result } = renderHook(() =>
			useTableColumns(tablePanel({ A: 'ms' }), DATA),
		);

		expect(result.current[0].unit).toBe('ms');
	});

	it('falls back to the base query name for a multi-aggregation column key', () => {
		tableWith([{ id: 'A.p99', name: 'p99', isValueColumn: true }]);

		const { result } = renderHook(() =>
			useTableColumns(tablePanel({ A: 'bytes' }), DATA),
		);

		expect(result.current[0].unit).toBe('bytes');
	});
});
