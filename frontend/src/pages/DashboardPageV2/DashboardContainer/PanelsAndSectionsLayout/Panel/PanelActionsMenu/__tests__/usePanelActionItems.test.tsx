import { act, renderHook } from '@testing-library/react';
import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import type { PanelQueryData } from 'pages/DashboardPageV2/DashboardContainer/queryV5/types';
import type { ROLES } from 'types/roles';

import type { DashboardSection } from '../../../../utils';
import { useDashboardStore } from '../../../../store/useDashboardStore';
import { usePanelActionItems } from '../usePanelActionItems';

/** Keys of the disabled items, in order. */
function disabledKeys(
	result: ReturnType<typeof usePanelActionItems>,
): unknown[] {
	return result.items
		.filter((item) => 'disabled' in item && item.disabled)
		.map((item) => ('key' in item ? item.key : undefined));
}

const mockOpenEditor = jest.fn();
jest.mock(
	'pages/DashboardPageV2/DashboardContainer/hooks/useOpenPanelEditor',
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

// Role is the only thing read off the app context; useComponentPermission runs
// for real so the tests exercise the actual role → permission mapping.
let mockRole: ROLES = 'ADMIN';
jest.mock('providers/App/App', () => ({
	useAppContext: (): { user: { role: ROLES } } => ({
		user: { role: mockRole },
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
		'key' in item && item.key !== undefined ? item.key : item.type,
	);
}

describe('usePanelActionItems', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockRole = 'ADMIN';
		useDashboardStore.setState({ canEditDashboard: true, isLocked: false });
	});

	it('ADMIN on an editable dashboard with a known kind gets the full V1-parity set, divider-separated', () => {
		const { result } = renderHook(() => usePanelActionItems(baseArgs));
		expect(itemKeys(result.current)).toStrictEqual([
			'view-panel',
			'edit-panel',
			'clone-panel',
			'divider',
			'download',
			'create-alert',
			'divider',
			'move',
			'divider',
			'delete-panel',
		]);
		// The single "Download" entry is a submenu (PNG/SVG, plus CSV on tables);
		// it's present for every renderable kind.
	});

	it('AUTHOR loses edit and clone (edit_widget excludes AUTHOR) but keeps the rest', () => {
		mockRole = 'AUTHOR';
		const { result } = renderHook(() => usePanelActionItems(baseArgs));
		expect(itemKeys(result.current)).toStrictEqual([
			'view-panel',
			'divider',
			'download',
			'create-alert',
			'divider',
			'move',
			'divider',
			'delete-panel',
		]);
	});

	it('VIEWER keeps only the role-ungated actions (view, download, create-alert)', () => {
		mockRole = 'VIEWER';
		const { result } = renderHook(() => usePanelActionItems(baseArgs));
		expect(itemKeys(result.current)).toStrictEqual([
			'view-panel',
			'divider',
			'download',
			'create-alert',
		]);
	});

	it('no edit permission (view mode) hides the edit actions entirely', () => {
		useDashboardStore.setState({ canEditDashboard: false });
		const { result } = renderHook(() =>
			usePanelActionItems({ ...baseArgs, panelActions: undefined }),
		);
		expect(itemKeys(result.current)).toStrictEqual([
			'view-panel',
			'divider',
			'download',
			'create-alert',
		]);
	});

	it('locked (edit mode) keeps the edit actions visible but disabled', () => {
		useDashboardStore.setState({ canEditDashboard: true, isLocked: true });
		// A locked dashboard mounts panels without layout context (no panelActions).
		const { result } = renderHook(() =>
			usePanelActionItems({ ...baseArgs, panelActions: undefined }),
		);
		expect(itemKeys(result.current)).toStrictEqual([
			'view-panel',
			'edit-panel',
			'clone-panel',
			'divider',
			'download',
			'create-alert',
			'divider',
			'move',
			'divider',
			'delete-panel',
		]);
		expect(disabledKeys(result.current)).toStrictEqual([
			'edit-panel',
			'clone-panel',
			'move',
			'delete-panel',
		]);
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
		const edit = result.current.items.find(
			(i) => 'key' in i && i.key === 'edit-panel',
		);
		(edit as { onClick: () => void }).onClick();
		expect(mockOpenEditor).toHaveBeenCalledWith('panel-1');
	});

	it('"Move to section" offers a single "Dashboard (root)" target', () => {
		const { result } = renderHook(() => usePanelActionItems(baseArgs));
		const move = result.current.items.find(
			(i) => 'key' in i && i.key === 'move',
		) as {
			children: { key: string; onClick: () => void }[];
		};
		expect(move.children.map((c) => c.key)).toStrictEqual(['move-to-root']);
	});

	it('the "Dashboard (root)" target moves the panel to the untitled root section', () => {
		const { result } = renderHook(() => usePanelActionItems(baseArgs));
		const move = result.current.items.find(
			(i) => 'key' in i && i.key === 'move',
		) as {
			children: { onClick: () => void }[];
		};
		move.children[0].onClick();
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
		const move = result.current.items.find(
			(i) => 'key' in i && i.key === 'move',
		) as { children: { key: string; label: string }[] };
		expect(move.children.map((c) => c.key)).toStrictEqual(['move-1', 'move-2']);
		expect(move.children.map((c) => c.label)).toStrictEqual(['A', 'B']);
	});

	it('a panel in a titled section can move to the root and the other titled sections', () => {
		const { result } = renderHook(() =>
			usePanelActionItems({
				...baseArgs,
				panelActions: { currentLayoutIndex: 1, sections: ROOT_AND_TWO_TITLED },
			}),
		);
		const move = result.current.items.find(
			(i) => 'key' in i && i.key === 'move',
		) as { children: { key: string; label: string }[] };
		// Root leads, then the other titled section — never the current one (A).
		expect(move.children.map((c) => c.key)).toStrictEqual([
			'move-to-root',
			'move-2',
		]);
		expect(move.children.map((c) => c.label)).toStrictEqual([
			'Dashboard (root)',
			'B',
		]);
	});

	it('moves between titled sections even when the board has no untitled root', () => {
		const { result } = renderHook(() =>
			usePanelActionItems({
				...baseArgs,
				panelActions: { currentLayoutIndex: 0, sections: TWO_TITLED_SECTIONS },
			}),
		);
		const move = result.current.items.find(
			(i) => 'key' in i && i.key === 'move',
		) as { children: { key: string; onClick: () => void }[] };
		expect(move.children.map((c) => c.key)).toStrictEqual(['move-1']);
		move.children[0].onClick();
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
		const del = result.current.items.find(
			(i) => 'key' in i && i.key === 'delete-panel',
		);

		// Clicking the menu item only opens the dialog — no mutation yet.
		expect(result.current.deleteConfirm.open).toBe(false);
		act(() => {
			(del as { onClick: () => void }).onClick();
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
		const clone = result.current.items.find(
			(i) => 'key' in i && i.key === 'clone-panel',
		);
		(clone as { onClick: () => void }).onClick();
		expect(mockClonePanel).toHaveBeenCalledWith({
			panelId: 'panel-1',
			layoutIndex: 1,
		});
	});

	it('the Download submenu captures the panel by id, name and chosen format', () => {
		const { result } = renderHook(() => usePanelActionItems(baseArgs));
		const download = result.current.items.find(
			(i) => 'key' in i && i.key === 'download',
		) as { children: { key: string; onClick: () => void }[] };

		// TimeSeries declares no CSV capability, so the submenu is just PNG + SVG.
		expect(download.children.map((c) => c.key)).toStrictEqual([
			'download-png',
			'download-svg',
		]);

		download.children.find((c) => c.key === 'download-png')?.onClick();
		expect(mockDownloadImage).toHaveBeenCalledWith('panel-1', 'CPU', 'png');

		download.children.find((c) => c.key === 'download-svg')?.onClick();
		expect(mockDownloadImage).toHaveBeenCalledWith('panel-1', 'CPU', 'svg');
	});

	it('view opens the View modal for the panel', () => {
		const { result } = renderHook(() => usePanelActionItems(baseArgs));
		const view = result.current.items.find(
			(i) => 'key' in i && i.key === 'view-panel',
		);
		(view as { onClick: () => void }).onClick();
		expect(mockOpenView).toHaveBeenCalledWith('panel-1');
	});

	it('create-alert seeds an alert from this panel', () => {
		const { result } = renderHook(() => usePanelActionItems(baseArgs));
		const createAlert = result.current.items.find(
			(i) => 'key' in i && i.key === 'create-alert',
		);
		(createAlert as { onClick: () => void }).onClick();
		expect(mockCreateAlert).toHaveBeenCalledWith(mockPanel, 'panel-1');
	});
});
