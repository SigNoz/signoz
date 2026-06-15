import React from 'react';
import { render, screen } from 'tests/test-utils';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import uPlot from 'uplot';

import { BillingBarChartTooltip } from '../BillingBarChartTooltip';

// Mock buildTooltipContent so tests don't depend on uPlot stacking math
jest.mock('lib/uPlotV2/components/Tooltip/utils', () => ({
	buildTooltipContent: jest.fn().mockReturnValue([
		{
			label: 'Logs',
			value: 100,
			tooltipValue: '$100.00',
			color: '#7CEDBE',
			isActive: true,
			isHighlighted: false,
		},
		{
			label: 'Traces',
			value: 50,
			tooltipValue: '$50.00',
			color: '#4E74F8',
			isActive: false,
			isHighlighted: false,
		},
	]),
}));

jest.mock('hooks/useDarkMode', () => ({
	useIsDarkMode: jest.fn().mockReturnValue(false),
}));

function makeUPlotInstance(seriesLabels: string[]): uPlot {
	return {
		data: [
			[1000, 2000],
			[100, 200],
			[50, 80],
		],
		cursor: { idx: 0 },
		series: [
			{ label: 'Timestamp', show: true, stroke: '#000' },
			...seriesLabels.map((label) => ({
				label,
				show: true,
				stroke: '#aabbcc',
			})),
		],
	} as unknown as uPlot;
}

function makeBillingApiResponse(
	entries: { legend: string; quantity: (number | null)[]; unit: string }[],
): MetricRangePayloadProps {
	return {
		data: {
			result: entries.map((e) => ({
				legend: e.legend,
				queryName: e.legend,
				metric: {},
				values: [[1000, '10']] as [number, string][],
				quantity: e.quantity as number[],
				unit: e.unit,
			})),
			resultType: '',
			newResult: { data: { result: [], resultType: '' } },
		},
	};
}

const baseTooltipArgs = {
	isPinned: false,
	dismiss: jest.fn(),
	viaSync: false,
	seriesIndex: 1,
	dataIndexes: [null, 0, 0],
};

describe('BillingBarChartTooltip', () => {
	it('augments tooltipValue with quantity and unit for each series', () => {
		const uPlotInstance = makeUPlotInstance(['Logs', 'Traces']);
		const billingApiResponse = makeBillingApiResponse([
			{ legend: 'Logs', quantity: [1.5, 2.0], unit: 'GB' },
			{ legend: 'Traces', quantity: [500, 800], unit: 'spans' },
		]);

		render(
			<BillingBarChartTooltip
				{...baseTooltipArgs}
				uPlotInstance={uPlotInstance}
				billingApiResponse={billingApiResponse}
			/>,
		);

		expect(screen.getAllByText(/1\.5 GB/i).length).toBeGreaterThan(0);
		expect(screen.getAllByText(/500 spans/i).length).toBeGreaterThan(0);
	});

	it('omits quantity line when quantity at dataIndex is null', () => {
		const uPlotInstance = makeUPlotInstance(['Logs', 'Traces']);
		const billingApiResponse = makeBillingApiResponse([
			{ legend: 'Logs', quantity: [null, null], unit: 'GB' },
			{ legend: 'Traces', quantity: [null, null], unit: 'spans' },
		]);

		render(
			<BillingBarChartTooltip
				{...baseTooltipArgs}
				uPlotInstance={uPlotInstance}
				billingApiResponse={billingApiResponse}
			/>,
		);

		expect(screen.queryByText(/null GB/i)).not.toBeInTheDocument();
		expect(screen.queryByText(/null spans/i)).not.toBeInTheDocument();
		expect(screen.getByTestId('uplot-tooltip-container')).toBeInTheDocument();
	});

	it('formats dollar value via getToolTipValue — strips trailing zeros (0.3076 → $0.3)', () => {
		const uPlotInstance = makeUPlotInstance(['Logs']);
		const { buildTooltipContent } = jest.requireMock(
			'lib/uPlotV2/components/Tooltip/utils',
		) as { buildTooltipContent: jest.Mock };
		buildTooltipContent.mockReturnValueOnce([
			{
				label: 'Logs',
				value: 0.3076171875,
				tooltipValue: '$0.31',
				color: '#7CEDBE',
				isActive: true,
				isHighlighted: false,
			},
		]);
		const billingApiResponse = makeBillingApiResponse([
			{ legend: 'Logs', quantity: [1.23], unit: 'GB' },
		]);

		render(
			<BillingBarChartTooltip
				{...baseTooltipArgs}
				uPlotInstance={uPlotInstance}
				billingApiResponse={billingApiResponse}
			/>,
		);

		expect(screen.getAllByText(/\$0\.3 -/i).length).toBeGreaterThan(0);
	});

	it('passes through base tooltipValue when series is not in billingApiResponse', () => {
		const uPlotInstance = makeUPlotInstance(['Logs', 'Traces']);
		const billingApiResponse = makeBillingApiResponse([]);

		render(
			<BillingBarChartTooltip
				{...baseTooltipArgs}
				uPlotInstance={uPlotInstance}
				billingApiResponse={billingApiResponse}
			/>,
		);

		expect(screen.getAllByText('$100.00').length).toBeGreaterThan(0);
		expect(screen.getAllByText('$50.00').length).toBeGreaterThan(0);
	});
});
