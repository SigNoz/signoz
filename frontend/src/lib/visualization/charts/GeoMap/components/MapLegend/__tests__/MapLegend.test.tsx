import { render, screen } from 'tests/test-utils';
import {
	createColorRampResolver,
	DEFAULT_COLOR_RAMP_OPTIONS,
	resolveColorDomain,
} from 'lib/visualization/colorRamp/colorScale';
import { ColorRampScale } from 'lib/visualization/colorRamp/types';

import MapLegend from '../MapLegend';

function renderLegend(values: number[]): void {
	const options = { ...DEFAULT_COLOR_RAMP_OPTIONS, scale: ColorRampScale.Log };
	render(
		<MapLegend
			resolver={createColorRampResolver({
				options,
				domain: resolveColorDomain(options, [values]),
				isDarkMode: true,
				seriesColor: '',
			})}
			scale={ColorRampScale.Log}
			formatValue={String}
			markerValue={null}
		/>,
	);
}

describe('MapLegend', () => {
	it('starts a log colour bar at its floor', () => {
		renderLegend([0, 10, 1000]);

		expect(screen.getByText('10')).toBeInTheDocument();
		expect(screen.getByText('1000')).toBeInTheDocument();
	});

	it('starts a log colour bar with no span above its floor at the minimum', () => {
		renderLegend([0, 10]);

		expect(screen.getByText('0')).toBeInTheDocument();
		expect(screen.getByText('10')).toBeInTheDocument();
	});
});
