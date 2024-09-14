import { Color } from '@signozhq/design-tokens';
import Uplot from 'components/Uplot';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useResizeObserver } from 'hooks/useDimensions';
import heatmapPlugin from 'lib/uPlotLib/plugins/heatmapPlugin';
import timelinePlugin from 'lib/uPlotLib/plugins/timelinePlugin';
import { useMemo, useRef } from 'react';
import { AlertRuleTimelineGraphResponse } from 'types/api/alerts/def';
import uPlot, { AlignedData } from 'uplot';

import { ALERT_STATUS, TIMELINE_OPTIONS } from './constants';

type Props = { type: string; data: AlertRuleTimelineGraphResponse[] };

function HorizontalTimelineGraph({
	width,
	isDarkMode,
	data,
}: {
	width: number;
	isDarkMode: boolean;
	data: AlertRuleTimelineGraphResponse[];
}): JSX.Element {
	const transformedData: AlignedData = useMemo(() => {
		if (!data?.length) {
			return [[], []];
		}

		// add an entry for the end time of the last entry to make sure the graph displays all the data

		const timestamps = [
			...data.map((item) => item.start / 1000),
			data[data.length - 1].end / 1000, // end value of last entry
		];

		const states = [
			...data.map((item) => ALERT_STATUS[item.state]),
			ALERT_STATUS[data[data.length - 1].state], // Same state as the last entry
		];

		return [timestamps, states];
	}, [data]);

	const options: uPlot.Options = useMemo(
		() => ({
			width,
			height: 85,
			cursor: { show: false },

			axes: [
				{
					gap: 10,
					stroke: isDarkMode ? Color.BG_VANILLA_400 : Color.BG_INK_400,
				},
				{ show: false },
			],
			legend: {
				show: false,
			},
			padding: [null, 0, null, 0],
			series: [
				{
					label: 'Time',
				},
				{
					label: 'States',
				},
			],
			plugins:
				transformedData?.length > 1
					? [
							timelinePlugin({
								count: transformedData.length - 1,
								...TIMELINE_OPTIONS,
							}),
					  ]
					: [],
		}),
		[width, isDarkMode, transformedData],
	);
	return <Uplot data={transformedData} options={options} />;
}

const transformVerticalTimelineGraph = (data: any[]): any => [
	data.map((item: { timestamp: any }) => item.timestamp),
	Array(data.length).fill(0),
	Array(data.length).fill(10),
	Array(data.length).fill([0, 1, 2, 3, 4, 5]),
	data.map((item: { value: number }) => {
		const count = Math.floor(item.value / 10);
		return [...Array(count).fill(1), 2];
	}),
];

const datatest: any[] = [];
const now = Math.floor(Date.now() / 1000); // current timestamp in seconds
const oneDay = 24 * 60 * 60; // one day in seconds

for (let i = 0; i < 90; i++) {
	const timestamp = now - i * oneDay;
	const startOfDay = timestamp - (timestamp % oneDay);
	datatest.push({
		timestamp: startOfDay,
		value: Math.floor(Math.random() * 30) + 1,
	});
}

function VerticalTimelineGraph({
	isDarkMode,
	width,
}: {
	width: number;
	isDarkMode: boolean;
}): JSX.Element {
	const transformedData = useMemo(
		() => transformVerticalTimelineGraph(datatest),
		[],
	);

	const options: uPlot.Options = useMemo(
		() => ({
			width,
			height: 90,
			plugins: [heatmapPlugin()],
			cursor: { show: false },
			legend: {
				show: false,
			},
			axes: [
				{
					gap: 10,
					stroke: isDarkMode ? Color.BG_VANILLA_400 : Color.BG_INK_400,
				},
				{ show: false },
			],
			series: [
				{},
				{
					paths: (): null => null,
					points: { show: false },
				},
				{
					paths: (): null => null,
					points: { show: false },
				},
			],
		}),
		[isDarkMode, width],
	);
	return <Uplot data={transformedData} options={options} />;
}

function Graph({ type, data }: Props): JSX.Element | null {
	const graphRef = useRef<HTMLDivElement>(null);

	const isDarkMode = useIsDarkMode();

	const containerDimensions = useResizeObserver(graphRef);

	if (type === 'horizontal') {
		return (
			<div ref={graphRef}>
				<HorizontalTimelineGraph
					isDarkMode={isDarkMode}
					width={containerDimensions.width}
					data={data}
				/>
			</div>
		);
	}
	return (
		<div ref={graphRef}>
			<VerticalTimelineGraph
				isDarkMode={isDarkMode}
				width={containerDimensions.width}
			/>
		</div>
	);
}

export default Graph;
