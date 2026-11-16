import type Feature from 'ol/Feature';
import type { StyleFunction } from 'ol/style/Style';
import type Style from 'ol/style/Style';

import { setup, SetupHandle } from './olLayersSetup';

const labelOf = (handle: SetupHandle, code: string): Feature =>
	handle.layers.labels
		.getSource()
		?.getFeatures()
		.find((feature) => feature.get('code') === code) as Feature;
const styleAt = (
	handle: SetupHandle,
	feature: Feature,
	resolution: number,
): Style | undefined =>
	(handle.layers.labels.getStyle() as StyleFunction)(feature, resolution) as
		| Style
		| undefined;

describe('useOlLayers labels', () => {
	it('names a shape once it is big enough on screen, and hides it before', () => {
		const { handle } = setup();
		const germany = labelOf(handle, 'DE');

		expect(styleAt(handle, germany, 1)?.getText()?.getText()).toBe('Germany');
		expect(styleAt(handle, germany, 1e6)).toBeUndefined();
	});

	it('gives larger shapes first claim when names collide', () => {
		const { handle } = setup();
		const zIndexOf = (code: string): number | undefined =>
			styleAt(handle, labelOf(handle, code), 1)?.getZIndex();

		expect(zIndexOf('FR')).toBeLessThan(zIndexOf('BE') as number);
	});

	it('hides every label when labels are off', () => {
		const { handle } = setup('regions', null, undefined, false);
		expect(handle.layers.labels.getVisible()).toBe(false);
	});
});
