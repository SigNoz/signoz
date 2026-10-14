import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';
import {
	ColorRampPalette,
	ColorRampScale,
} from 'lib/visualization/colorRamp/types';

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
		view: 'world',
		layer: 'regions',
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
				'requests',
				'europeLatency',
				'usStates',
				'indiaStates',
			],
		},
		view: {
			control: 'select',
			options: Object.keys(VIEW_PRESETS),
			labels: Object.fromEntries(
				Object.entries(VIEW_PRESETS).map(([key, preset]) => [key, preset.label]),
			),
		},
		layer: { control: 'inline-radio', options: ['regions', 'bubbles'] },
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

/** A small dashboard tile. */
export const SmallPanel: Story = {
	args: { width: 360, height: 240 },
};

/** The bundled outlines asset: codes, regions, label points and bounds per shape. */
export const OutlinesAsset: StoryObj = {
	render: (): JSX.Element => <GeoMapAssetTable />,
};
