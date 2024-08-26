/* eslint-disable consistent-return */
/* eslint-disable react/jsx-props-no-spreading */
import { Color } from '@signozhq/design-tokens';
import Uplot from 'components/Uplot';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useResizeObserver } from 'hooks/useDimensions';
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
	const transformedData: AlignedData = useMemo(
		() =>
			data.length
				? [
						data.map((item: AlertRuleTimelineGraphResponse) => item.start / 1000),
						data.map(
							(item: AlertRuleTimelineGraphResponse) => ALERT_STATUS[item.state],
						),
				  ]
				: [],

		[data],
	);

	const options: uPlot.Options = useMemo(
		() => ({
			width,
			height: 85,
			cursor: {
				drag: {
					x: false,
					y: false,
				},
			},

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
			plugins: [
				timelinePlugin({
					count: transformedData.length - 1,
					...TIMELINE_OPTIONS,
				}),
			],
		}),
		[width, isDarkMode, transformedData.length],
	);
	return <Uplot data={transformedData} options={options} />;
}

function Graph({ type, data }: Props): React.ReactNode {
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
	return null;
}

export default Graph;
