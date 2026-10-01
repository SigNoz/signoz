import { renderHook } from '@testing-library/react';
import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import { prepareScalarTables } from 'pages/DashboardPage/DashboardContainer/queryV5/prepareScalarTables';
import type { PanelQueryData } from 'pages/DashboardPage/DashboardContainer/queryV5/types';

import { useGroupColumns } from '../useGroupColumns';

jest.mock(
	'pages/DashboardPage/DashboardContainer/queryV5/prepareScalarTables',
	() => ({ prepareScalarTables: jest.fn() }),
);
jest.mock(
	'pages/DashboardPage/DashboardContainer/queryV5/v5ResponseData',
	() => ({ getScalarResults: jest.fn(() => []) }),
);

const mockPrepareScalarTables = prepareScalarTables as unknown as jest.Mock;

const DATA = {
	response: undefined,
	legendMap: {},
	requestPayload: undefined,
} as unknown as PanelQueryData;

function panelOfKind(kind: string): DashboardtypesPanelDTO {
	return {
		kind: 'Panel',
		spec: { plugin: { kind, spec: {} }, queries: [] },
	} as unknown as DashboardtypesPanelDTO;
}

describe('useGroupColumns', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('returns [] for a kind that does not join its scalar rows', () => {
		const { result } = renderHook(() =>
			useGroupColumns(panelOfKind('signoz/PieChartPanel'), DATA),
		);

		expect(result.current).toStrictEqual([]);
		expect(mockPrepareScalarTables).not.toHaveBeenCalled();
	});

	it('keeps only the group-by columns, by key', () => {
		mockPrepareScalarTables.mockReturnValue([
			{ columns: [], rows: [] },
			{
				columns: [
					{
						id: 'k8s.namespace.name',
						name: 'k8s.namespace.name',
						isValueColumn: false,
					},
					{ id: 'A', name: 'cpu', isValueColumn: true },
					{ id: 'k8s.pod.name', name: 'k8s.pod.name', isValueColumn: false },
				],
				rows: [],
			},
		]);

		const { result } = renderHook(() =>
			useGroupColumns(panelOfKind('signoz/ScatterPlotPanel'), DATA),
		);

		expect(result.current).toStrictEqual(['k8s.namespace.name', 'k8s.pod.name']);
	});
});
