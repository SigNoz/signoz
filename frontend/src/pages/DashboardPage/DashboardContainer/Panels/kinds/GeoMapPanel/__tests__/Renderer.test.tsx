import type {
	DashboardtypesGeoMapPanelSpecDTO,
	DashboardtypesPanelDTO,
	QueryRangeV5200,
} from 'api/generated/services/sigNoz.schemas';
import type { GeoMapProps } from 'lib/visualization/charts/GeoMap/types';
import { PanelMode } from 'lib/visualization/panels/types';
import type { PanelQueryData } from 'pages/DashboardPage/DashboardContainer/queryV5/types';
import { render, screen } from 'tests/test-utils';

import type { DrilldownClickPayload } from '../../../types/drilldown';
import type { BaseRendererProps } from '../../../types/rendererProps';
import BaseGeoMapPanelRenderer from '../Renderer';

const GeoMapPanelRenderer = BaseGeoMapPanelRenderer as React.FC<
	BaseRendererProps & { onClick?: (payload: DrilldownClickPayload) => void }
>;

const mapProps = jest.fn();

jest.mock('lib/visualization/charts/GeoMap/GeoMap', () => ({
	__esModule: true,
	default: (props: GeoMapProps): JSX.Element => {
		mapProps(props);
		return <div data-testid="geo-map" />;
	},
}));

function panelWith(
	spec: DashboardtypesGeoMapPanelSpecDTO,
): DashboardtypesPanelDTO {
	return {
		kind: 'Panel',
		spec: { plugin: { kind: 'signoz/GeoMapPanel', spec } },
	} as unknown as DashboardtypesPanelDTO;
}

/** A joined scalar result: the given group columns plus one value column per query. */
function dataWith(
	groups: string[],
	queryNames: string[],
	rows: unknown[][],
): PanelQueryData {
	return {
		response: {
			status: 'success',
			data: {
				type: 'scalar',
				data: {
					results: [
						{
							queryName: queryNames[0],
							columns: [
								...groups.map((name) => ({
									name,
									queryName: '',
									columnType: 'group',
								})),
								...queryNames.map((queryName) => ({
									name: '__result_0',
									queryName,
									columnType: 'aggregation',
									aggregationIndex: 0,
								})),
							],
							data: rows,
						},
					],
				},
			},
		} as unknown as QueryRangeV5200,
		requestPayload: undefined,
		legendMap: {},
	};
}

function renderPanel(
	data: PanelQueryData,
	spec: DashboardtypesGeoMapPanelSpecDTO = {},
): ReturnType<typeof render> {
	return render(
		<GeoMapPanelRenderer
			panelId="panel-1"
			panel={panelWith(spec)}
			data={data}
			isFetching={false}
			error={null}
			panelMode={PanelMode.DASHBOARD_VIEW}
		/>,
	);
}

function lastMapProps(): GeoMapProps {
	return mapProps.mock.calls[mapProps.mock.calls.length - 1][0];
}

describe('GeoMapPanelRenderer', () => {
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
				map: { layer: 'bubbles', colorBy: 'A', sizeBy: 'B' },
				chartAppearance: { labels: false, bubbles: { minRadius: 4 } },
				legend: { position: 'right' },
			} as DashboardtypesGeoMapPanelSpecDTO,
		);

		await screen.findByTestId('geo-map');
		const props = lastMapProps();
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

	it('drills down into the clicked location', async () => {
		const onClick = jest.fn();
		const data = dataWith(
			['geo.country.iso_code'],
			['A'],
			[
				['US', 120],
				['DE', 80],
			],
		);
		render(
			<GeoMapPanelRenderer
				panelId="panel-1"
				panel={
					{
						kind: 'Panel',
						spec: {
							plugin: { kind: 'signoz/GeoMapPanel', spec: {} },
							queries: [
								{
									kind: 'scalar',
									spec: {
										plugin: {
											kind: 'signoz/BuilderQuery',
											spec: {
												name: 'A',
												signal: 'logs',
												groupBy: [{ name: 'geo.country.iso_code' }],
											},
										},
									},
								},
							],
						},
					} as unknown as DashboardtypesPanelDTO
				}
				data={data}
				isFetching={false}
				error={null}
				panelMode={PanelMode.DASHBOARD_VIEW}
				enableDrillDown
				onClick={onClick}
			/>,
		);

		await screen.findByTestId('geo-map');
		const props = lastMapProps();
		expect(props.renderTooltipFooter).toBeDefined();
		props.onSelect?.({
			datum: props.data[1],
			clientX: 5,
			clientY: 6,
		});

		expect(onClick).toHaveBeenCalledWith(
			expect.objectContaining({
				coordinates: { x: 5, y: 6 },
				context: expect.objectContaining({
					queryName: 'A',
					label: 'DE',
					filters: [
						{ filterKey: 'geo.country.iso_code', filterValue: 'DE', operator: '=' },
					],
				}),
			}),
		);
	});

	it('leaves clicks alone without drilldown', async () => {
		renderPanel(dataWith(['geo.country.iso_code'], ['A'], [['US', 1]]));

		await screen.findByTestId('geo-map');
		expect(lastMapProps().onSelect).toBeUndefined();
		expect(lastMapProps().renderTooltipFooter).toBeUndefined();
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

	it('asks for a location group by', async () => {
		renderPanel(dataWith([], ['A'], [[5]]));

		await expect(
			screen.findByText('Group by a location'),
		).resolves.toBeInTheDocument();
		expect(mapProps).not.toHaveBeenCalled();
	});

	it('shows the plain empty state when the query returns nothing', async () => {
		renderPanel(dataWith(['geo.country.iso_code'], ['A'], []));

		await expect(
			screen.findByTestId('panel-no-data'),
		).resolves.toBeInTheDocument();
	});
});
