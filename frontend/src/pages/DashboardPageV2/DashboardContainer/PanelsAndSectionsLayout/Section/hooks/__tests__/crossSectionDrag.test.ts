import {
	isPanelDragId,
	isSectionDropId,
	layoutIndexFromDropId,
	panelDraggableId,
	resolvePanelMove,
	sectionDropId,
} from '../crossSectionDrag';

describe('crossSectionDrag — id helpers', () => {
	it('builds and recognises panel drag ids', () => {
		const id = panelDraggableId('abc');
		expect(id).toBe('panel:abc');
		expect(isPanelDragId(id)).toBe(true);
		expect(isPanelDragId('dropzone:0')).toBe(false);
		expect(isPanelDragId('sec-abc')).toBe(false);
	});

	it('builds and parses section drop ids', () => {
		expect(sectionDropId(3)).toBe('dropzone:3');
		expect(isSectionDropId('dropzone:3')).toBe(true);
		expect(isSectionDropId('panel:x')).toBe(false);
		expect(layoutIndexFromDropId('dropzone:3')).toBe(3);
		expect(layoutIndexFromDropId('dropzone:0')).toBe(0);
		expect(layoutIndexFromDropId('panel:x')).toBeNull();
		expect(layoutIndexFromDropId('dropzone:abc')).toBeNull();
	});
});

describe('resolvePanelMove', () => {
	const drag = { panelId: 'p1', fromLayoutIndex: 0 };

	it('is a no-op without a drag or a drop target', () => {
		expect(resolvePanelMove(null, 'dropzone:1')).toBeNull();
		expect(resolvePanelMove(drag, null)).toBeNull();
	});

	it('is a no-op when dropped over a non-dropzone', () => {
		expect(resolvePanelMove(drag, 'sec-abc')).toBeNull();
	});

	it('is a no-op when dropped back on the same section', () => {
		expect(resolvePanelMove(drag, 'dropzone:0')).toBeNull();
	});

	it('resolves a move to a different section', () => {
		expect(resolvePanelMove(drag, 'dropzone:2')).toStrictEqual({
			panelId: 'p1',
			fromLayoutIndex: 0,
			toLayoutIndex: 2,
		});
	});
});
