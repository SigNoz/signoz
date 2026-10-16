import CircleStyle from 'ol/style/Circle';

import { createStyleCache, readPalette } from '../olStyles';

const PALETTE = {
	noData: '#333333',
	context: '#222222',
	border: '#000000',
	outline: '#ffffff',
	bubbleStroke: '#111111',
};

describe('readPalette', () => {
	it('resolves the theme’s colours from CSS variables', () => {
		const element = document.createElement('div');
		element.style.setProperty('--geo-no-data', '#333333');
		element.style.setProperty('--l1-foreground', '#ffffff');
		document.body.appendChild(element);

		expect(readPalette(element)).toMatchObject({
			noData: '#333333',
			outline: '#ffffff',
		});
	});
});

describe('createStyleCache', () => {
	it('reuses one style per fill', () => {
		const cache = createStyleCache();
		expect(cache.shape('#ff0000', PALETTE)).toBe(cache.shape('#ff0000', PALETTE));
		expect(cache.shape('#ff0000', PALETTE)).not.toBe(
			cache.shape('#00ff00', PALETTE),
		);
	});

	it('draws bubbles at their radius, larger ones underneath', () => {
		const style = createStyleCache().bubble('#ff0000', 12, PALETTE);
		const circle = style.getImage() as CircleStyle;

		expect(circle.getRadius()).toBe(12);
		expect(circle.getFill()?.getColor()).toStrictEqual([255, 0, 0, 0.8]);
		expect(style.getZIndex()).toBe(-12);
	});
});
