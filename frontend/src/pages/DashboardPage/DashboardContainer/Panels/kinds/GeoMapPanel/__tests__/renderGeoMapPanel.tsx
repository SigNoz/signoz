import type {
	DashboardtypesGeoMapPanelSpecDTO,
	DashboardtypesPanelDTO,
	QueryRangeV5200,
} from 'api/generated/services/sigNoz.schemas';
import type { GeoMapProps } from 'lib/visualization/charts/GeoMap/types';
import { PanelMode } from 'lib/visualization/panels/types';
import type { PanelQueryData } from 'pages/DashboardPage/DashboardContainer/queryV5/types';
import { render } from 'tests/test-utils';

import type { DrilldownClickPayload } from '../../../types/drilldown';
import type { BaseRendererProps } from '../../../types/rendererProps';
import BaseGeoMapPanelRenderer from '../Renderer';

export const GeoMapPanelRenderer = BaseGeoMapPanelRenderer as React.FC<
	BaseRendererProps & { onClick?: (payload: DrilldownClickPayload) => void }
>;

export const mapProps = jest.fn() as jest.MockedFunction<
	(props: GeoMapProps) => void
>;

jest.mock('lib/visualization/charts/GeoMap/GeoMap', () => ({
	__esModule: true,
	default: (props: GeoMapProps): JSX.Element => {
		mapProps(props);
		return <div data-testid="geo-map" />;
	},
}));

export function panelWith(
	spec: DashboardtypesGeoMapPanelSpecDTO,
): DashboardtypesPanelDTO {
	return {
		kind: 'Panel',
		spec: { plugin: { kind: 'signoz/GeoMapPanel', spec } },
	} as unknown as DashboardtypesPanelDTO;
}

/** A joined scalar result: the given group columns plus one value column per query. */
export function dataWith(
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

export function renderPanel(
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

export function lastMapProps(): GeoMapProps {
	return mapProps.mock.calls[mapProps.mock.calls.length - 1][0];
}

/** Loads the lazy body up front so a slow first import can't outlast findBy's timeout. */
export const loadBody = (): Promise<unknown> =>
	import('../components/GeoMapPanelBody/GeoMapPanelBody');
