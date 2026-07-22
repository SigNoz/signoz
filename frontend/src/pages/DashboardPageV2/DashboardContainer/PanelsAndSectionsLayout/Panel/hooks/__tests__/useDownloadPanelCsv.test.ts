import { renderHook } from '@testing-library/react';
import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import { getTableCsvRows } from 'pages/DashboardPageV2/DashboardContainer/Panels/kinds/TablePanel/tableCsv';
import { downloadCsv } from 'pages/DashboardPageV2/DashboardContainer/Panels/utils/downloadCsv';
import type { PanelQueryData } from 'pages/DashboardPageV2/DashboardContainer/queryV5/types';

import { useDownloadPanelCsv } from '../useDownloadPanelCsv';

jest.mock(
	'pages/DashboardPageV2/DashboardContainer/Panels/kinds/TablePanel/tableCsv',
	() => ({ getTableCsvRows: jest.fn() }),
);
jest.mock(
	'pages/DashboardPageV2/DashboardContainer/Panels/utils/downloadCsv',
	() => ({ downloadCsv: jest.fn() }),
);

const mockGetTableCsvRows = getTableCsvRows as jest.Mock;
const mockDownloadCsv = downloadCsv as jest.Mock;

const data = {} as PanelQueryData;
const panelOf = (kind: string): DashboardtypesPanelDTO =>
	({
		spec: { display: { name: 'CPU' }, plugin: { kind } },
	}) as DashboardtypesPanelDTO;

describe('useDownloadPanelCsv', () => {
	beforeEach(() => jest.clearAllMocks());

	it('exports the table rows as CSV named after the panel', () => {
		mockGetTableCsvRows.mockReturnValue([{ service: 'frontend', p99: '1ms' }]);

		const { result } = renderHook(() =>
			useDownloadPanelCsv({
				panel: panelOf('signoz/TablePanel'),
				data,
				canDownloadCsv: true,
			}),
		);
		result.current();

		expect(mockGetTableCsvRows).toHaveBeenCalledTimes(1);
		expect(mockDownloadCsv).toHaveBeenCalledWith(
			[{ service: 'frontend', p99: '1ms' }],
			'CPU',
		);
	});

	it('no-ops when the response has no rows', () => {
		mockGetTableCsvRows.mockReturnValue([]);

		const { result } = renderHook(() =>
			useDownloadPanelCsv({
				panel: panelOf('signoz/TablePanel'),
				data,
				canDownloadCsv: true,
			}),
		);
		result.current();

		expect(mockDownloadCsv).not.toHaveBeenCalled();
	});

	it('no-ops when the kind cannot download CSV, without building rows', () => {
		const { result } = renderHook(() =>
			useDownloadPanelCsv({
				panel: panelOf('signoz/TimeSeriesPanel'),
				data,
				canDownloadCsv: false,
			}),
		);
		result.current();

		expect(mockGetTableCsvRows).not.toHaveBeenCalled();
		expect(mockDownloadCsv).not.toHaveBeenCalled();
	});
});
