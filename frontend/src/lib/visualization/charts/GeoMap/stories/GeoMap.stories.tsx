import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';
import {
	ColorRampMode,
	ColorRampPalette,
	ColorRampScale,
} from 'lib/visualization/colorRamp/types';

import { getCountryName } from '../geo/countries';
import { SUBDIVISION_COUNTRIES } from '../geo/subdivisions';
import { VIEW_PRESETS } from '../geo/views';
import GeoMapAssetTable from './components/GeoMapAssetTable';
import GeoMapPlayground from './components/GeoMapPlayground';
import { clickAt, hoverUntilTooltip } from './play/olPointer';

const meta = {
	title: 'Charts/GeoMap',
	component: GeoMapPlayground,
	parameters: { layout: 'fullscreen' },
	args: {
		dataset: 'errorRate',
		statesOf: 'none',
		view: 'world',
		layer: 'regions',
		showLabels: true,
		mode: ColorRampMode.Palette,
		fill: '',
		palette: ColorRampPalette.Lava,
		scale: ColorRampScale.Log,
		steps: 64,
		minRadius: 3,
		maxRadius: 28,
		width: 960,
		height: 540,
	},
	argTypes: {
		dataset: {
			control: 'radio',
			options: [
				'errorRate',
				'errorRateAndRequests',
				'cityLatency',
				'cityLatencyAndRequests',
				'manyPoints',
				'maxPoints',
				'requests',
				'europeLatency',
				'usStates',
				'indiaStates',
			],
		},
		statesOf: {
			control: 'select',
			options: ['none', ...SUBDIVISION_COUNTRIES],
			labels: {
				none: 'None (use dataset)',
				...Object.fromEntries(
					SUBDIVISION_COUNTRIES.map((code) => [
						code,
						`${getCountryName(code)} (${code})`,
					]),
				),
			},
		},
		view: {
			control: 'select',
			options: Object.keys(VIEW_PRESETS),
			labels: Object.fromEntries(
				Object.entries(VIEW_PRESETS).map(([key, preset]) => [key, preset.label]),
			),
		},
		layer: {
			control: 'inline-radio',
			options: ['regions', 'bubbles', 'points'],
		},
		showLabels: { control: 'boolean' },
		mode: { control: 'inline-radio', options: Object.values(ColorRampMode) },
		fill: { control: 'color', if: { arg: 'mode', eq: ColorRampMode.Opacity } },
		palette: { control: 'select', options: Object.values(ColorRampPalette) },
		scale: { control: 'inline-radio', options: Object.values(ColorRampScale) },
		steps: { control: { type: 'range', min: 2, max: 128, step: 1 } },
		minRadius: { control: { type: 'range', min: 1, max: 20, step: 1 } },
		maxRadius: { control: { type: 'range', min: 8, max: 64, step: 1 } },
		width: { control: { type: 'range', min: 240, max: 1600, step: 10 } },
		height: { control: { type: 'range', min: 200, max: 1000, step: 10 } },
	},
} satisfies Meta<typeof GeoMapPlayground>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Error rate per country as shaded regions; the main choropleth case. */
export const ErrorRateWorld: Story = {
	tags: ['play'],
	play: async ({ canvasElement }): Promise<void> => {
		const point = await hoverUntilTooltip(canvasElement);
		await expect(screen.getByTestId('geo-map-tooltip')).toHaveTextContent('%');

		clickAt(canvasElement, point);
		await waitFor(() =>
			expect(screen.getByTestId('geo-map-drilldown-menu')).toHaveTextContent(
				'geo.country.iso_code',
			),
		);
		await expect(screen.queryByTestId('geo-map-tooltip')).toBeNull();

		const backdrop = document.querySelector<HTMLElement>(
			'.context-menu-backdrop',
		);
		await expect(backdrop).not.toBeNull();
		await userEvent.click(backdrop as HTMLElement);
		await waitFor(() =>
			expect(screen.queryByTestId('geo-map-drilldown-menu')).toBeNull(),
		);
	},
};

/** Zoom in, then back to the fitted frame. */
export const ZoomControls: Story = {
	tags: ['play'],
	play: async ({ canvasElement }): Promise<void> => {
		const map = within(canvasElement);
		// The controls only show on CSS :hover, which synthetic events don't trigger.
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		await expect(map.getByTestId('geo-map-zoom-out')).toBeDisabled();

		await user.click(map.getByTestId('geo-map-zoom-in'));
		await waitFor(() =>
			expect(map.getByTestId('geo-map-zoom-out')).toBeEnabled(),
		);

		await user.click(map.getByTestId('geo-map-zoom-reset'));
		await waitFor(() =>
			expect(map.getByTestId('geo-map-zoom-out')).toBeDisabled(),
		);
	},
};

/**
 * Two metrics: countries shaded by error rate, with neutral bubbles sized by
 * requests, so a dark country with a big bubble is the one to fix first.
 */
export const ErrorRateSizedByRequests: Story = {
	args: { dataset: 'errorRateAndRequests' },
	tags: ['play'],
	play: async ({ canvasElement }): Promise<void> => {
		await waitFor(() =>
			expect(
				within(canvasElement).getByTestId('geo-map-size-legend'),
			).toHaveTextContent('Requests'),
		);
		await hoverUntilTooltip(canvasElement);
		await expect(screen.getByTestId('geo-map-tooltip')).toHaveTextContent(
			'Error rate',
		);
		await expect(screen.getByTestId('geo-map-tooltip-size')).toHaveTextContent(
			'Requests',
		);
	},
};

/** The same two metrics as bubbles alone: colour by error rate, size by requests. */
export const BubblesColouredAndSized: Story = {
	args: { dataset: 'errorRateAndRequests', layer: 'bubbles' },
};

/** Points: one circle per city at its lat/lon, coloured by p95 latency. */
export const CityPoints: Story = {
	args: { dataset: 'cityLatency', palette: ColorRampPalette.Ember },
	tags: ['play'],
	play: async ({ canvasElement }): Promise<void> => {
		const point = await hoverUntilTooltip(canvasElement);
		const tooltip = screen.getByTestId('geo-map-tooltip');
		await expect(tooltip).toHaveTextContent(/° [NS], .*° [EW]/);
		await expect(tooltip).toHaveTextContent('ms');

		clickAt(canvasElement, point);
		await waitFor(() =>
			expect(screen.getByTestId('geo-map-drilldown-menu')).toHaveTextContent(
				'geo.location',
			),
		);
	},
};

/** Points coloured by latency and sized by requests: hubs stand out. */
export const CityPointsSizedByRequests: Story = {
	args: { dataset: 'cityLatencyAndRequests', palette: ColorRampPalette.Ember },
};

/**
 * 5,000 points, the panel's cap: small circles so clusters read as density.
 * Hover and zoom should stay smooth.
 */
export const ManyPoints: Story = {
	args: {
		dataset: 'manyPoints',
		palette: ColorRampPalette.Ember,
		minRadius: 1,
		maxRadius: 6,
	},
	tags: ['play'],
	play: async ({ canvasElement }): Promise<void> => {
		await hoverUntilTooltip(canvasElement);
		await expect(screen.getByTestId('geo-map-tooltip')).toHaveTextContent(
			'Near ',
		);
	},
};

/**
 * 100,000 points, the panel's cap, drawn on the GPU. No play test: CI renders
 * WebGL on the CPU, where this is too slow to hover reliably.
 */
export const MaxPoints: Story = {
	args: {
		dataset: 'maxPoints',
		palette: ColorRampPalette.Ember,
		minRadius: 1,
		maxRadius: 4,
	},
};

/** Fit to data frames the points themselves. */
export const CityPointsFitToData: Story = {
	args: {
		dataset: 'cityLatency',
		view: 'fit',
		palette: ColorRampPalette.Ember,
	},
};

/** Requests are dominated by the US; the default log scale keeps the rest readable. */
export const Requests: Story = {
	args: { dataset: 'requests' },
};

/** The same requests on a linear scale: one bright country, everything else dark. */
export const RequestsLinearScale: Story = {
	args: { dataset: 'requests', scale: ColorRampScale.Linear },
};

/** Counts read better as bubbles, and small countries stay visible. */
export const RequestBubbles: Story = {
	args: {
		dataset: 'requests',
		layer: 'bubbles',
		palette: ColorRampPalette.Ember,
	},
};

/** A region preset: Europe drawn alone, neighbours faint, US/IN/SG reported as outside. */
export const EuropeView: Story = {
	args: {
		dataset: 'europeLatency',
		view: 'europe',
		palette: ColorRampPalette.Ice,
	},
};

/** Frames only the countries that have data. */
export const FitToData: Story = {
	args: { dataset: 'europeLatency', view: 'fit' },
};

/** Oceania, framed up to the antimeridian. */
export const OceaniaView: Story = {
	args: { view: 'oceania' },
};

/** US states, from GeoIP's bare region codes; the frame is the lower 48. */
export const UsStates: Story = {
	args: { dataset: 'usStates' },
	tags: ['play'],
	play: async ({ canvasElement }): Promise<void> => {
		await waitFor(() =>
			expect(within(canvasElement).queryByTestId('geo-map-loading')).toBeNull(),
		);
		await hoverUntilTooltip(canvasElement);
		await expect(screen.getByTestId('geo-map-tooltip')).toHaveTextContent('US-');
	},
};

/** The same states as bubbles. */
export const UsStateBubbles: Story = {
	args: {
		dataset: 'usStates',
		layer: 'bubbles',
		palette: ColorRampPalette.Ember,
	},
};

/** Indian states, Mercator; newer ISO codes (TS, UK, CG) resolve through aliases. */
export const IndiaStates: Story = {
	args: { dataset: 'indiaStates', palette: ColorRampPalette.Ice },
};

/** France's departments, framed without its overseas departments. */
export const FranceStates: Story = {
	args: { statesOf: 'FR' },
	tags: ['play'],
	play: async ({ canvasElement }): Promise<void> => {
		await waitFor(() =>
			expect(within(canvasElement).queryByTestId('geo-map-loading')).toBeNull(),
		);
		await hoverUntilTooltip(canvasElement);
		await expect(screen.getByTestId('geo-map-tooltip')).toHaveTextContent('FR-');
	},
};

/** Brazil's states. */
export const BrazilStates: Story = {
	args: { statesOf: 'BR', palette: ColorRampPalette.Verdant },
};

/** Japan's prefectures, an island chain kept whole in one frame. */
export const JapanStates: Story = {
	args: { statesOf: 'JP', palette: ColorRampPalette.Ice },
};

/** A small dashboard tile. */
export const SmallPanel: Story = {
	args: { width: 360, height: 240 },
};

/** The bundled outlines asset: codes, regions, label points and bounds per shape. */
export const OutlinesAsset: StoryObj = {
	render: (): JSX.Element => <GeoMapAssetTable />,
};

/** Opacity mode: one color fades from clear to solid with the value. */
export const OpacityMode: Story = {
	args: { mode: ColorRampMode.Opacity, scale: ColorRampScale.Sqrt },
};
