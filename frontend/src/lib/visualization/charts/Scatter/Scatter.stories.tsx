import { useMemo, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { LegendPosition } from 'lib/uPlotV2/components/types';
import type { Threshold } from 'lib/uPlotV2/hooks/types';
import type { ScatterPointLabel } from 'lib/uPlotV2/plugins/ScatterPlugin/types';

import Scatter from './Scatter';
import {
	buildScatterConfig,
	prepareScatterChartData,
	ScatterSeries,
} from './utils';

const SERVICES = [
	'frontend',
	'cart',
	'checkout',
	'payment',
	'shipping',
	'currency',
	'email',
	'recommendation',
	'ads',
	'product-catalog',
];

type Shape = 'spread' | 'single' | 'sameX';

interface ScatterStoryProps {
	groups: number;
	pointsPerGroup: number;
	/** Adds an error-count size column. */
	sized: boolean;
	xLog: boolean;
	yLog: boolean;
	/** Zeroes a share of y values, which forces the symmetric log. */
	withZeros: boolean;
	shape: Shape;
	thresholds: boolean;
	pointSize: number;
	/** 0–1. */
	fillOpacity: number;
	width: number;
	height: number;
}

/** Deterministic, so a story renders the same points on every run. */
function createRng(seed: number): () => number {
	let state = seed >>> 0;
	return (): number => {
		state = (state * 1664525 + 1013904223) >>> 0;
		return state / 2 ** 32;
	};
}

function buildSeries({
	groups,
	pointsPerGroup,
	sized,
	withZeros,
	shape,
}: ScatterStoryProps): ScatterSeries[] {
	const rng = createRng(42);
	return Array.from({ length: groups }, (_, groupIndex) => {
		const label = SERVICES[groupIndex % SERVICES.length];
		// Each service sits in its own throughput/latency band, so groups are telling
		// apart rather than one cloud.
		const baseThroughput = 20 * 2 ** (groupIndex % 5);
		const baseLatency = 40 + 60 * (groupIndex % 4);

		const count = shape === 'single' ? 1 : pointsPerGroup;
		const xs: number[] = [];
		const ys: number[] = [];
		const sizes: Array<number | null> = [];

		for (let i = 0; i < count; i++) {
			const throughput =
				shape === 'sameX' ? baseThroughput : baseThroughput * (0.5 + rng() * 1.5);
			// Latency grows with load, plus noise; the odd outlier keeps the axis honest.
			const outlier = rng() < 0.03 ? 4 + rng() * 6 : 1;
			let latency =
				baseLatency *
				(0.8 + (throughput / baseThroughput) * 0.4 + rng() * 0.3) *
				outlier;
			if (withZeros && rng() < 0.2) {
				latency = 0;
			}
			xs.push(Number(throughput.toFixed(2)));
			ys.push(Number(latency.toFixed(2)));
			sizes.push(rng() < 0.1 ? null : Math.round(rng() * rng() * 500));
		}

		return sized ? { label, xs, ys, sizes } : { label, xs, ys };
	});
}

const THRESHOLDS: Threshold[] = [
	{
		thresholdValue: 300,
		thresholdUnit: 'ms',
		thresholdColor: '#E5484D',
		thresholdLabel: 'p99 SLO',
	},
];

function ScatterStory(props: ScatterStoryProps): JSX.Element {
	const {
		xLog,
		yLog,
		sized,
		thresholds,
		pointSize,
		fillOpacity,
		width,
		height,
	} = props;
	const isDarkMode = useIsDarkMode();
	const [drawMs, setDrawMs] = useState<number | null>(null);

	const series = useMemo(() => buildSeries(props), [props]);
	const pointCount = series.reduce((sum, entry) => sum + entry.xs.length, 0);
	const drawLabel = drawMs === null ? '—' : `${drawMs.toFixed(1)} ms`;

	const config = useMemo(() => {
		const builder = buildScatterConfig({
			id: 'scatter-story',
			series,
			isDarkMode,
			x: { unit: 'reqps', isLogScale: xLog },
			y: { unit: 'ms', isLogScale: yLog },
			pointSize: { fixed: pointSize, min: 4, max: pointSize * 4 },
			fillOpacity,
			thresholds: thresholds ? THRESHOLDS : undefined,
		});
		let started = 0;
		builder.addHook('drawClear', (): void => {
			started = performance.now();
		});
		builder.addHook('draw', (): void => {
			setDrawMs(performance.now() - started);
		});
		return builder;
	}, [series, isDarkMode, xLog, yLog, pointSize, fillOpacity, thresholds]);

	const data = useMemo(() => prepareScatterChartData(series), [series]);

	const resolvePointLabels = (
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
				resolvePointLabels={resolvePointLabels}
				canPinTooltip
			/>
			<p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, opacity: 0.7 }}>
				{`${pointCount.toLocaleString()} points · last draw ${drawLabel}`}
			</p>
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
		xLog: false,
		yLog: false,
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
		xLog: true,
		yLog: true,
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
