import { useMemo } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { LegendPosition } from 'lib/uPlotV2/components/types';
import type { ScatterPointLabel } from 'lib/uPlotV2/plugins/ScatterPlugin/types';

import Scatter from './Scatter';
import {
	buildSeries,
	type ScatterStoryProps,
	THRESHOLDS,
} from './Scatter.stories.mocks';
import { ScatterAxisScale } from './types';
import { buildScatterConfig, prepareScatterChartData } from './utils';

function ScatterStory(props: ScatterStoryProps): JSX.Element {
	const {
		xScale,
		yScale,
		sized,
		thresholds,
		pointSize,
		fillOpacity,
		width,
		height,
	} = props;
	const isDarkMode = useIsDarkMode();

	const series = useMemo(() => buildSeries(props), [props]);

	const config = useMemo(
		() =>
			buildScatterConfig({
				id: 'scatter-story',
				series,
				isDarkMode,
				x: { unit: 'reqps', scale: xScale },
				y: { unit: 'ms', scale: yScale },
				pointSize: { fixed: pointSize, min: 4, max: pointSize * 4 },
				fillOpacity,
				thresholds: thresholds ? THRESHOLDS : undefined,
			}),
		[series, isDarkMode, xScale, yScale, pointSize, fillOpacity, thresholds],
	);

	const data = useMemo(() => prepareScatterChartData(series), [series]);

	const resolvePointGroupValues = (
		seriesIndex: number,
		dataIndex: number,
	): ScatterPointLabel[] => [
		{ key: 'service.name', value: series[seriesIndex - 1]?.label ?? '' },
		{
			key: 'k8s.pod.name',
			value: `pod-${dataIndex.toString().padStart(3, '0')}`,
		},
	];

	return (
		<div style={{ width, padding: 16 }}>
			<Scatter
				config={config}
				data={data}
				width={width}
				height={height}
				legendConfig={{ position: LegendPosition.BOTTOM }}
				channels={{
					x: { label: 'Throughput', unit: 'reqps' },
					y: { label: 'p99 latency', unit: 'ms' },
					...(sized && { size: { label: 'Errors', unit: 'short' } }),
				}}
				resolvePointGroupValues={resolvePointGroupValues}
				canPinTooltip
			/>
		</div>
	);
}

const meta = {
	title: 'Charts/Scatter',
	component: ScatterStory,
	parameters: { layout: 'padded' },
	args: {
		groups: 1,
		pointsPerGroup: 10,
		sized: false,
		xScale: ScatterAxisScale.Linear,
		yScale: ScatterAxisScale.Linear,
		withZeros: false,
		shape: 'spread',
		thresholds: false,
		pointSize: 6,
		fillOpacity: 0.7,
		width: 800,
		height: 420,
	},
	argTypes: {
		shape: { control: 'radio', options: ['spread', 'single', 'sameX'] },
		xScale: { control: 'radio', options: Object.values(ScatterAxisScale) },
		yScale: { control: 'radio', options: Object.values(ScatterAxisScale) },
		fillOpacity: { control: { type: 'range', min: 0, max: 1, step: 0.05 } },
		pointSize: { control: { type: 'range', min: 2, max: 16, step: 1 } },
	},
} satisfies Meta<ScatterStoryProps>;

export default meta;

type Story = StoryObj<ScatterStoryProps>;

/** One service, ten points: axes formatted with units, hover picks the right point. */
export const Basic: Story = {};

/** Five services, one legend entry each; toggling a row hides its points. */
export const Grouped: Story = {
	args: { groups: 5, pointsPerGroup: 40 },
};

/** Error count as disc area, between the configured min and max diameters. */
export const Sized: Story = {
	args: { groups: 5, pointsPerGroup: 40, sized: true, pointSize: 5 },
};

/** Log x; a fifth of the latencies are 0, so y falls back to the symmetric log. */
export const LogAxes: Story = {
	args: {
		groups: 5,
		pointsPerGroup: 60,
		xScale: ScatterAxisScale.Log,
		yScale: ScatterAxisScale.Log,
		withZeros: true,
	},
};

/** A single point still gets a padded range rather than an empty plot. */
export const SinglePoint: Story = {
	args: { shape: 'single' },
};

/** Fifty points sharing one x collide on nothing: no shared x array to align. */
export const SameX: Story = {
	args: { groups: 3, pointsPerGroup: 50, shape: 'sameX' },
};

/** Horizontal line with label on the y axis; the scale stretches to include it. */
export const Thresholds: Story = {
	args: { groups: 3, pointsPerGroup: 40, thresholds: true },
};

/** Perf harness: raise `pointsPerGroup` and read the draw time under the chart. */
export const Dense: Story = {
	args: { groups: 5, pointsPerGroup: 1000, pointSize: 4, fillOpacity: 0.5 },
};
