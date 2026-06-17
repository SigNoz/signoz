import {
	DashboardtypesComparisonOperatorDTO,
	type DashboardtypesNumberPanelSpecDTO,
	type DashboardtypesPanelDTO,
	DashboardtypesThresholdFormatDTO,
	type QueryRangeV5200,
} from 'api/generated/services/sigNoz.schemas';
import { PanelMode } from 'container/DashboardContainer/visualization/panels/types';
import type { PanelQueryData } from 'pages/DashboardPageV2/DashboardContainer/queryV5/types';
import { render } from 'tests/test-utils';

import { BaseRendererProps } from '../../../types/rendererProps';
import BaseNumberPanelRenderer from '../Renderer';

// The kind's interaction map is `Record<string, never>`, which makes the strict
// `PanelRendererProps<'signoz/NumberPanel'>` intersection impossible to satisfy
// with a literal. NumberPanel reads no interaction props, so render it against
// the base prop surface.
const NumberPanelRenderer =
	BaseNumberPanelRenderer as React.FC<BaseRendererProps>;

// ValueDisplay observes its container to size the font.
window.ResizeObserver =
	window.ResizeObserver ||
	jest.fn().mockImplementation(() => ({
		disconnect: jest.fn(),
		observe: jest.fn(),
		unobserve: jest.fn(),
	}));

function panelWith(
	spec: DashboardtypesNumberPanelSpecDTO,
): DashboardtypesPanelDTO {
	return {
		kind: 'Panel',
		spec: { plugin: { kind: 'signoz/NumberPanel', spec } },
	} as unknown as DashboardtypesPanelDTO;
}

// V5 scalar response: one table per query, value in the aggregation column.
function dataWith(value: string | number): PanelQueryData {
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
								{
									name: '__result',
									queryName: 'A',
									columnType: 'aggregation',
									aggregationIndex: 0,
								},
							],
							data: [[value]],
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

// `data` is always present per the renderer contract; an absent fetch surfaces
// as a missing `response`, not a missing `data`.
const absentResponseData: PanelQueryData = {
	response: undefined,
	requestPayload: undefined,
	legendMap: {},
};

// NumberPanel adds no interaction props (its interaction map is
// `Record<string, never>`), so the base renderer props fully describe it.
function renderPanel(
	props: Partial<BaseRendererProps>,
): ReturnType<typeof render> {
	const baseProps: BaseRendererProps = {
		panelId: 'panel-1',
		panel: panelWith({}),
		data: emptyData,
		isLoading: false,
		error: null,
		panelMode: PanelMode.DASHBOARD_VIEW,
		...props,
	};
	return render(<NumberPanelRenderer {...baseProps} />);
}

describe('NumberPanelRenderer', () => {
	it('renders the value with its y-axis unit', () => {
		const { getByText } = renderPanel({
			panel: panelWith({ formatting: { unit: 'ms' } }),
			data: dataWith('295.4299833508185'),
		});

		expect(getByText('295.43')).toBeInTheDocument();
		expect(getByText('ms')).toBeInTheDocument();
	});

	// Regression: with no unit configured, decimal precision must still apply.
	// Previously the renderer fell back to `value.toString()` whenever the unit
	// was empty, so precision changes had no effect on unitless panels.
	it('applies decimal precision even when no unit is set', () => {
		const { getByText, queryByText } = renderPanel({
			panel: panelWith({}),
			data: dataWith('3.14159'),
		});

		expect(getByText('3.14')).toBeInTheDocument();
		expect(queryByText('3.14159')).not.toBeInTheDocument();
	});

	it('renders No Data when the response has no scalar results', () => {
		const { getByTestId } = renderPanel({ data: emptyData });

		expect(getByTestId('number-panel-no-data')).toBeInTheDocument();
	});

	it('renders No Data when the response is absent', () => {
		const { getByTestId } = renderPanel({ data: absentResponseData });

		expect(getByTestId('number-panel-no-data')).toBeInTheDocument();
	});

	it('surfaces the conflicting-thresholds indicator when a value matches multiple thresholds', () => {
		const { getByTestId } = renderPanel({
			panel: panelWith({
				thresholds: [
					{
						color: '#f00',
						operator: DashboardtypesComparisonOperatorDTO.above,
						value: 0,
						format: DashboardtypesThresholdFormatDTO.background,
					},
					{
						color: '#0f0',
						operator: DashboardtypesComparisonOperatorDTO.above,
						value: 100,
						format: DashboardtypesThresholdFormatDTO.background,
					},
				],
			}),
			data: dataWith('295.4299833508185'),
		});

		expect(getByTestId('conflicting-thresholds')).toBeInTheDocument();
	});
});
