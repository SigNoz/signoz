import type { MouseEvent } from 'react';
import type {
	DropdownActionItemType,
	DropdownItemType,
	DropdownSubmenuChildType,
} from '@signozhq/ui/dropdown';
import { act, renderHook } from '@testing-library/react';
import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import type { BrandedPermission } from 'lib/authz/hooks/useAuthZ/types';
import type { PanelQueryData } from 'pages/DashboardPage/DashboardContainer/queryV5/types';

import type { DashboardSection } from '../../../../utils';
import { usePanelActionItems } from '../usePanelActionItems';

/** Keys of the disabled items, in order. */
// The derivation has its own suite (useDashboardEditContext.authz); these cases are
// about what the UI does with a given edit context, so control it directly.
const mockEditContext = {
	isEditable: true,
	editChecks: [] as BrandedPermission[],
	areOtherPermissionsLoading: false,
	deleteChecks: [],
	isLocked: false,
	canEditDashboard: true,
	canDeleteDashboard: true,
	editDisabledTooltip: '',
	deleteDisabledTooltip: '',
};
function setEditContextMock(next: Partial<typeof mockEditContext>): void {
	Object.assign(mockEditContext, {
		isEditable: true,
		editChecks: [],
		isLocked: false,
		canEditDashboard: true,
		canDeleteDashboard: true,
		editDisabledTooltip: '',
		deleteDisabledTooltip: '',
		...next,
	});
}
jest.mock(
	'pages/DashboardPage/DashboardContainer/hooks/useDashboardEditContext',
	() => ({
		useDashboardEditContext: (): typeof mockEditContext => mockEditContext,
	}),
);

function disabledKeys(
	result: ReturnType<typeof usePanelActionItems>,
): unknown[] {
	return result.items
		.filter((item) => 'disabled' in item && item.disabled)
		.map((item) => ('value' in item ? item.value : undefined));
}

function disabledReasons(
	result: ReturnType<typeof usePanelActionItems>,
): unknown[] {
	return result.items
		.filter((item) => 'disabled' in item && item.disabled)
		.map((item) =>
			'disabledTooltip' in item ? item.disabledTooltip : undefined,
		);
}

type Row = DropdownItemType | DropdownSubmenuChildType;

function actionRow(rows: Row[], value: string): DropdownActionItemType {
	const row = rows.find((r) => r.type === 'item' && r.value === value);
	if (row?.type !== 'item') {
		throw new Error(`No "${value}" action row`);
	}
	return row;
}

function submenuRows(rows: Row[], value: string): DropdownActionItemType[] {
	const row = rows.find((r) => r.type === 'submenu' && r.value === value);
	if (row?.type !== 'submenu') {
		throw new Error(`No "${value}" submenu`);
	}
	return row.items.filter(
		(child): child is DropdownActionItemType => child.type === 'item',
	);
}

// The rows ignore the event, so an empty one stands in for the click.
function click(row: DropdownActionItemType): void {
	row.onClick?.({} as MouseEvent);
}

const mockOpenEditor = jest.fn();
jest.mock(
	'pages/DashboardPage/DashboardContainer/hooks/useOpenPanelEditor',
	() => ({
		useOpenPanelEditor: (): jest.Mock => mockOpenEditor,
	}),
);

const mockOpenView = jest.fn();
jest.mock('../../hooks/useViewPanel', () => ({
	useViewPanel: (): {
		openView: jest.Mock;
		closeView: jest.Mock;
		expandedPanelId: string | null;
	} => ({
		openView: mockOpenView,
		closeView: jest.fn(),
		expandedPanelId: null,
	}),
}));

const mockMovePanel = jest.fn();
jest.mock('../../hooks/useMovePanelToSection', () => ({
	useMovePanelToSection: (): jest.Mock => mockMovePanel,
}));

const mockDeletePanel = jest.fn();
jest.mock('../../hooks/useDeletePanel', () => ({
	useDeletePanel: (): jest.Mock => mockDeletePanel,
}));

const mockClonePanel = jest.fn();
jest.mock('../../hooks/useClonePanel', () => ({
	useClonePanel: (): jest.Mock => mockClonePanel,
}));

const mockCreateAlert = jest.fn();
jest.mock('../../hooks/useCreateAlertFromPanel', () => ({
	useCreateAlertFromPanel: (): jest.Mock => mockCreateAlert,
}));

const mockDownloadImage = jest.fn();
jest.mock('../../hooks/useDownloadPanelImage', () => ({
	useDownloadPanelImage: (): { downloadPanelImage: jest.Mock } => ({
		downloadPanelImage: mockDownloadImage,
	}),
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

const TWO_TITLED_SECTIONS = [section(0, 'Overview'), section(1, 'Latency')];
// Index 0 is the untitled root (free-flow) section; index 1 is a titled section.
const TITLED_WITH_ROOT = [section(0, undefined), section(1, 'Latency')];
// Untitled root plus two titled sections — exercises the multi-target submenu.
const ROOT_AND_TWO_TITLED = [
	section(0, undefined),
	section(1, 'A'),
	section(2, 'B'),
];
// Just the free-flow root: an ungrouped board with no sections to move between.
const ONLY_ROOT = [section(0, undefined)];

// Minimal panel — only its presence gates "Create Alerts"; the query→URL
// translation it drives is covered by buildCreateAlertUrl's own tests.
const mockPanel = {
	kind: 'Panel',
	spec: {
		display: { name: 'CPU' },
		plugin: { kind: 'signoz/TimeSeriesPanel', spec: {} },
		queries: [],
	},
} as unknown as DashboardtypesPanelDTO;

const mockData = {
	response: undefined,
	requestPayload: undefined,
	legendMap: {},
} as PanelQueryData;

const baseArgs = {
	panelId: 'panel-1',
	panel: mockPanel,
	data: mockData,
	// Panel sits in a titled section with an untitled root present, so every
	// action — including "Move to section" (→ Dashboard root) — is available.
	panelActions: { currentLayoutIndex: 1, sections: TITLED_WITH_ROOT },
};

function itemKeys(result: ReturnType<typeof usePanelActionItems>): unknown[] {
	return result.items.map((item) =>
		item.type === 'separator' || !('value' in item) ? item.type : item.value,
	);
}

describe('usePanelActionItems', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		setEditContextMock({});
	});

	it('an editable dashboard with a known kind gets the full set, divider-separated', () => {
		const { result } = renderHook(() => usePanelActionItems(baseArgs));
		expect(itemKeys(result.current)).toStrictEqual([
			'view-panel',
			'edit-panel',
			'clone-panel',
			'separator',
			'download',
			'create-alert',
			'separator',
			'move',
			'separator',
			'delete-panel',
		]);
		// The single "Download" entry is a submenu (PNG/SVG, plus CSV on tables);
		// it's present for every renderable kind.
	});

	// These used to be dropped from the menu, leaving no trace of why.
	it('without edit rights keeps the edit actions visible but disabled', () => {
		setEditContextMock({
			isEditable: false,
			canEditDashboard: false,
			editDisabledTooltip: 'no permission',
		});
		const { result } = renderHook(() =>
			usePanelActionItems({ ...baseArgs, panelActions: undefined }),
		);
		expect(itemKeys(result.current)).toStrictEqual([
			'view-panel',
			'edit-panel',
			'clone-panel',
			'separator',
			'download',
			'create-alert',
			'separator',
			'move',
			'separator',
			'delete-panel',
		]);
		expect(disabledKeys(result.current)).toStrictEqual([
			'edit-panel',
			'clone-panel',
			'move',
			'delete-panel',
		]);
		expect(disabledReasons(result.current)).toStrictEqual(
			Array(4).fill('no permission'),
		);
	});

	it('leaves a missing permission to the checks, which name it', () => {
		const editChecks = ['dashboard:update' as BrandedPermission];
		setEditContextMock({
			isEditable: false,
			canEditDashboard: false,
			editChecks,
		});
		const { result } = renderHook(() =>
			usePanelActionItems({ ...baseArgs, panelActions: undefined }),
		);
		expect(disabledKeys(result.current)).toStrictEqual([]);
		for (const value of ['edit-panel', 'clone-panel', 'move', 'delete-panel']) {
			expect(actionRow(result.current.items, value)).toHaveProperty(
				'checks',
				editChecks,
			);
		}
		expect(actionRow(result.current.items, 'view-panel')).not.toHaveProperty(
			'checks',
		);
	});

	it('locked (edit mode) keeps the edit actions visible but disabled', () => {
		setEditContextMock({
			isEditable: false,
			isLocked: true,
			editDisabledTooltip: 'locked',
		});
		// A locked dashboard mounts panels without layout context (no panelActions).
		const { result } = renderHook(() =>
			usePanelActionItems({ ...baseArgs, panelActions: undefined }),
		);
		expect(itemKeys(result.current)).toStrictEqual([
			'view-panel',
			'edit-panel',
			'clone-panel',
			'separator',
			'download',
			'create-alert',
			'separator',
			'move',
			'separator',
			'delete-panel',
		]);
		expect(disabledKeys(result.current)).toStrictEqual([
			'edit-panel',
			'clone-panel',
			'move',
			'delete-panel',
		]);
		expect(disabledReasons(result.current)).toStrictEqual(
			Array(4).fill('locked'),
		);
	});

	it('hides "Move to section" when the only untitled section is not the root (index 0)', () => {
		const { result } = renderHook(() =>
			usePanelActionItems({
				...baseArgs,
				panelActions: {
					currentLayoutIndex: 0,
					sections: [section(0, 'Overview'), section(1, undefined)],
				},
			}),
		);
		// An untitled section only counts as the root at layoutIndex 0.
		expect(itemKeys(result.current)).not.toContain('move');
	});

	it('edit opens the panel editor for this panel', () => {
		const { result } = renderHook(() => usePanelActionItems(baseArgs));
		click(actionRow(result.current.items, 'edit-panel'));
		// The panel rides along so its saved query lands in the editor URL.
		expect(mockOpenEditor).toHaveBeenCalledWith('panel-1', {
			panel: mockPanel,
		});
	});

	it('"Move to section" offers a single "Dashboard (root)" target', () => {
		const { result } = renderHook(() => usePanelActionItems(baseArgs));
		const move = submenuRows(result.current.items, 'move');
		expect(move.map((c) => c.value)).toStrictEqual(['move-to-root']);
	});

	it('the "Dashboard (root)" target moves the panel to the untitled root section', () => {
		const { result } = renderHook(() => usePanelActionItems(baseArgs));
		click(submenuRows(result.current.items, 'move')[0]);
		expect(mockMovePanel).toHaveBeenCalledWith({
			panelId: 'panel-1',
			fromLayoutIndex: 1,
			toLayoutIndex: 0,
		});
	});

	it('an ungrouped panel (in the root) can move into each titled section', () => {
		const { result } = renderHook(() =>
			usePanelActionItems({
				...baseArgs,
				panelActions: { currentLayoutIndex: 0, sections: ROOT_AND_TWO_TITLED },
			}),
		);
		const move = submenuRows(result.current.items, 'move');
		expect(move.map((c) => c.value)).toStrictEqual(['move-1', 'move-2']);
		expect(move.map((c) => c.label)).toStrictEqual(['A', 'B']);
	});

	it('a panel in a titled section can move to the root and the other titled sections', () => {
		const { result } = renderHook(() =>
			usePanelActionItems({
				...baseArgs,
				panelActions: { currentLayoutIndex: 1, sections: ROOT_AND_TWO_TITLED },
			}),
		);
		const move = submenuRows(result.current.items, 'move');
		// Root leads, then the other titled section — never the current one (A).
		expect(move.map((c) => c.value)).toStrictEqual(['move-to-root', 'move-2']);
		expect(move.map((c) => c.label)).toStrictEqual(['Dashboard (root)', 'B']);
	});

	it('moves between titled sections even when the board has no untitled root', () => {
		const { result } = renderHook(() =>
			usePanelActionItems({
				...baseArgs,
				panelActions: { currentLayoutIndex: 0, sections: TWO_TITLED_SECTIONS },
			}),
		);
		const move = submenuRows(result.current.items, 'move');
		expect(move.map((c) => c.value)).toStrictEqual(['move-1']);
		click(move[0]);
		expect(mockMovePanel).toHaveBeenCalledWith({
			panelId: 'panel-1',
			fromLayoutIndex: 0,
			toLayoutIndex: 1,
		});
	});

	it('hides "Move to section" when the board has no sections (only the root)', () => {
		const { result } = renderHook(() =>
			usePanelActionItems({
				...baseArgs,
				panelActions: { currentLayoutIndex: 0, sections: ONLY_ROOT },
			}),
		);
		expect(itemKeys(result.current)).not.toContain('move');
	});

	it('delete defers to a confirmation: the item opens the dialog, confirm runs the mutation', async () => {
		const { result } = renderHook(() => usePanelActionItems(baseArgs));
		const del = actionRow(result.current.items, 'delete-panel');

		// Clicking the menu item only opens the dialog — no mutation yet.
		expect(result.current.deleteConfirm.open).toBe(false);
		act(() => {
			click(del);
		});
		expect(result.current.deleteConfirm.open).toBe(true);
		expect(mockDeletePanel).not.toHaveBeenCalled();

		// Confirming runs the delete and closes the dialog.
		await act(async () => {
			await result.current.deleteConfirm.confirm();
		});
		expect(mockDeletePanel).toHaveBeenCalledWith({
			panelId: 'panel-1',
			layoutIndex: 1,
		});
		expect(result.current.deleteConfirm.open).toBe(false);
	});

	it('clone calls the clone mutation with the panel and its layout index', () => {
		const { result } = renderHook(() => usePanelActionItems(baseArgs));
		click(actionRow(result.current.items, 'clone-panel'));
		expect(mockClonePanel).toHaveBeenCalledWith({
			panelId: 'panel-1',
			layoutIndex: 1,
		});
	});

	it('the Download submenu captures the panel by id, name and chosen format', () => {
		const { result } = renderHook(() => usePanelActionItems(baseArgs));
		const download = submenuRows(result.current.items, 'download');

		// TimeSeries declares no CSV capability, so the submenu is just PNG + SVG.
		expect(download.map((c) => c.value)).toStrictEqual([
			'download-png',
			'download-svg',
		]);

		click(actionRow(download, 'download-png'));
		expect(mockDownloadImage).toHaveBeenCalledWith('panel-1', 'CPU', 'png');

		click(actionRow(download, 'download-svg'));
		expect(mockDownloadImage).toHaveBeenCalledWith('panel-1', 'CPU', 'svg');
	});

	it('view opens the View modal for the panel', () => {
		const { result } = renderHook(() => usePanelActionItems(baseArgs));
		click(actionRow(result.current.items, 'view-panel'));
		// The panel goes along so the opener can seed the shared query builder before
		// the modal mounts (otherwise it renders the previously-viewed panel's query).
		expect(mockOpenView).toHaveBeenCalledWith('panel-1', baseArgs.panel);
	});

	it('create-alert seeds an alert from this panel', () => {
		const { result } = renderHook(() => usePanelActionItems(baseArgs));
		click(actionRow(result.current.items, 'create-alert'));
		expect(mockCreateAlert).toHaveBeenCalledWith(mockPanel, 'panel-1');
	});
});
