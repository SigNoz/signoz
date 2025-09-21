// This test suite covers several important scenarios:
// - Empty layout - widget should be placed at origin (0,0)
// - Empty layout with custom dimensions
// - Placing widget next to an existing widget when there's space in the last row
// - Placing widget at bottom when the last row is full
// - Handling multiple rows correctly
// - Handling widgets with different heights

import { placeWidgetAtBottom, placeWidgetBetweenRows } from '../utils';

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

describe('placeWidgetBetweenRows', () => {
	it('should return single widget layout when layout is empty', () => {
		const result = placeWidgetBetweenRows('widget1', [], 'currentRow');
		expect(result).toEqual([
			{
				i: 'widget1',
				x: 0,
				y: 0,
				w: 6,
				h: 6,
			},
		]);
	});

	it('should place widget at the end of the layout when no nextRowId is provided', () => {
		const existingLayout = [
			{ i: 'widget1', x: 0, y: 0, w: 6, h: 6 },
			{ i: 'widget2', x: 6, y: 0, w: 6, h: 6 },
		];

		const result = placeWidgetBetweenRows('widget3', existingLayout, 'widget2');

		expect(result).toEqual([
			{ i: 'widget1', x: 0, y: 0, w: 6, h: 6 },
			{ i: 'widget2', x: 6, y: 0, w: 6, h: 6 },
			{ i: 'widget3', x: 0, y: 6, w: 6, h: 6 },
		]);
	});

	it('should place widget between current and next row', () => {
		const existingLayout = [
			{
				h: 1,
				i: "'widget1'",
				maxH: 1,
				minH: 1,
				minW: 12,
				moved: false,
				static: false,
				w: 12,
				x: 0,
				y: 0,
			},
			{ i: 'widget2', x: 6, y: 0, w: 6, h: 6 },
			{
				h: 1,
				i: 'widget3',
				maxH: 1,
				minH: 1,
				minW: 12,
				moved: false,
				static: false,
				w: 12,
				x: 0,
				y: 7,
			},
		];

		const result = placeWidgetBetweenRows(
			'widget4',
			existingLayout,
			'widget1',
			'widget3',
		);

		expect(result).toEqual([
			{
				h: 1,
				i: "'widget1'",
				maxH: 1,
				minH: 1,
				minW: 12,
				moved: false,
				static: false,
				w: 12,
				x: 0,
				y: 0,
			},
			{
				h: 6,
				i: 'widget2',
				w: 6,
				x: 6,
				y: 0,
			},
			{
				h: 6,
				i: 'widget4',
				w: 6,
				x: 0,
				y: 6,
			},
			{
				h: 1,
				i: 'widget3',
				maxH: 1,
				minH: 1,
				minW: 12,
				moved: false,
				static: false,
				w: 12,
				x: 0,
				y: 7,
			},
		]);
	});

	it('should respect custom widget dimensions', () => {
		const existingLayout = [{ i: 'widget1', x: 0, y: 0, w: 12, h: 4 }];

		const result = placeWidgetBetweenRows(
			'widget2',
			existingLayout,
			'widget1',
			null,
			8,
			3,
		);

		expect(result).toEqual([
			{ i: 'widget1', x: 0, y: 0, w: 12, h: 4 },
			{ i: 'widget2', x: 0, y: 4, w: 8, h: 3 },
		]);
	});
});
