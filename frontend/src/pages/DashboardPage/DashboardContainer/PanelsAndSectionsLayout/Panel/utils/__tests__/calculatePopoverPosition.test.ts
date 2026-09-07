import { calculatePopoverPosition } from '../calculatePopoverPosition';

// Popover is 300×254 with a 10px offset; these are the edges the placement flips against.
const setViewport = (width: number, height: number): void => {
	Object.defineProperty(window, 'innerWidth', {
		value: width,
		configurable: true,
	});
	Object.defineProperty(window, 'innerHeight', {
		value: height,
		configurable: true,
	});
};

describe('calculatePopoverPosition', () => {
	beforeEach(() => setViewport(1920, 1080));

	it('anchors to the right of the click when there is room', () => {
		expect(calculatePopoverPosition({ x: 100, y: 100 })).toStrictEqual({
			left: 110,
			top: 90,
			placement: 'right',
		});
	});

	it('flips to the left near the right edge', () => {
		const { left, placement } = calculatePopoverPosition({ x: 1900, y: 100 });
		expect(placement).toBe('left');
		expect(left).toBe(1900 - 300 + 10);
	});

	it('clamps back in when the left flip would overflow a narrow viewport', () => {
		setViewport(320, 1080);
		// Right flip fires (60 + 300 > 320) but its left (50 - 300 + 10) is off-screen, so it clamps.
		expect(calculatePopoverPosition({ x: 50, y: 100 })).toMatchObject({
			left: 10,
			placement: 'right',
		});
	});

	it('drops below the click near the top edge', () => {
		expect(calculatePopoverPosition({ x: 100, y: 2 })).toMatchObject({
			top: 10,
			placement: 'bottomRight',
		});
	});

	it('lifts above the click near the bottom edge', () => {
		const { top, placement } = calculatePopoverPosition({ x: 100, y: 1070 });
		expect(placement).toBe('topRight');
		expect(top).toBe(1080 - 254 - 10);
	});
});
