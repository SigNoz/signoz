import { getSnakeColors } from '../dotGridTheme';

function canvasWithInk(ink: string): HTMLCanvasElement {
	const canvas = document.createElement('canvas');
	canvas.style.color = ink;
	document.body.appendChild(canvas);
	return canvas;
}

describe('getSnakeColors', () => {
	afterEach(() => {
		document.body.innerHTML = '';
	});

	it('keeps the snake white on the dark page', () => {
		expect(getSnakeColors(canvasWithInk('rgb(30, 31, 36)'), true)).toStrictEqual({
			head: 'rgba(255,255,255,1)',
			body: 'rgba(232,238,245,0.92)',
			food: 'rgba(255,255,255,0.97)',
		});
	});

	it('draws the snake in the page ink on the light page', () => {
		expect(getSnakeColors(canvasWithInk('rgb(30, 31, 36)'), false)).toStrictEqual(
			{
				head: 'rgba(30,31,36,1)',
				body: 'rgba(30,31,36,0.85)',
				food: 'rgba(30,31,36,0.95)',
			},
		);
	});
});
