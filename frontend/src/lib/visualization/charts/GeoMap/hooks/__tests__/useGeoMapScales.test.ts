import { renderHook } from '@testing-library/react';
import {
	ColorRampMode,
	ColorRampPalette,
	ColorRampScale,
} from 'lib/visualization/colorRamp/types';

import { useGeoMapScales } from '../useGeoMapScales';

const COLORS = {
	mode: ColorRampMode.Palette,
	fill: '',
	palette: ColorRampPalette.Lava,
	scale: ColorRampScale.Linear,
	steps: 8,
	min: null,
	max: null,
};

describe('useGeoMapScales', () => {
	it('fills a location with its own color over the palette', () => {
		const data = [
			{ code: 'US', value: 10, raw: 'US', color: '#F1575F' },
			{ code: 'DE', value: 1, raw: 'DE' },
		];
		const { result } = renderHook(() =>
			useGeoMapScales(data, COLORS, [3, 28], false),
		);

		expect(result.current.fillFor('US')).toBe('#F1575F');
		expect(result.current.fillFor('DE')).toBe(
			result.current.resolver.colorFor(1),
		);
		expect(result.current.fillFor('FR')).toBeNull();
	});
});
