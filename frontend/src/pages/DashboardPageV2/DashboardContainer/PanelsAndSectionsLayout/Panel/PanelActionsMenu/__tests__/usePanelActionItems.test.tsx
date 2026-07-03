import { act, renderHook } from '@testing-library/react';
import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import type { ROLES } from 'types/roles';

import type { DashboardSection } from '../../../../utils';
import { useDashboardStore } from '../../../../store/useDashboardStore';
import { usePanelActionItems } from '../usePanelActionItems';

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

const mockCreateAlert = jest.fn();
jest.mock('../../hooks/useCreateAlertFromPanel', () => ({
	useCreateAlertFromPanel: (): jest.Mock => mockCreateAlert,
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

const baseArgs = {
	panelId: 'panel-1',
	panel: mockPanel,
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
			'create-alert',
			'divider',
			'move',
			'divider',
			'delete-panel',
		]);
		// download stays hidden: no current kind declares the capability
		// (V1 parity — CSV export was table-only).
	});

	it('AUTHOR loses edit and clone (edit_widget excludes AUTHOR) but keeps the rest', () => {
		mockRole = 'AUTHOR';
		const { result } = renderHook(() => usePanelActionItems(baseArgs));
		expect(itemKeys(result.current)).toStrictEqual([
			'view-panel',
			'divider',
			'create-alert',
			'divider',
			'move',
			'divider',
			'delete-panel',
		]);
	});

	it('VIEWER keeps only the role-ungated actions (view, create-alert)', () => {
		mockRole = 'VIEWER';
		const { result } = renderHook(() => usePanelActionItems(baseArgs));
		expect(itemKeys(result.current)).toStrictEqual([
			'view-panel',
			'divider',
			'create-alert',
		]);
	});

	it('read-only dashboard keeps View and Create Alerts (V1 parity: both survive a lock)', () => {
		useDashboardStore.setState({ isEditable: false });
		const { result } = renderHook(() =>
			usePanelActionItems({ ...baseArgs, panelActions: undefined }),
		);
		// Create Alerts opens a new tab and never mutates the dashboard, so it
		// isn't gated on edit access — matching V1's locked-dashboard menu.
		expect(itemKeys(result.current)).toStrictEqual([
			'view-panel',
			'divider',
			'create-alert',
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

	it('offers "Move out of section" for a panel in a titled section when an untitled root exists', () => {
		const { result } = renderHook(() =>
			usePanelActionItems({
				...baseArgs,
				panelActions: { currentLayoutIndex: 1, sections: TITLED_WITH_ROOT },
			}),
		);
		expect(itemKeys(result.current)).toContain('move-to-root');
	});

	it('"Move out of section" moves the panel to the untitled root section', () => {
		const { result } = renderHook(() =>
			usePanelActionItems({
				...baseArgs,
				panelActions: { currentLayoutIndex: 1, sections: TITLED_WITH_ROOT },
			}),
		);
		const moveOut = result.current.items.find(
			(i) => 'key' in i && i.key === 'move-to-root',
		);
		(moveOut as { onClick: () => void }).onClick();
		expect(mockMovePanel).toHaveBeenCalledWith({
			panelId: 'panel-1',
			fromLayoutIndex: 1,
			toLayoutIndex: 0,
		});
	});

	it('hides "Move out of section" when the panel already sits in the root section', () => {
		const { result } = renderHook(() =>
			usePanelActionItems({
				...baseArgs,
				panelActions: { currentLayoutIndex: 0, sections: TITLED_WITH_ROOT },
			}),
		);
		expect(itemKeys(result.current)).not.toContain('move-to-root');
	});

	it('hides "Move out of section" when every section is titled (no root)', () => {
		const { result } = renderHook(() => usePanelActionItems(baseArgs));
		expect(itemKeys(result.current)).not.toContain('move-to-root');
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

	it('not-yet-implemented actions (view) fire the placeholder alert with the feature name', () => {
		const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
		const { result } = renderHook(() => usePanelActionItems(baseArgs));

		const view = result.current.items.find(
			(i) => 'key' in i && i.key === 'view-panel',
		);
		(view as { onClick: () => void }).onClick();

		expect(alertSpy).toHaveBeenCalledTimes(1);
		expect(alertSpy).toHaveBeenCalledWith('View option clicked');
		alertSpy.mockRestore();
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
