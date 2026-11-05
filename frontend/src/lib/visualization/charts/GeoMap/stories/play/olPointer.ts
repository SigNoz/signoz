import { expect, screen, waitFor } from 'storybook/test';

const nextFrame = (): Promise<void> =>
	new Promise((resolve) => {
		requestAnimationFrame(() => resolve());
	});

function viewportOf(canvasElement: HTMLElement): HTMLElement {
	const viewport = canvasElement.querySelector<HTMLElement>('.ol-viewport');
	if (!viewport) {
		throw new Error('the map has not mounted');
	}
	return viewport;
}

function dispatch(
	target: EventTarget,
	type: 'pointermove' | 'pointerdown' | 'pointerup',
	clientX: number,
	clientY: number,
): void {
	target.dispatchEvent(
		new PointerEvent(type, {
			clientX,
			clientY,
			bubbles: true,
			cancelable: true,
			pointerId: 1,
			pointerType: 'mouse',
			isPrimary: true,
			button: 0,
			buttons: type === 'pointerup' ? 0 : 1,
		}),
	);
}

/**
 * Moves the pointer across the map until a tooltip opens, and returns where.
 * The map is a canvas, so there is no element to hover by test id. Each move
 * waits a frame for React to render; this must not run inside `waitFor`, whose
 * callback re-runs on every DOM change the moves themselves cause.
 */
export async function hoverUntilTooltip(
	canvasElement: HTMLElement,
): Promise<[number, number]> {
	await waitFor(() =>
		expect(canvasElement.querySelector('.ol-viewport canvas')).not.toBeNull(),
	);
	const viewport = viewportOf(canvasElement);
	const rect = viewport.getBoundingClientRect();
	for (let y = 0.25; y <= 0.75; y += 0.05) {
		for (let x = 0.15; x <= 0.85; x += 0.025) {
			const point: [number, number] = [
				rect.left + rect.width * x,
				rect.top + rect.height * y,
			];
			dispatch(viewport, 'pointermove', ...point);
			await nextFrame();
			if (screen.queryByTestId('geo-map-tooltip')) {
				return point;
			}
		}
	}
	throw new Error('no shape with data under the pointer');
}

/**
 * A press and release without movement, which OpenLayers reports as a click,
 * then the DOM click a browser sends after it.
 */
export function clickAt(
	canvasElement: HTMLElement,
	[x, y]: [number, number],
): void {
	const viewport = viewportOf(canvasElement);
	dispatch(viewport, 'pointerdown', x, y);
	dispatch(document, 'pointerup', x, y);
	viewport.dispatchEvent(
		new MouseEvent('click', { clientX: x, clientY: y, bubbles: true }),
	);
}
