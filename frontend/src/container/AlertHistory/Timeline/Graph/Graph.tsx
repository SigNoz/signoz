import { Color } from '@signozhq/design-tokens';
import Uplot from 'components/Uplot';
import { QueryParams } from 'constants/query';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useResizeObserver } from 'hooks/useDimensions';
import useUrlQuery from 'hooks/useUrlQuery';
import history from 'lib/history';
import heatmapPlugin from 'lib/uPlotLib/plugins/heatmapPlugin';
import timelinePlugin from 'lib/uPlotLib/plugins/timelinePlugin';
import { uPlotXAxisValuesFormat } from 'lib/uPlotLib/utils/constants';
import { useTimezone } from 'providers/Timezone';
import { useMemo, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { UpdateTimeInterval } from 'store/actions';
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

	const urlQuery = useUrlQuery();
	const dispatch = useDispatch();
	const { timezone } = useTimezone();

	const options: uPlot.Options = useMemo(
		() => ({
			width,
			height: 85,

			axes: [
				{
					gap: 10,
					stroke: isDarkMode ? Color.BG_VANILLA_400 : Color.BG_INK_400,
					values: uPlotXAxisValuesFormat,
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
			hooks: {
				setSelect: [
					(self): void => {
						const selection = self.select;
						if (selection) {
							const startTime = self.posToVal(selection.left, 'x');
							const endTime = self.posToVal(selection.left + selection.width, 'x');

							const diff = endTime - startTime;

							if (diff > 0) {
								if (urlQuery.has(QueryParams.relativeTime)) {
									urlQuery.delete(QueryParams.relativeTime);
								}

								const startTimestamp = Math.floor(startTime * 1000);
								const endTimestamp = Math.floor(endTime * 1000);

								if (startTimestamp !== endTimestamp) {
									dispatch(UpdateTimeInterval('custom', [startTimestamp, endTimestamp]));
								}

								urlQuery.set(QueryParams.startTime, startTimestamp.toString());
								urlQuery.set(QueryParams.endTime, endTimestamp.toString());

								history.push({
									search: urlQuery.toString(),
								});
							}
						}
					},
				],
			},

			plugins:
				transformedData?.length > 1
					? [
							timelinePlugin({
								count: transformedData.length - 1,
								...TIMELINE_OPTIONS,
							}),
					  ]
					: [],

			tzDate: (timestamp: number): Date =>
				uPlot.tzDate(new Date(timestamp * 1e3), timezone.value),
		}),
		[
			width,
			isDarkMode,
			transformedData.length,
			urlQuery,
			dispatch,
			timezone.value,
		],
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
