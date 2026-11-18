import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import type { PanelQueryData } from 'pages/DashboardPage/DashboardContainer/queryV5/types';
import { render, screen, userEvent } from 'tests/test-utils';

import type { DashboardSection } from '../../../../utils';
import PanelActionsMenu from '../PanelActionsMenu';

jest.mock(
	'pages/DashboardPage/DashboardContainer/hooks/useDashboardEditContext',
	() => ({
		useDashboardEditContext: (): unknown => ({
			isEditable: true,
			editChecks: [],
			areOtherPermissionsLoading: false,
			deleteChecks: [],
			isLocked: false,
			canEditDashboard: true,
			canDeleteDashboard: true,
			editDisabledTooltip: '',
			deleteDisabledTooltip: '',
		}),
	}),
);

jest.mock(
	'pages/DashboardPage/DashboardContainer/hooks/useOpenPanelEditor',
	() => ({ useOpenPanelEditor: (): jest.Mock => jest.fn() }),
);

jest.mock('../../hooks/useViewPanel', () => ({
	useViewPanel: (): unknown => ({
		openView: jest.fn(),
		closeView: jest.fn(),
		expandedPanelId: null,
	}),
}));

const mockMovePanel = jest.fn();
jest.mock('../../hooks/useMovePanelToSection', () => ({
	useMovePanelToSection: (): jest.Mock => mockMovePanel,
}));

jest.mock('../../hooks/useDeletePanel', () => ({
	useDeletePanel: (): jest.Mock => jest.fn(),
}));

jest.mock('../../hooks/useClonePanel', () => ({
	useClonePanel: (): jest.Mock => jest.fn(),
}));

jest.mock('../../hooks/useCreateAlertFromPanel', () => ({
	useCreateAlertFromPanel: (): jest.Mock => jest.fn(),
}));

const mockDownloadImage = jest.fn();
jest.mock('../../hooks/useDownloadPanelImage', () => ({
	useDownloadPanelImage: (): { downloadPanelImage: jest.Mock } => ({
		downloadPanelImage: mockDownloadImage,
	}),
}));

const mockDownloadCsv = jest.fn();
jest.mock('../../hooks/useDownloadPanelCsv', () => ({
	useDownloadPanelCsv: (): jest.Mock => mockDownloadCsv,
}));

function section(
	layoutIndex: number,
	title: string | undefined,
): DashboardSection {
	return {
		id: `section-${layoutIndex}`,
		layoutIndex,
		title,
		items: [],
		repeatVariable: undefined,
	};
}

const tablePanel = {
	kind: 'Panel',
	spec: {
		display: { name: 'Requests' },
		plugin: { kind: 'signoz/TablePanel', spec: {} },
		queries: [],
	},
} as unknown as DashboardtypesPanelDTO;

const data = {
	response: undefined,
	requestPayload: undefined,
	legendMap: {},
} as PanelQueryData;

function renderMenu(): void {
	render(
		<PanelActionsMenu
			panelId="panel-1"
			panel={tablePanel}
			data={data}
			panelActions={{
				currentLayoutIndex: 1,
				sections: [section(0, undefined), section(1, 'A'), section(2, 'B')],
			}}
		/>,
	);
}

async function openSubmenu(name: string): Promise<void> {
	await userEvent.click(screen.getByRole('button', { name: 'Panel actions' }));
	await userEvent.click(await screen.findByRole('menuitem', { name }));
}

describe('PanelActionsMenu submenus', () => {
	afterEach(() => {
		jest.clearAllMocks();
	});

	it.each([
		['Download as PNG', 'png'],
		['Download as SVG', 'svg'],
	])('"%s" downloads the panel image as %s', async (label, format) => {
		renderMenu();
		await openSubmenu('Download');
		await userEvent.click(await screen.findByRole('menuitem', { name: label }));

		expect(mockDownloadImage).toHaveBeenCalledTimes(1);
		expect(mockDownloadImage).toHaveBeenCalledWith('panel-1', 'Requests', format);
		expect(mockDownloadCsv).not.toHaveBeenCalled();
	});

	it('"Download as CSV" exports the table data, not an image', async () => {
		renderMenu();
		await openSubmenu('Download');
		await userEvent.click(
			await screen.findByRole('menuitem', { name: 'Download as CSV' }),
		);

		expect(mockDownloadCsv).toHaveBeenCalledTimes(1);
		expect(mockDownloadImage).not.toHaveBeenCalled();
	});

	it.each([
		['Dashboard (root)', 0],
		['B', 2],
	])('Move to "%s" moves the panel to layout %s', async (label, target) => {
		renderMenu();
		await openSubmenu('Move to section');

		const row = await screen.findByRole('menuitem', { name: label });
		// The panel already sits in "A".
		expect(screen.queryByRole('menuitem', { name: 'A' })).not.toBeInTheDocument();

		await userEvent.click(row);

		expect(mockMovePanel).toHaveBeenCalledTimes(1);
		expect(mockMovePanel).toHaveBeenCalledWith({
			panelId: 'panel-1',
			fromLayoutIndex: 1,
			toLayoutIndex: target,
		});
	});
});
