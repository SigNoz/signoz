import {
	DashboardtypesComparisonOperatorDTO,
	DashboardtypesThresholdFormatDTO,
	type DashboardtypesTopListPanelSpecDTO,
	type QueryRangeV5200,
} from 'api/generated/services/sigNoz.schemas';
import { PanelMode } from 'lib/visualization/panels/types';
import type { PanelQueryData } from 'pages/DashboardPage/DashboardContainer/queryV5/types';
import { fireEvent, render, screen } from 'tests/test-utils';

import type {
	PanelOfKind,
	PanelRendererProps,
} from '../../../types/rendererProps';
import TopListPanelRenderer from '../Renderer';
import { mockListLayout } from './mockListLayout';

function panelWith(
	spec: DashboardtypesTopListPanelSpecDTO,
): PanelOfKind<'signoz/TopListPanel'> {
	return {
		kind: 'Panel',
		spec: { plugin: { kind: 'signoz/TopListPanel', spec }, queries: [] },
	} as unknown as PanelOfKind<'signoz/TopListPanel'>;
}

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

const SERVICES: [string, number][] = [
	['checkout', 50],
	['payment', 100],
	['auth', 25],
];

function renderPanel(
	props: Partial<PanelRendererProps<'signoz/TopListPanel'>>,
): ReturnType<typeof render> {
	return render(
		<TopListPanelRenderer
			panelId="panel-1"
			panel={panelWith({})}
			data={dataWith(SERVICES)}
			isFetching={false}
			error={null}
			panelMode={PanelMode.DASHBOARD_VIEW}
			{...props}
		/>,
	);
}

const rowLabels = (): string[] =>
	screen
		.getAllByTestId('top-list-row')
		.map((row) => row.getAttribute('aria-label') ?? '');

mockListLayout();

describe('TopListPanelRenderer', () => {
	it('ranks rows by value with bars relative to the largest value', () => {
		renderPanel({});

		expect(rowLabels()).toStrictEqual([
			'payment: 100',
			'checkout: 50',
			'auth: 25',
		]);
		expect(
			screen.getAllByTestId('top-list-row-fill').map((fill) => fill.style.width),
		).toStrictEqual(['100%', '50%', '25%']);
	});

	it('formats values with the panel unit', () => {
		renderPanel({ panel: panelWith({ formatting: { unit: 'ms' } }) });

		expect(screen.getAllByTestId('top-list-row-value')[0]).toHaveTextContent(
			'100 ms',
		);
	});

	it('recolours the bar for a background threshold and the value for a text threshold', () => {
		renderPanel({
			panel: panelWith({
				thresholds: [
					{
						color: '#F1575F',
						operator: DashboardtypesComparisonOperatorDTO.above,
						value: 90,
						format: DashboardtypesThresholdFormatDTO.background,
					},
					{
						color: '#F5B225',
						operator: DashboardtypesComparisonOperatorDTO.above,
						value: 40,
						format: DashboardtypesThresholdFormatDTO.text,
					},
				],
			}),
		});

		const [paymentFill, checkoutFill] =
			screen.getAllByTestId('top-list-row-fill');
		const [paymentValue, checkoutValue] =
			screen.getAllByTestId('top-list-row-value');
		expect(paymentFill.style.getPropertyValue('--fill-color')).toBe('#F1575F');
		expect(paymentValue.style.color).toBe('');
		expect(checkoutValue).toHaveStyle({ color: '#F5B225' });
		expect(checkoutFill.style.getPropertyValue('--fill-color')).toBe('');
	});

	it('opens the drilldown with the clicked row', () => {
		const onClick = jest.fn();
		renderPanel({ onClick, enableDrillDown: true });

		fireEvent.click(screen.getAllByTestId('top-list-row')[1], {
			detail: 1,
			clientX: 10,
			clientY: 20,
		});

		expect(onClick).toHaveBeenCalledTimes(1);
		expect(onClick.mock.calls[0][0]).toMatchObject({
			coordinates: { x: 10, y: 20 },
			context: { queryName: 'A', label: 'checkout' },
		});
	});

	it('anchors the drilldown under the row when opened from the keyboard', () => {
		const onClick = jest.fn();
		renderPanel({ onClick, enableDrillDown: true });
		const row = screen.getAllByTestId('top-list-row')[0];
		jest
			.spyOn(row, 'getBoundingClientRect')
			.mockReturnValue({ left: 30, bottom: 60 } as DOMRect);

		fireEvent.click(row, { detail: 0 });

		expect(onClick.mock.calls[0][0]).toMatchObject({
			coordinates: { x: 30, y: 60 },
			context: { label: 'payment' },
		});
	});

	it('does not drill down when drilldown is disabled', () => {
		const onClick = jest.fn();
		renderPanel({ onClick });

		fireEvent.click(screen.getAllByTestId('top-list-row')[0]);

		expect(onClick).not.toHaveBeenCalled();
	});

	it('moves focus between rows with the arrow keys', () => {
		renderPanel({});
		const rows = screen.getAllByTestId('top-list-row');
		rows[0].focus();

		fireEvent.keyDown(rows[0], { key: 'ArrowDown' });
		expect(rows[1]).toHaveFocus();

		fireEvent.keyDown(rows[1], { key: 'ArrowUp' });
		expect(rows[0]).toHaveFocus();
	});

	it('renders No Data when the query returns no rows', () => {
		renderPanel({ data: dataWith([]) });

		expect(screen.getByTestId('panel-no-data')).toBeInTheDocument();
		expect(screen.queryByTestId('top-list')).not.toBeInTheDocument();
	});
});
