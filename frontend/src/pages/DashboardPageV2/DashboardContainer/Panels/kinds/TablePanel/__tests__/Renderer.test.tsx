import {
	type DashboardtypesTablePanelSpecDTO,
	type QueryRangeV5200,
} from 'api/generated/services/sigNoz.schemas';
import { PanelMode } from 'container/DashboardContainer/visualization/panels/types';
import type { PanelQueryData } from 'pages/DashboardPageV2/DashboardContainer/queryV5/types';
import { render } from 'tests/test-utils';

import type {
	PanelOfKind,
	PanelRendererProps,
} from '../../../types/rendererProps';
import TablePanelRenderer from '../Renderer';

function panelWith(
	spec: DashboardtypesTablePanelSpecDTO,
): PanelOfKind<'signoz/TablePanel'> {
	return {
		kind: 'Panel',
		spec: { plugin: { kind: 'signoz/TablePanel', spec } },
	} as unknown as PanelOfKind<'signoz/TablePanel'>;
}

// V5 scalar response: one joined result with a group column + an aggregation column.
function dataWith(rows: [string, number][]): PanelQueryData {
	return {
		response: {
			status: 'success',
			data: {
				type: 'scalar',
				data: {
					results: [
						{
							queryName: 'A',
							columns: [
								{ name: 'service.name', queryName: 'A', columnType: 'group' },
								{
									name: '__result',
									queryName: 'A',
									columnType: 'aggregation',
									aggregationIndex: 0,
								},
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

const emptyData: PanelQueryData = {
	response: {
		status: 'success',
		data: { type: 'scalar', data: { results: [] } },
	} as unknown as QueryRangeV5200,
	requestPayload: undefined,
	legendMap: {},
};

function renderPanel(
	props: Partial<PanelRendererProps<'signoz/TablePanel'>>,
): ReturnType<typeof render> {
	const baseProps: PanelRendererProps<'signoz/TablePanel'> = {
		panelId: 'panel-1',
		panel: panelWith({}),
		data: emptyData,
		isFetching: false,
		error: null,
		panelMode: PanelMode.DASHBOARD_VIEW,
		...props,
	};
	return render(<TablePanelRenderer {...baseProps} />);
}

describe('TablePanelRenderer', () => {
	it('renders the group column header and its row values', () => {
		const { getByText } = renderPanel({
			data: dataWith([
				['frontend', 1234],
				['cartservice', 5678],
			]),
		});

		expect(getByText('service.name')).toBeInTheDocument();
		expect(getByText('frontend')).toBeInTheDocument();
		expect(getByText('cartservice')).toBeInTheDocument();
	});

	it('renders No Data when the response has no scalar results', () => {
		const { getByTestId } = renderPanel({ data: emptyData });

		expect(getByTestId('panel-no-data')).toBeInTheDocument();
	});

	it('renders No Data when the response is absent', () => {
		const { getByTestId } = renderPanel({
			data: { response: undefined, requestPayload: undefined, legendMap: {} },
		});

		expect(getByTestId('panel-no-data')).toBeInTheDocument();
	});

	it('filters rows to those matching the search term (case-insensitive)', () => {
		const { getByText, queryByText } = renderPanel({
			data: dataWith([
				['frontend', 1234],
				['cartservice', 5678],
			]),
			searchTerm: 'CART',
		});

		expect(getByText('cartservice')).toBeInTheDocument();
		expect(queryByText('frontend')).not.toBeInTheDocument();
	});

	it('keeps the table mounted (not No Data) when the search matches no rows', () => {
		const { getByTestId, queryByText } = renderPanel({
			data: dataWith([['frontend', 1234]]),
			searchTerm: 'no-such-row',
		});

		expect(getByTestId('table-panel-renderer')).toBeInTheDocument();
		expect(queryByText('frontend')).not.toBeInTheDocument();
	});
});
