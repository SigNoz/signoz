// This test suite covers several important scenarios:
// - Empty layout - widget should be placed at origin (0,0)
// - Empty layout with custom dimensions
// - Placing widget next to an existing widget when there's space in the last row
// - Placing widget at bottom when the last row is full
// - Handling multiple rows correctly
// - Handling widgets with different heights

import { placeWidgetAtBottom } from '../utils';

describe('placeWidgetAtBottom', () => {
	it('should place widget at (0,0) when layout is empty', () => {
		const result = placeWidgetAtBottom('widget1', []);
		expect(result).toEqual({
			i: 'widget1',
			x: 0,
			y: 0,
			w: 6,
			h: 6,
		});
	});

	it('should place widget at (0,0) with custom dimensions when layout is empty', () => {
		const result = placeWidgetAtBottom('widget1', [], 4, 8);
		expect(result).toEqual({
			i: 'widget1',
			x: 0,
			y: 0,
			w: 4,
			h: 8,
		});
	});

	it('should place widget next to existing widget in last row if space available', () => {
		const existingLayout = [{ i: 'widget1', x: 0, y: 0, w: 6, h: 6 }];
		const result = placeWidgetAtBottom('widget2', existingLayout);
		expect(result).toEqual({
			i: 'widget2',
			x: 6,
			y: 0,
			w: 6,
			h: 6,
		});
	});

	it('should place widget at bottom when last row is full', () => {
		const existingLayout = [
			{ i: 'widget1', x: 0, y: 0, w: 6, h: 6 },
			{ i: 'widget2', x: 6, y: 0, w: 6, h: 6 },
		];
		const result = placeWidgetAtBottom('widget3', existingLayout);
		expect(result).toEqual({
			i: 'widget3',
			x: 0,
			y: 6,
			w: 6,
			h: 6,
		});
	});

	it('should handle multiple rows correctly', () => {
		const existingLayout = [
			{ i: 'widget1', x: 0, y: 0, w: 6, h: 6 },
			{ i: 'widget2', x: 6, y: 0, w: 6, h: 6 },
			{ i: 'widget3', x: 0, y: 6, w: 6, h: 6 },
		];
		const result = placeWidgetAtBottom('widget4', existingLayout);
		expect(result).toEqual({
			i: 'widget4',
			x: 6,
			y: 6,
			w: 6,
			h: 6,
		});
	});

	it('should handle widgets with different heights', () => {
		const existingLayout = [
			{ i: 'widget1', x: 0, y: 0, w: 6, h: 8 },
			{ i: 'widget2', x: 6, y: 0, w: 6, h: 4 },
		];
		const result = placeWidgetAtBottom('widget3', existingLayout);
		// y = 2 here as later the react-grid-layout will add 2px to the y value while adjusting the layout
		expect(result).toEqual({
			i: 'widget3',
			x: 6,
			y: 2,
			w: 6,
			h: 6,
		});
	});
});
