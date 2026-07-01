import {
	type DashboardtypesListPanelSpecDTO,
	type QueryRangeV5200,
} from 'api/generated/services/sigNoz.schemas';
import { PanelMode } from 'container/DashboardContainer/visualization/panels/types';
import type {
	PanelPagination,
	PanelQueryData,
} from 'pages/DashboardPageV2/DashboardContainer/queryV5/types';
import { fireEvent, render } from 'tests/test-utils';

import type {
	PanelOfKind,
	PanelRendererProps,
} from '../../../types/rendererProps';
import ListPanelRenderer from '../Renderer';

function panelWith(
	spec: DashboardtypesListPanelSpecDTO,
): PanelOfKind<'signoz/ListPanel'> {
	return {
		kind: 'Panel',
		spec: { plugin: { kind: 'signoz/ListPanel', spec }, queries: [] },
	} as unknown as PanelOfKind<'signoz/ListPanel'>;
}

// V5 raw response: one result carrying flattened log rows.
function dataWith(
	rows: { timestamp?: string; data: Record<string, unknown> }[],
): PanelQueryData {
	return {
		response: {
			status: 'success',
			data: {
				type: 'raw',
				data: { results: [{ queryName: 'A', rows }] },
			},
		} as unknown as QueryRangeV5200,
		requestPayload: undefined,
		legendMap: {},
	};
}

const emptyData: PanelQueryData = {
	response: {
		status: 'success',
		data: { type: 'raw', data: { results: [] } },
	} as unknown as QueryRangeV5200,
	requestPayload: undefined,
	legendMap: {},
};

function renderPanel(
	props: Partial<PanelRendererProps<'signoz/ListPanel'>>,
): ReturnType<typeof render> {
	const baseProps: PanelRendererProps<'signoz/ListPanel'> = {
		panelId: 'panel-1',
		panel: panelWith({}),
		data: emptyData,
		isFetching: false,
		error: null,
		panelMode: PanelMode.DASHBOARD_VIEW,
		...props,
	};
	return render(<ListPanelRenderer {...baseProps} />);
}

describe('ListPanelRenderer', () => {
	it('renders derived columns and row values', () => {
		const { getByText } = renderPanel({
			data: dataWith([
				{
					timestamp: '2026-01-01T00:00:00Z',
					data: { body: 'request ok', level: 'info' },
				},
				{
					timestamp: '2026-01-01T00:00:01Z',
					data: { body: 'boom', level: 'error' },
				},
			]),
		});

		expect(getByText('body')).toBeInTheDocument();
		expect(getByText('level')).toBeInTheDocument();
		expect(getByText('request ok')).toBeInTheDocument();
		expect(getByText('boom')).toBeInTheDocument();
	});

	it('filters rows by the header search term (case-insensitive)', () => {
		const { getByText, queryByText } = renderPanel({
			data: dataWith([
				{ data: { body: 'request ok', level: 'info' } },
				{ data: { body: 'boom', level: 'error' } },
			]),
			searchTerm: 'ERROR',
		});

		expect(getByText('boom')).toBeInTheDocument();
		expect(queryByText('request ok')).not.toBeInTheDocument();
	});

	it('renders No Data when the raw response has no rows', () => {
		const { getByTestId } = renderPanel({ data: emptyData });

		expect(getByTestId('panel-no-data')).toBeInTheDocument();
	});

	it('renders No Data when the response is absent', () => {
		const { getByTestId } = renderPanel({
			data: { response: undefined, requestPayload: undefined, legendMap: {} },
		});

		expect(getByTestId('panel-no-data')).toBeInTheDocument();
	});

	const makePagination = (
		overrides: Partial<PanelPagination> = {},
	): PanelPagination => ({
		pageIndex: 0,
		canPrev: false,
		canNext: false,
		goPrev: jest.fn(),
		goNext: jest.fn(),
		pageSize: 10,
		pageSizeOptions: [10, 25, 50],
		setPageSize: jest.fn(),
		...overrides,
	});

	it('shows the pager and calls goNext when Next is clicked', () => {
		const goNext = jest.fn();
		const { getByTestId } = renderPanel({
			data: dataWith([{ data: { body: 'x' } }]),
			pagination: makePagination({
				pageIndex: 1,
				canPrev: true,
				canNext: true,
				goNext,
			}),
		});

		expect(getByTestId('list-panel-page')).toHaveTextContent('Page 2');
		fireEvent.click(getByTestId('list-panel-next'));
		expect(goNext).toHaveBeenCalled();
	});

	it('renders the pager (with the page-size picker) even on a single page', () => {
		const { getByTestId } = renderPanel({
			data: dataWith([{ data: { body: 'x' } }]),
			pagination: makePagination(),
		});

		expect(getByTestId('list-panel-pager')).toBeInTheDocument();
		expect(getByTestId('list-panel-page-size')).toBeInTheDocument();
	});

	it('does not render the pager when the panel is not server-paged', () => {
		const { queryByTestId } = renderPanel({
			data: dataWith([{ data: { body: 'x' } }]),
			pagination: undefined,
		});

		expect(queryByTestId('list-panel-pager')).not.toBeInTheDocument();
	});
});
