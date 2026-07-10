import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { act, renderHook } from '@testing-library/react';

import type { DashboardSection } from '../../../../utils';
import { usePanelDragMove } from '../usePanelDragMove';

const movePanel = jest.fn();
jest.mock('../../../Panel/hooks/useMovePanelToSection', () => ({
	useMovePanelToSection: () => movePanel,
}));

const sections: DashboardSection[] = [
	{
		id: 'sec-p1',
		layoutIndex: 0,
		title: 'A',
		repeatVariable: undefined,
		items: [
			{
				id: 'p1',
				x: 0,
				y: 0,
				width: 6,
				height: 6,
				panel: { spec: { display: { name: 'Panel 1' } } } as never,
			},
		],
	},
	{
		id: 'sec-empty-1',
		layoutIndex: 1,
		title: 'B',
		repeatVariable: undefined,
		items: [],
	},
];

const startEvent = (id: string, data?: unknown): DragStartEvent =>
	({ active: { id, data: { current: data } } }) as unknown as DragStartEvent;

const endEvent = (id: string, overId: string | null): DragEndEvent =>
	({
		active: { id, data: { current: undefined } },
		over: overId ? { id: overId } : null,
	}) as unknown as DragEndEvent;

beforeEach(() => movePanel.mockClear());

describe('usePanelDragMove', () => {
	it('ignores section-reorder drags (returns false, no active panel)', () => {
		const { result } = renderHook(() => usePanelDragMove({ sections }));
		let handled = true;
		act(() => {
			handled = result.current.handleDragStart(startEvent('sec-p1'));
		});
		expect(handled).toBe(false);
		expect(result.current.isDraggingPanel).toBe(false);
		expect(result.current.activePanel).toBeNull();
	});

	it('tracks the active panel while a grip is dragged', () => {
		const { result } = renderHook(() => usePanelDragMove({ sections }));
		act(() => {
			result.current.handleDragStart(
				startEvent('panel:p1', { panelId: 'p1', fromLayoutIndex: 0 }),
			);
		});
		expect(result.current.isDraggingPanel).toBe(true);
		expect(result.current.activePanel?.id).toBe('p1');
	});

	it('moves the panel to the dropped section', () => {
		const { result } = renderHook(() => usePanelDragMove({ sections }));
		act(() => {
			result.current.handleDragStart(
				startEvent('panel:p1', { panelId: 'p1', fromLayoutIndex: 0 }),
			);
		});
		let handled = false;
		act(() => {
			handled = result.current.handleDragEnd(endEvent('panel:p1', 'dropzone:1'));
		});
		expect(handled).toBe(true);
		expect(movePanel).toHaveBeenCalledWith({
			panelId: 'p1',
			fromLayoutIndex: 0,
			toLayoutIndex: 1,
		});
		expect(result.current.isDraggingPanel).toBe(false);
	});

	it('does not move when dropped back on the same section', () => {
		const { result } = renderHook(() => usePanelDragMove({ sections }));
		act(() => {
			result.current.handleDragStart(
				startEvent('panel:p1', { panelId: 'p1', fromLayoutIndex: 0 }),
			);
			result.current.handleDragEnd(endEvent('panel:p1', 'dropzone:0'));
		});
		expect(movePanel).not.toHaveBeenCalled();
	});

	it('lets section-reorder drag-end pass through (returns false)', () => {
		const { result } = renderHook(() => usePanelDragMove({ sections }));
		let handled = true;
		act(() => {
			handled = result.current.handleDragEnd(endEvent('sec-p1', 'sec-empty-1'));
		});
		expect(handled).toBe(false);
		expect(movePanel).not.toHaveBeenCalled();
	});
});
