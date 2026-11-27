import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import type { PanelQueryData } from 'pages/DashboardPage/DashboardContainer/queryV5/types';
import {
	render,
	screen,
	userEvent,
	NO_DELAY_USER_EVENT,
} from 'tests/test-utils';

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

const MENU_TEST_ID = 'panel-actions-panel-1';

type User = ReturnType<typeof userEvent.setup>;

// skipHover: simulated pointer travel fires pointerleave on the subtrigger and
// Base UI's safe-polygon math (zero rects in jsdom) closes the submenu.
const setupUser = (): User =>
	userEvent.setup({ ...NO_DELAY_USER_EVENT, skipHover: true });

async function openSubmenu(user: User, value: string): Promise<void> {
	await user.click(screen.getByTestId(MENU_TEST_ID));
	(await screen.findByTestId(`${MENU_TEST_ID}-item-${value}`)).focus();
	await user.keyboard('{ArrowRight}');
}

describe('PanelActionsMenu submenus', () => {
	afterEach(() => {
		jest.clearAllMocks();
	});

	it.each([
		['Download as PNG', 'png'],
		['Download as SVG', 'svg'],
	])('"%s" downloads the panel image as %s', async (label, format) => {
		const user = setupUser();
		renderMenu();
		await openSubmenu(user, 'download');
		const row = await screen.findByTestId(
			`${MENU_TEST_ID}-item-download-${format}`,
		);
		expect(row).toHaveTextContent(label);
		await user.click(row);

		expect(mockDownloadImage).toHaveBeenCalledTimes(1);
		expect(mockDownloadImage).toHaveBeenCalledWith('panel-1', 'Requests', format);
		expect(mockDownloadCsv).not.toHaveBeenCalled();
	});

	it('"Download as CSV" exports the table data, not an image', async () => {
		const user = setupUser();
		renderMenu();
		await openSubmenu(user, 'download');
		const row = await screen.findByTestId(`${MENU_TEST_ID}-item-download-csv`);
		expect(row).toHaveTextContent('Download as CSV');
		await user.click(row);

		expect(mockDownloadCsv).toHaveBeenCalledTimes(1);
		expect(mockDownloadImage).not.toHaveBeenCalled();
	});

	it.each([
		['Dashboard (root)', 0, 'move-to-root'],
		['B', 2, 'move-2'],
	])(
		'Move to "%s" moves the panel to layout %s',
		async (label, target, value) => {
			const user = setupUser();
			renderMenu();
			await openSubmenu(user, 'move');

			const row = await screen.findByTestId(`${MENU_TEST_ID}-item-${value}`);
			expect(row).toHaveTextContent(label);
			// The panel already sits in "A".
			expect(
				screen.queryByTestId(`${MENU_TEST_ID}-item-move-1`),
			).not.toBeInTheDocument();

			await user.click(row);

			expect(mockMovePanel).toHaveBeenCalledTimes(1);
			expect(mockMovePanel).toHaveBeenCalledWith({
				panelId: 'panel-1',
				fromLayoutIndex: 1,
				toLayoutIndex: target,
			});
		},
	);
});
