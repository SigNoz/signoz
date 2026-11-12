import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import { PanelMode } from 'lib/visualization/panels/types';
import type { PanelQueryData } from 'pages/DashboardPage/DashboardContainer/queryV5/types';
import { render, screen } from 'tests/test-utils';

import type { DrilldownClickPayload } from '../../../types/drilldown';
import {
	dataWith,
	GeoMapPanelRenderer,
	lastMapProps,
	loadBody,
	mapProps,
	renderPanel,
} from './renderGeoMapPanel';

function renderWithDrilldown(
	data: PanelQueryData,
	groupBy: string[],
): jest.MockedFunction<(payload: DrilldownClickPayload) => void> {
	const onClick = jest.fn() as jest.MockedFunction<
		(payload: DrilldownClickPayload) => void
	>;
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
											groupBy: groupBy.map((name) => ({ name })),
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
	return onClick;
}

describe('GeoMapPanelRenderer drilldown', () => {
	beforeAll(loadBody);
	beforeEach(() => mapProps.mockClear());

	it('drills down into the clicked location', async () => {
		const onClick = renderWithDrilldown(
			dataWith(
				['geo.country.iso_code'],
				['A'],
				[
					['US', 120],
					['DE', 80],
				],
			),
			['geo.country.iso_code'],
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

	it('filters on group values exactly as the query returned them', async () => {
		const onClick = renderWithDrilldown(
			dataWith(
				['geo.country.iso_code', 'service.name'],
				['A'],
				[['DE', 'cart ', 80]],
			),
			['geo.country.iso_code', 'service.name'],
		);

		await screen.findByTestId('geo-map');
		const props = lastMapProps();
		props.onSelect?.({ datum: props.data[0], clientX: 0, clientY: 0 });

		expect(onClick).toHaveBeenCalledWith(
			expect.objectContaining({
				context: expect.objectContaining({
					filters: expect.arrayContaining([
						{ filterKey: 'service.name', filterValue: 'cart ', operator: '=' },
					]),
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
});
