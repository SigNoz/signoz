import { renderHook } from '@testing-library/react';
import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import type { PanelActionCapabilities } from 'pages/DashboardPageV2/DashboardContainer/Panels/types/panelDefinition';
import type { PanelQueryData } from 'pages/DashboardPageV2/DashboardContainer/queryV5/types';

import { useDownloadPanelMenuItem } from '../useDownloadPanelMenuItem';

const mockDownloadCsv = jest.fn();
jest.mock('../useDownloadPanelCsv', () => ({
	useDownloadPanelCsv: (): jest.Mock => mockDownloadCsv,
}));

const mockDownloadImage = jest.fn();
jest.mock('../useDownloadPanelImage', () => ({
	useDownloadPanelImage: (): { downloadPanelImage: jest.Mock } => ({
		downloadPanelImage: mockDownloadImage,
	}),
}));

const panel = {
	spec: { display: { name: 'CPU' }, plugin: { kind: 'signoz/TablePanel' } },
} as DashboardtypesPanelDTO;
const data = {} as PanelQueryData;

const download = (
	formats: PanelActionCapabilities['download'],
): PanelActionCapabilities => ({
	view: true,
	edit: true,
	clone: true,
	download: formats,
	createAlert: true,
	search: true,
	drilldown: true,
});

type Submenu = { children: { key: string; onClick: () => void }[] };

function render(actions: PanelActionCapabilities): { current: unknown } {
	return renderHook(() =>
		useDownloadPanelMenuItem({ panelId: 'panel-1', panel, data, actions }),
	).result;
}

describe('useDownloadPanelMenuItem', () => {
	beforeEach(() => jest.clearAllMocks());

	it('returns null when the kind supports no download format', () => {
		const result = render(download({ csv: false, png: false, svg: false }));
		expect(result.current).toBeNull();
	});

	it('offers only the supported formats, dispatching CSV and image to their hooks', () => {
		const result = render(download({ csv: true, png: true, svg: true }));
		const item = result.current as Submenu;

		expect(item.children.map((c) => c.key)).toStrictEqual([
			'download-csv',
			'download-png',
			'download-svg',
		]);

		item.children.find((c) => c.key === 'download-csv')?.onClick();
		expect(mockDownloadCsv).toHaveBeenCalledTimes(1);
		expect(mockDownloadImage).not.toHaveBeenCalled();

		item.children.find((c) => c.key === 'download-png')?.onClick();
		expect(mockDownloadImage).toHaveBeenCalledWith('panel-1', 'CPU', 'png');

		item.children.find((c) => c.key === 'download-svg')?.onClick();
		expect(mockDownloadImage).toHaveBeenCalledWith('panel-1', 'CPU', 'svg');
	});
});
