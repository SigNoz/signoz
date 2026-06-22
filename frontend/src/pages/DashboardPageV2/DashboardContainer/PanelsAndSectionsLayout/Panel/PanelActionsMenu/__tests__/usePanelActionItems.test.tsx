import { act, renderHook } from '@testing-library/react';
import type { ROLES } from 'types/roles';

import type { DashboardSection } from '../../../../utils';
import { useDashboardStore } from '../../../../store/useDashboardStore';
import { usePanelActionItems } from '../usePanelActionItems';
import { PanelKind } from 'pages/DashboardPageV2/DashboardContainer/Panels/types/panelKind';

const mockOpenEditor = jest.fn();
jest.mock(
	'pages/DashboardPageV2/DashboardContainer/hooks/useOpenPanelEditor',
	() => ({
		useOpenPanelEditor: (): jest.Mock => mockOpenEditor,
	}),
);

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

const baseArgs = {
	panelId: 'panel-1',
	panelName: 'My panel',
	panelKind: 'signoz/TimeSeriesPanel' as PanelKind,
	panelActions: { currentLayoutIndex: 0, sections: TWO_TITLED_SECTIONS },
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
		useDashboardStore.setState({ isEditable: true });
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

	it('unknown panel kind hides all kind-gated actions (incl. clone), keeping only move/delete', () => {
		const { result } = renderHook(() =>
			// A kind with no registered definition — exercises the "unsupported kind"
			// branch. Clone is kind-gated (needs the kind to declare actions.clone),
			// so it drops too; only the kind-agnostic layout actions remain.
			usePanelActionItems({
				...baseArgs,
				panelKind: 'signoz/UnsupportedPanel' as PanelKind,
			}),
		);
		expect(itemKeys(result.current)).toStrictEqual([
			'move',
			'divider',
			'delete-panel',
		]);
	});

	it('read-only dashboard keeps the non-mutating actions (View, download-image)', () => {
		useDashboardStore.setState({ isEditable: false });
		const { result } = renderHook(() =>
			usePanelActionItems({ ...baseArgs, panelActions: undefined }),
		);
		// View and the Download submenu (PNG/SVG) are non-mutating, so they
		// survive on a read-only dashboard (V1 parity for View; image export
		// follows the same policy).
		expect(itemKeys(result.current)).toStrictEqual([
			'view-panel',
			'divider',
			'download',
		]);
	});

	it('move is disabled when there is no other titled section to move to', () => {
		const { result } = renderHook(() =>
			usePanelActionItems({
				...baseArgs,
				panelActions: {
					currentLayoutIndex: 0,
					sections: [section(0, 'Overview'), section(1, undefined)],
				},
			}),
		);
		const move = result.current.items.find((i) => 'key' in i && i.key === 'move');
		expect(move).toMatchObject({ disabled: true });
	});

	it('edit opens the panel editor for this panel', () => {
		const { result } = renderHook(() => usePanelActionItems(baseArgs));
		const edit = result.current.items.find(
			(i) => 'key' in i && i.key === 'edit-panel',
		);
		(edit as { onClick: () => void }).onClick();
		expect(mockOpenEditor).toHaveBeenCalledWith('panel-1');
	});

	it('move targets call the mutation with from/to layout indexes', () => {
		const { result } = renderHook(() => usePanelActionItems(baseArgs));
		const move = result.current.items.find(
			(i) => 'key' in i && i.key === 'move',
		) as {
			children: { key: string; onClick: () => void }[];
		};
		expect(move.children).toHaveLength(1);
		move.children[0].onClick();
		expect(mockMovePanel).toHaveBeenCalledWith({
			panelId: 'panel-1',
			fromLayoutIndex: 0,
			toLayoutIndex: 1,
		});
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
			layoutIndex: 0,
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
			layoutIndex: 0,
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
		expect(mockDownloadImage).toHaveBeenCalledWith('panel-1', 'My panel', 'png');

		download.children.find((c) => c.key === 'download-svg')?.onClick();
		expect(mockDownloadImage).toHaveBeenCalledWith('panel-1', 'My panel', 'svg');
	});

	it('not-yet-implemented actions (view/create-alert) fire the placeholder alert with the feature name', () => {
		const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
		const { result } = renderHook(() => usePanelActionItems(baseArgs));

		['view-panel', 'create-alert'].forEach((key) => {
			const item = result.current.items.find((i) => 'key' in i && i.key === key);
			(item as { onClick: () => void }).onClick();
		});

		expect(alertSpy).toHaveBeenCalledTimes(2);
		expect(alertSpy).toHaveBeenCalledWith('View option clicked');
		expect(alertSpy).toHaveBeenCalledWith('Create Alerts option clicked');
		alertSpy.mockRestore();
	});
});
