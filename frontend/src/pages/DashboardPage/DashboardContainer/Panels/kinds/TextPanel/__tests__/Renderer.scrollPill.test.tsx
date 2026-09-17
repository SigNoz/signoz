import { act, fireEvent, render, screen } from '@testing-library/react';
import type { PanelOfKind } from 'pages/DashboardPage/DashboardContainer/Panels/types/rendererProps';
import { PanelMode } from 'lib/visualization/panels/types';

import Renderer from '../Renderer';

const panel = {
	kind: 'Panel',
	spec: {
		display: { name: 'Runbook' },
		plugin: { kind: 'signoz/TextPanel', spec: { text: '# hello' } },
		queries: [],
	},
} as unknown as PanelOfKind<'signoz/TextPanel'>;

/**
 * The panel is never given a height that overflows here, so the scroll geometry
 * the hook reads is stubbed. `scrollTop` is stubbed with the rest: assigning it
 * on an element that does not actually overflow clamps back to 0.
 */
function setScrollGeometry(
	el: HTMLElement,
	{
		scrollHeight,
		clientHeight,
		scrollTop = 0,
	}: { scrollHeight: number; clientHeight: number; scrollTop?: number },
): void {
	Object.defineProperty(el, 'scrollHeight', {
		configurable: true,
		value: scrollHeight,
	});
	Object.defineProperty(el, 'clientHeight', {
		configurable: true,
		value: clientHeight,
	});
	Object.defineProperty(el, 'scrollTop', {
		configurable: true,
		writable: true,
		value: scrollTop,
	});
}

function renderPanel(): HTMLElement {
	render(
		<Renderer panelId="p1" panel={panel} panelMode={PanelMode.DASHBOARD_VIEW} />,
	);
	return screen.getByTestId('text-panel');
}

describe('Text panel scroll-to-bottom pill', () => {
	it('is absent when the body fits', () => {
		const scroller = renderPanel();
		setScrollGeometry(scroller, { scrollHeight: 100, clientHeight: 100 });
		fireEvent.scroll(scroller);

		expect(
			screen.queryByTestId('text-panel-scroll-more'),
		).not.toBeInTheDocument();
	});

	it('appears when content extends below the fold and jumps to the end on click', () => {
		const scroller = renderPanel();
		setScrollGeometry(scroller, { scrollHeight: 400, clientHeight: 100 });
		act(() => {
			fireEvent.scroll(scroller);
		});

		const pill = screen.getByTestId('text-panel-scroll-more');
		const scrollTo = vi.fn();
		scroller.scrollTo = scrollTo;
		fireEvent.click(pill);

		expect(scrollTo).toHaveBeenCalledWith({ top: 400, behavior: 'smooth' });
	});

	it('hides once the user reaches the bottom', () => {
		const scroller = renderPanel();
		setScrollGeometry(scroller, { scrollHeight: 400, clientHeight: 100 });
		act(() => {
			fireEvent.scroll(scroller);
		});
		expect(screen.getByTestId('text-panel-scroll-more')).toBeInTheDocument();

		setScrollGeometry(scroller, {
			scrollHeight: 400,
			clientHeight: 100,
			scrollTop: 300,
		});
		act(() => {
			fireEvent.scroll(scroller);
		});

		expect(
			screen.queryByTestId('text-panel-scroll-more'),
		).not.toBeInTheDocument();
	});
});
