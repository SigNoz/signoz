import { useState } from 'react';
import type {
	DashboardtypesPanelDTO,
	DashboardtypesScatterPlotPanelSpecDTO,
	QueryRangeV5200,
} from 'api/generated/services/sigNoz.schemas';
import { PanelMode } from 'lib/visualization/panels/types';
import type { PanelQueryData } from 'pages/DashboardPage/DashboardContainer/queryV5/types';
import { render, screen, userEvent } from 'tests/test-utils';

import type { BaseRendererProps } from '../../../types/rendererProps';
import BaseScatterPlotPanelRenderer from '../Renderer';

const ScatterPlotPanelRenderer =
	BaseScatterPlotPanelRenderer as React.FC<BaseRendererProps>;

window.ResizeObserver =
	window.ResizeObserver ||
	jest.fn().mockImplementation(() => ({
		disconnect: jest.fn(),
		observe: jest.fn(),
		unobserve: jest.fn(),
	}));

function panelWith(
	spec: DashboardtypesScatterPlotPanelSpecDTO,
): DashboardtypesPanelDTO {
	return {
		kind: 'Panel',
		spec: { plugin: { kind: 'signoz/ScatterPlotPanel', spec } },
	} as unknown as DashboardtypesPanelDTO;
}

/** A joined scalar result: one group column plus one value column per query. */
function dataWith(queryNames: string[], rows: unknown[][]): PanelQueryData {
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
								{ name: 'service.name', queryName: '', columnType: 'group' },
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

function renderPanel(data: PanelQueryData): ReturnType<typeof render> {
	return render(
		<ScatterPlotPanelRenderer
			panelId="panel-1"
			panel={panelWith({})}
			data={data}
			isFetching={false}
			error={null}
			panelMode={PanelMode.DASHBOARD_VIEW}
		/>,
	);
}

describe('ScatterPlotPanelRenderer', () => {
	it('shows the plain empty state when the query returns no groups', () => {
		const { getByTestId } = renderPanel(dataWith(['A', 'B'], []));

		expect(getByTestId('panel-no-data')).toBeInTheDocument();
	});

	it('asks for a second value when the query has one value column', () => {
		const { getByTestId, getByText } = renderPanel(
			dataWith(['A'], [['cart', 120]]),
		);

		expect(getByTestId('scatter-plot-empty-message')).toBeInTheDocument();
		expect(getByText('Add a second aggregation or query')).toBeInTheDocument();
	});

	it('explains the group by mismatch when no row has both an x and a y', () => {
		const { getByText } = renderPanel(
			dataWith(['A', 'B'], [['checkout', 45, 'n/a']]),
		);

		expect(getByText('0 of 1 group plotted')).toBeInTheDocument();
	});

	it('plots once two value columns line up for a group, and says how many did', () => {
		const { getByTestId, queryByTestId } = renderPanel(
			dataWith(
				['A', 'B'],
				[
					['cart', 120, 340],
					['checkout', 45, 'n/a'],
				],
			),
		);

		expect(getByTestId('scatter-plot-panel-renderer')).toBeInTheDocument();
		expect(queryByTestId('panel-no-data')).not.toBeInTheDocument();
		expect(getByTestId('scatter-plot-footer')).toHaveTextContent(
			'Showing 1 of 2 groups',
		);
	});

	it('has no footer when every group plots', () => {
		const { queryByTestId } = renderPanel(
			dataWith(['A', 'B'], [['cart', 120, 340]]),
		);

		expect(queryByTestId('scatter-plot-footer')).not.toBeInTheDocument();
	});

	it('keeps the chart area mounted through an empty state, so it plots again on return', async () => {
		const user = userEvent.setup();
		const ready = dataWith(['A', 'B'], [['cart', 120, 340]]);
		const mismatch = dataWith(['A', 'B'], [['checkout', 45, 'n/a']]);
		function Harness(): JSX.Element {
			const [data, setData] = useState(ready);
			return (
				<>
					<button type="button" onClick={(): void => setData(mismatch)}>
						mismatch
					</button>
					<button type="button" onClick={(): void => setData(ready)}>
						ready
					</button>
					<ScatterPlotPanelRenderer
						panelId="panel-1"
						panel={panelWith({})}
						data={data}
						isFetching={false}
						error={null}
						panelMode={PanelMode.DASHBOARD_VIEW}
					/>
				</>
			);
		}
		render(<Harness />);
		const chartArea = screen.getByTestId('scatter-plot-chart-area');

		await user.click(screen.getByRole('button', { name: 'mismatch' }));
		expect(screen.getByTestId('scatter-plot-empty-message')).toBeInTheDocument();
		expect(chartArea).not.toBeVisible();

		await user.click(screen.getByRole('button', { name: 'ready' }));
		expect(screen.getByTestId('scatter-plot-chart-area')).toBe(chartArea);
		expect(chartArea).toBeVisible();
	});
});
