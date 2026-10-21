import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import { prepareScalarTables } from 'pages/DashboardPage/DashboardContainer/queryV5/prepareScalarTables';
import type {
	PanelQueryData,
	PanelTable,
} from 'pages/DashboardPage/DashboardContainer/queryV5/types';
import { renderHook } from 'tests/test-utils';

import { useGroupColumns } from '../useGroupColumns';

jest.mock(
	'pages/DashboardPage/DashboardContainer/queryV5/prepareScalarTables',
	() => ({ prepareScalarTables: jest.fn() }),
);
jest.mock(
	'pages/DashboardPage/DashboardContainer/queryV5/v5ResponseData',
	() => ({ getScalarResults: jest.fn(() => []) }),
);

const mockPrepareScalarTables = jest.mocked(prepareScalarTables);

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
		const empty: PanelTable = {
			queryName: 'A',
			legend: '',
			columns: [],
			rows: [],
		};
		mockPrepareScalarTables.mockReturnValue([
			empty,
			{
				...empty,
				columns: [
					{
						id: 'k8s.namespace.name',
						name: 'k8s.namespace.name',
						queryName: '',
						isValueColumn: false,
					},
					{ id: 'A', name: 'cpu', queryName: 'A', isValueColumn: true },
					{
						id: 'k8s.pod.name',
						name: 'k8s.pod.name',
						queryName: '',
						isValueColumn: false,
					},
				],
			},
		]);

		const { result } = renderHook(() =>
			useGroupColumns(panelOfKind('signoz/ScatterPlotPanel'), DATA),
		);

		expect(result.current).toStrictEqual(['k8s.namespace.name', 'k8s.pod.name']);
	});
});
