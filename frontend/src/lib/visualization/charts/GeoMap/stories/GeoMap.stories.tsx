import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';
import { ColorRampPalette } from 'lib/visualization/colorRamp/types';

import GeoMapStory from './components/GeoMapStory';
import { clickAt, hoverUntilTooltip } from './play/olPointer';

const meta = {
	title: 'Charts/GeoMap',
	component: GeoMapStory,
	parameters: { layout: 'fullscreen', controls: { disable: true } },
	args: {
		dataset: 'errorRate',
		view: 'world',
		layer: 'regions',
		palette: ColorRampPalette.Lava,
	},
} satisfies Meta<typeof GeoMapStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Error rate per country as shaded regions. */
export const World: Story = {
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
		await expect(map.getByTestId('geo-map-zoom-out')).toHaveAttribute(
			'aria-disabled',
			'true',
		);

		await user.click(map.getByTestId('geo-map-zoom-in'));
		await waitFor(() =>
			expect(map.getByTestId('geo-map-zoom-out')).not.toHaveAttribute(
				'aria-disabled',
				'true',
			),
		);

		await user.click(map.getByTestId('geo-map-zoom-reset'));
		await waitFor(() =>
			expect(map.getByTestId('geo-map-zoom-out')).toHaveAttribute(
				'aria-disabled',
				'true',
			),
		);
	},
};

/** Bubbles coloured by error rate and sized by requests. */
export const Bubbles: Story = {
	args: { dataset: 'errorRateAndRequests', layer: 'bubbles' },
	tags: ['play'],
	play: async ({ canvasElement }): Promise<void> => {
		await waitFor(() =>
			expect(
				within(canvasElement).getByTestId('geo-map-size-legend'),
			).toHaveTextContent('Requests'),
		);
		await hoverUntilTooltip(canvasElement);
		await expect(screen.getByTestId('geo-map-tooltip-size')).toHaveTextContent(
			'Requests',
		);
	},
};

/** One circle per city at its lat/lon. */
export const Points: Story = {
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

/** A region preset: Europe drawn alone, neighbours faint. */
export const RegionView: Story = {
	args: {
		dataset: 'europeLatency',
		view: 'europe',
		palette: ColorRampPalette.Ice,
	},
};

/** One country's states, from GeoIP's bare region codes. */
export const CountryStates: Story = {
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
