/* eslint-disable radix */
/* eslint-disable guard-for-in */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-var */
/* eslint-disable vars-on-top */
/* eslint-disable func-style */
/* eslint-disable no-void */
/* eslint-disable sonarjs/cognitive-complexity */
/* eslint-disable func-names */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable no-param-reassign */
/* eslint-disable no-sequences */
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck

// https://tobyzerner.github.io/placement.js/dist/index.js

/**
 * Positions an element (tooltip/popover) relative to a reference element.
 * Automatically flips to the opposite side if there's insufficient space.
 *
 * @param element - The HTMLElement to position
 * @param reference - Reference element/Range or bounding rect
 * @param side - Preferred side: 'top', 'bottom', 'left', 'right' (default: 'bottom')
 * @param align - Alignment: 'start', 'center', 'end' (default: 'center')
 * @param options - Optional bounds for constraining the element
 *   - bound: Custom boundary rect/element
 *   - followCursor: { x, y } - If provided, tooltip follows cursor with smart positioning
 */
export const placement = (function () {
	const AXIS_PROPS = {
		size: ['height', 'width'],
		clientSize: ['clientHeight', 'clientWidth'],
		offsetSize: ['offsetHeight', 'offsetWidth'],
		maxSize: ['maxHeight', 'maxWidth'],
		before: ['top', 'left'],
		marginBefore: ['marginTop', 'marginLeft'],
		after: ['bottom', 'right'],
		marginAfter: ['marginBottom', 'marginRight'],
		scrollOffset: ['pageYOffset', 'pageXOffset'],
	};

	function extractRect(source) {
		return {
			top: source.top,
			bottom: source.bottom,
			left: source.left,
			right: source.right,
		};
	}

	return function (element, reference, side, align, options) {
		// Default parameters
		void 0 === side && (side = 'bottom');
		void 0 === align && (align = 'center');
		void 0 === options && (options = {});

		// Handle cursor following mode
		if (options.followCursor) {
			const cursorX = options.followCursor.x;
			const cursorY = options.followCursor.y;
			const offset = options.followCursor.offset || 10; // Default 10px offset from cursor

			element.style.position = 'absolute';
			element.style.maxWidth = '';
			element.style.maxHeight = '';

			const elementWidth = element.offsetWidth;
			const elementHeight = element.offsetHeight;

			// Use viewport bounds for cursor following (not chart bounds)
			const viewportBounds = {
				top: 0,
				left: 0,
				bottom: window.innerHeight,
				right: window.innerWidth,
			};

			// Vertical positioning: follow cursor Y with offset, clamped to viewport
			const topPosition = cursorY + offset;
			const clampedTop = Math.max(
				viewportBounds.top,
				Math.min(topPosition, viewportBounds.bottom - elementHeight),
			);
			element.style.top = `${clampedTop}px`;
			element.style.bottom = 'auto';

			// Horizontal positioning: auto-detect left or right based on available space
			const spaceOnRight = viewportBounds.right - cursorX;
			const spaceOnLeft = cursorX - viewportBounds.left;

			if (spaceOnRight >= elementWidth + offset) {
				// Enough space on the right
				element.style.left = `${cursorX + offset}px`;
				element.style.right = 'auto';
				element.dataset.side = 'right';
			} else if (spaceOnLeft >= elementWidth + offset) {
				// Not enough space on right, use left
				element.style.left = `${cursorX - elementWidth - offset}px`;
				element.style.right = 'auto';
				element.dataset.side = 'left';
			} else if (spaceOnRight > spaceOnLeft) {
				// Not enough space on either side, pick the side with more space
				const leftPos = cursorX + offset;
				const clampedLeft = Math.max(
					viewportBounds.left,
					Math.min(leftPos, viewportBounds.right - elementWidth),
				);
				element.style.left = `${clampedLeft}px`;
				element.style.right = 'auto';
				element.dataset.side = 'right';
			} else {
				const leftPos = cursorX - elementWidth - offset;
				const clampedLeft = Math.max(
					viewportBounds.left,
					Math.min(leftPos, viewportBounds.right - elementWidth),
				);
				element.style.left = `${clampedLeft}px`;
				element.style.right = 'auto';
				element.dataset.side = 'left';
			}

			element.dataset.align = 'cursor';
			return; // Exit early, don't run normal positioning logic
		}

		// Normalize reference to rect object
		(reference instanceof Element || reference instanceof Range) &&
			(reference = extractRect(reference.getBoundingClientRect()));

		// Create anchor rect with swapped opposite edges for positioning
		const anchorRect = {
			top: reference.bottom,
			bottom: reference.top,
			left: reference.right,
			right: reference.left,
			...reference,
		};

		// Viewport bounds (can be overridden via options.bound)
		const bounds = {
			top: 0,
			left: 0,
			bottom: window.innerHeight,
			right: window.innerWidth,
		};

		options.bound &&
			((options.bound instanceof Element || options.bound instanceof Range) &&
				(options.bound = extractRect(options.bound.getBoundingClientRect())),
			Object.assign(bounds, options.bound));

		const styles = getComputedStyle(element);
		const isVertical = side === 'top' || side === 'bottom';

		// Build axis property maps based on orientation
		const mainAxis = {}; // Properties for the main positioning axis
		const crossAxis = {}; // Properties for the perpendicular axis

		for (const prop in AXIS_PROPS) {
			mainAxis[prop] = AXIS_PROPS[prop][isVertical ? 0 : 1];
			crossAxis[prop] = AXIS_PROPS[prop][isVertical ? 1 : 0];
		}

		// Reset element positioning
		element.style.position = 'absolute';
		element.style.maxWidth = '';
		element.style.maxHeight = '';

		// Cross-axis: calculate and apply max size constraint
		const crossMarginBefore = parseInt(styles[crossAxis.marginBefore]);
		const crossMarginAfter = parseInt(styles[crossAxis.marginAfter]);
		const crossMarginTotal = crossMarginBefore + crossMarginAfter;
		const crossAvailableSpace =
			bounds[crossAxis.after] - bounds[crossAxis.before] - crossMarginTotal;
		const crossMaxSize = parseInt(styles[crossAxis.maxSize]);

		(!crossMaxSize || crossAvailableSpace < crossMaxSize) &&
			(element.style[crossAxis.maxSize] = `${crossAvailableSpace}px`);

		// Main-axis: calculate space on both sides
		const mainMarginTotal =
			parseInt(styles[mainAxis.marginBefore]) +
			parseInt(styles[mainAxis.marginAfter]);
		const spaceBefore =
			anchorRect[mainAxis.before] - bounds[mainAxis.before] - mainMarginTotal;
		const spaceAfter =
			bounds[mainAxis.after] - anchorRect[mainAxis.after] - mainMarginTotal;

		// Auto-flip to the side with more space if needed
		((side === mainAxis.before && element[mainAxis.offsetSize] > spaceBefore) ||
			(side === mainAxis.after && element[mainAxis.offsetSize] > spaceAfter)) &&
			(side = spaceBefore > spaceAfter ? mainAxis.before : mainAxis.after);

		// Apply main-axis max size constraint
		const mainAvailableSpace =
			side === mainAxis.before ? spaceBefore : spaceAfter;
		const mainMaxSize = parseInt(styles[mainAxis.maxSize]);

		(!mainMaxSize || mainAvailableSpace < mainMaxSize) &&
			(element.style[mainAxis.maxSize] = `${mainAvailableSpace}px`);

		// Position on main axis
		const mainScrollOffset = window[mainAxis.scrollOffset];
		const clampMainPosition = function (pos) {
			return Math.max(
				bounds[mainAxis.before],
				Math.min(
					pos,
					bounds[mainAxis.after] - element[mainAxis.offsetSize] - mainMarginTotal,
				),
			);
		};

		side === mainAxis.before
			? ((element.style[mainAxis.before] = `${
					mainScrollOffset +
					clampMainPosition(
						anchorRect[mainAxis.before] -
							element[mainAxis.offsetSize] -
							mainMarginTotal,
					)
			  }px`),
			  (element.style[mainAxis.after] = 'auto'))
			: ((element.style[mainAxis.before] = `${
					mainScrollOffset + clampMainPosition(anchorRect[mainAxis.after])
			  }px`),
			  (element.style[mainAxis.after] = 'auto'));

		// Position on cross axis based on alignment
		const crossScrollOffset = window[crossAxis.scrollOffset];
		const clampCrossPosition = function (pos) {
			return Math.max(
				bounds[crossAxis.before],
				Math.min(
					pos,
					bounds[crossAxis.after] - element[crossAxis.offsetSize] - crossMarginTotal,
				),
			);
		};

		switch (align) {
			case 'start':
				(element.style[crossAxis.before] = `${
					crossScrollOffset +
					clampCrossPosition(anchorRect[crossAxis.before] - crossMarginBefore)
				}px`),
					(element.style[crossAxis.after] = 'auto');
				break;
			case 'end':
				(element.style[crossAxis.before] = 'auto'),
					(element.style[crossAxis.after] = `${
						crossScrollOffset +
						clampCrossPosition(
							document.documentElement[crossAxis.clientSize] -
								anchorRect[crossAxis.after] -
								crossMarginAfter,
						)
					}px`);
				break;
			default:
				// 'center'
				var crossSize = anchorRect[crossAxis.after] - anchorRect[crossAxis.before];
				(element.style[crossAxis.before] = `${
					crossScrollOffset +
					clampCrossPosition(
						anchorRect[crossAxis.before] +
							crossSize / 2 -
							element[crossAxis.offsetSize] / 2 -
							crossMarginBefore,
					)
				}px`),
					(element.style[crossAxis.after] = 'auto');
		}

		// Store final placement as data attributes
		(element.dataset.side = side), (element.dataset.align = align);
	};
})();
