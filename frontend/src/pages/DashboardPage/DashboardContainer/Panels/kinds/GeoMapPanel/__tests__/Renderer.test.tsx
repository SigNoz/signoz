import { type DashboardtypesGeoMapPanelSpecDTO } from 'api/generated/services/sigNoz.schemas';
import { screen } from 'tests/test-utils';

import {
	dataWith,
	lastMapProps,
	loadBody,
	mapProps,
	renderPanel,
} from './renderGeoMapPanel';

describe('GeoMapPanelRenderer', () => {
	beforeAll(loadBody);
	beforeEach(() => mapProps.mockClear());

	it('maps countries with the spec defaults', async () => {
		renderPanel(
			dataWith(
				['geo.country.iso_code'],
				['A'],
				[
					['US', 120],
					['DE', 80],
				],
			),
		);

		await expect(screen.findByTestId('geo-map')).resolves.toBeInTheDocument();
		const props = lastMapProps();
		expect(props.data).toStrictEqual([
			{ code: 'US', value: 120, raw: 'US' },
			{ code: 'DE', value: 80, raw: 'DE' },
		]);
		expect(props.view).toBe('world');
		expect(props.projection).toBe('mercator');
		expect(props.layer).toBe('regions');
		expect(props.colors).toStrictEqual({
			mode: 'palette',
			fill: '',
			palette: 'lava',
			scale: 'log',
			steps: 64,
			min: null,
			max: null,
		});
		expect(props.bubbleRadius).toStrictEqual([3, 28]);
		expect(props.showLabels).toBe(true);
		expect(props.sizeMetric).toBeUndefined();
		expect(props.legendPosition).toBe('bottom');
	});

	it('sizes by a second query and formats each with its column unit', async () => {
		renderPanel(
			dataWith(['geo.country.iso_code'], ['A', 'B'], [['US', 12.5, 3000]]),
			{
				formatting: { columnUnits: { A: 'percent' }, decimalPrecision: '1' },
				map: {
					layer: 'bubbles',
					view: 'world',
					projection: 'equal_earth',
					colorBy: 'A',
					sizeBy: 'B',
				},
				chartAppearance: { labels: false, bubbles: { minRadius: 4 } },
				legend: { position: 'right' },
			} as DashboardtypesGeoMapPanelSpecDTO,
		);

		await screen.findByTestId('geo-map');
		const props = lastMapProps();
		expect(props.projection).toBe('equal_earth');
		expect(props.layer).toBe('bubbles');
		expect(props.data).toStrictEqual([
			{
				code: 'US',
				value: 12.5,
				raw: 'US',
				size: 3000,
				details: [{ label: 'B', value: '3,000' }],
			},
		]);
		expect(props.formatValue(12.5)).toBe('12.5%');
		expect(props.sizeMetric?.label).toBe('B');
		expect(props.sizeMetric?.formatValue(3000)).toBe('3,000');
		expect(props.bubbleRadius).toStrictEqual([4, 28]);
		expect(props.showLabels).toBe(false);
		expect(props.legendPosition).toBe('right');
	});

	it('colors threshold matches and keys them in the legend', async () => {
		renderPanel(
			dataWith(
				['geo.country.iso_code'],
				['A'],
				[
					['US', 120],
					['DE', 80],
				],
			),
			{
				thresholds: [{ value: 100, operator: 'above', color: '#F1575F' }],
			} as DashboardtypesGeoMapPanelSpecDTO,
		);

		await screen.findByTestId('geo-map');
		const props = lastMapProps();
		expect(props.data.map((datum) => datum.color)).toStrictEqual([
			'#F1575F',
			undefined,
		]);
		expect(props.colorKeys).toStrictEqual([{ label: '> 100', color: '#F1575F' }]);
	});

	it('draws lat/lon rows as points', async () => {
		renderPanel(
			dataWith(
				['geo.location.lat', 'geo.location.lon'],
				['A'],
				[[48.86, 2.35, 9]],
			),
		);

		await screen.findByTestId('geo-map');
		const props = lastMapProps();
		expect(props.layer).toBe('points');
		expect(props.points).toHaveLength(1);
		expect(props.bubbleRadius).toStrictEqual([2, 8]);
	});
});
