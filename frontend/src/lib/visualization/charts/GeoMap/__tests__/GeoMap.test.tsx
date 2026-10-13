import { act, fireEvent, render, screen, within } from '@testing-library/react';
import {
	ColorRampPalette,
	ColorRampScale,
} from 'lib/visualization/colorRamp/types';

import GeoMap from '../GeoMap';
import { loadSubdivisions } from '../geo/subdivisions';
import { GeoMapDatum, GeoMapProps } from '../types';

jest.mock('hooks/useDimensions', () => ({
	useResizeObserver: jest.fn().mockReturnValue({ width: 800, height: 400 }),
}));

jest.mock('../geo/subdivisions', () => {
	const actual = jest.requireActual('../geo/subdivisions');
	return { ...actual, loadSubdivisions: jest.fn(actual.loadSubdivisions) };
});

const DATA: GeoMapDatum[] = [
	{ code: 'DE', value: 4.2, raw: 'de' },
	{ code: 'FR', value: 1.1, raw: 'FRA' },
	{ code: 'US', value: 9, raw: 'US' },
	{ code: 'BR', value: 0.5, raw: 'Brazil' },
];

const COLORS = {
	palette: ColorRampPalette.Lava,
	scale: ColorRampScale.Log,
	steps: 16,
	min: null,
	max: null,
};

function renderGeoMap(props: Partial<GeoMapProps> = {}): GeoMapProps {
	const merged: GeoMapProps = {
		data: DATA,
		view: 'world',
		layer: 'regions',
		colors: COLORS,
		bubbleRadius: [3, 28],
		formatValue: (value) => `${value}%`,
		isDarkMode: true,
		onSelect: jest.fn(),
		...props,
	};
	render(<GeoMap {...merged} />);
	return merged;
}

const shape = (code: string): Element => {
	const element = screen
		.getByTestId('geo-map-members')
		.querySelector(`[data-code="${code}"]`);
	if (!element) {
		throw new Error(`no shape for ${code}`);
	}
	return element;
};

const zoomTransform = (): string | null =>
	screen.getByTestId('geo-map-zoom-layer').getAttribute('transform');

describe('GeoMap', () => {
	it('draws every country on the world view, filling only those with data', () => {
		renderGeoMap();

		const members = screen
			.getByTestId('geo-map-members')
			.querySelectorAll('path');
		expect(members.length).toBeGreaterThan(200);
		expect(shape('DE')).toHaveAttribute('tabindex', '0');
		expect((shape('DE') as SVGElement).style.fill).not.toBe('');
		expect(shape('IT')).not.toHaveAttribute('tabindex');
		expect((shape('IT') as SVGElement).style.fill).toBe('');
	});

	it('draws a region preset with its neighbours as inert context', () => {
		renderGeoMap({ view: 'europe' });

		expect(shape('DE')).toBeInTheDocument();
		expect(
			screen.getByTestId('geo-map-members').querySelector('[data-code="US"]'),
		).toBeNull();
		const context = screen
			.getByTestId('geo-map-context')
			.querySelectorAll('path');
		expect(context.length).toBeGreaterThan(0);
		context.forEach((path) => expect(path).not.toHaveAttribute('data-code'));
	});

	it('labels the legend from the log floor to the highest value', () => {
		renderGeoMap();

		const legend = within(screen.getByTestId('color-bar'));
		expect(legend.getByText('0.5%')).toBeInTheDocument();
		expect(legend.getByText('9%')).toBeInTheDocument();
	});

	it('shows the tooltip and outline for a hovered country', () => {
		renderGeoMap();

		fireEvent.mouseMove(shape('DE'), { clientX: 10, clientY: 10 });

		const tooltip = within(screen.getByTestId('geo-map-tooltip'));
		expect(tooltip.getByText('Germany')).toBeInTheDocument();
		expect(tooltip.getByText('4.2%')).toBeInTheDocument();
		expect(tooltip.getByText(/#2 of 4/)).toBeInTheDocument();
		expect(screen.getByTestId('geo-map-hover-outline')).toBeInTheDocument();
	});

	it('hides the tooltip when the pointer leaves the map', () => {
		renderGeoMap();

		fireEvent.mouseMove(shape('DE'), { clientX: 10, clientY: 10 });
		fireEvent.mouseLeave(screen.getByTestId('geo-map-surface'));

		expect(screen.queryByTestId('geo-map-tooltip')).not.toBeInTheDocument();
	});

	it('selects a clicked country with the raw value the query returned', () => {
		const { onSelect } = renderGeoMap();

		fireEvent.mouseDown(shape('FR'), { clientX: 100, clientY: 100 });
		fireEvent.click(shape('FR'), { clientX: 101, clientY: 100 });

		expect(onSelect).toHaveBeenCalledWith(
			expect.objectContaining({ datum: { code: 'FR', value: 1.1, raw: 'FRA' } }),
		);
	});

	it('treats a press that moves as a pan, not a click', () => {
		const { onSelect } = renderGeoMap();

		fireEvent.mouseDown(shape('FR'), { clientX: 100, clientY: 100 });
		fireEvent.click(shape('FR'), { clientX: 140, clientY: 100 });

		expect(onSelect).not.toHaveBeenCalled();
	});

	it('selects a focused country with Enter', () => {
		const { onSelect } = renderGeoMap();

		fireEvent.keyDown(shape('US'), { key: 'Enter' });

		expect(onSelect).toHaveBeenCalledWith(
			expect.objectContaining({ datum: expect.objectContaining({ code: 'US' }) }),
		);
	});

	it('zooms in and resets from the controls', () => {
		renderGeoMap();
		const initial = zoomTransform();
		expect(screen.getByTestId('geo-map-zoom-out')).toBeDisabled();
		expect(screen.getByTestId('geo-map-zoom-reset')).toBeDisabled();

		fireEvent.click(screen.getByTestId('geo-map-zoom-in'));
		expect(zoomTransform()).not.toBe(initial);
		expect(screen.getByTestId('geo-map-zoom-reset')).toBeEnabled();

		fireEvent.click(screen.getByTestId('geo-map-zoom-reset'));
		expect(zoomTransform()).toBe(initial);
	});

	it('zooms on Ctrl/⌘ + wheel only, so a plain scroll still scrolls the page', () => {
		renderGeoMap();
		const surface = screen.getByTestId('geo-map-surface');
		const initial = zoomTransform();

		act(() => {
			surface.dispatchEvent(
				new WheelEvent('wheel', { deltaY: -100, bubbles: true }),
			);
		});
		expect(zoomTransform()).toBe(initial);

		act(() => {
			surface.dispatchEvent(
				new WheelEvent('wheel', { deltaY: -100, ctrlKey: true, bubbles: true }),
			);
		});
		expect(zoomTransform()).not.toBe(initial);
	});

	it('draws bubbles for the data instead of filled countries', () => {
		renderGeoMap({ layer: 'bubbles' });

		const bubbles = screen
			.getByTestId('geo-map-bubbles')
			.querySelectorAll('circle');
		expect(bubbles).toHaveLength(DATA.length);
		expect((shape('DE') as SVGElement).style.fill).toBe('');
	});
});

describe('GeoMap country view', () => {
	const STATES: GeoMapDatum[] = [
		{ code: 'IN-MH', value: 258, raw: 'MH' },
		{ code: 'IN-KA', value: 310, raw: 'KA' },
	];

	it('loads the country’s states, then draws them as members', async () => {
		renderGeoMap({ view: 'country', country: 'IN', data: STATES });

		expect(screen.getByTestId('geo-map-loading')).toHaveTextContent(
			'Loading map…',
		);
		await expect(
			screen.findByTestId('geo-map-members'),
		).resolves.toBeInTheDocument();
		expect(shape('IN-MH')).toHaveAttribute('tabindex', '0');
		expect(screen.queryByTestId('geo-map-loading')).not.toBeInTheDocument();
	});

	it('names states in the tooltip', async () => {
		renderGeoMap({ view: 'country', country: 'IN', data: STATES });
		await screen.findByTestId('geo-map-members');

		fireEvent.mouseMove(shape('IN-KA'), { clientX: 5, clientY: 5 });

		expect(
			within(screen.getByTestId('geo-map-tooltip')).getByText('Karnataka'),
		).toBeInTheDocument();
	});

	it('offers a retry when the states fail to load, and recovers', async () => {
		jest
			.mocked(loadSubdivisions)
			.mockImplementationOnce(() => Promise.reject(new Error('chunk failed')));
		renderGeoMap({ view: 'country', country: 'IN', data: STATES });

		fireEvent.click(await screen.findByTestId('geo-map-retry'));

		await expect(
			screen.findByTestId('geo-map-members'),
		).resolves.toBeInTheDocument();
		expect(screen.queryByTestId('geo-map-failed')).not.toBeInTheDocument();
	});
});
