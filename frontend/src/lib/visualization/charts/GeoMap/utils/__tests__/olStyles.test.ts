import CircleStyle from 'ol/style/Circle';

import { createStyleCache, readPalette, withAlpha } from '../olStyles';

const PALETTE = {
	noData: '#333333',
	context: '#222222',
	border: '#000000',
	outline: '#ffffff',
	bubbleStroke: '#111111',
};

describe('withAlpha', () => {
	it('sets the alpha of an opaque colour', () => {
		expect(withAlpha('#ff0000', 0.8)).toStrictEqual([255, 0, 0, 0.8]);
	});

	it('scales an existing alpha, so opacity-mode fills stay distinct', () => {
		const [, , , alpha] = withAlpha('rgba(255, 0, 0, 0.5)', 0.8);
		expect(alpha).toBeCloseTo(0.4, 6);
	});
});

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
		const cache = createStyleCache(PALETTE);
		expect(cache.shape('#ff0000')).toBe(cache.shape('#ff0000'));
		expect(cache.shape('#ff0000')).not.toBe(cache.shape('#00ff00'));
	});

	it('draws bubbles at their radius, larger ones underneath', () => {
		const style = createStyleCache(PALETTE).bubble('#ff0000', 12);
		const circle = style.getImage() as CircleStyle;

		expect(circle.getRadius()).toBe(12);
		expect(circle.getFill()?.getColor()).toStrictEqual([255, 0, 0, 0.8]);
		expect(style.getZIndex()).toBe(-12);
	});
});
