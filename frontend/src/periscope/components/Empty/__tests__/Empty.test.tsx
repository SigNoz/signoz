import type { ReactElement } from 'react';
import { THEME_MODE } from 'hooks/useDarkMode/constant';
import { ThemeContext } from 'hooks/useDarkMode';
import { render, screen } from 'tests/test-utils';

import Empty from '../Empty';

jest.mock('../Empty.module.scss', () => ({
	__esModule: true,
	default: new Proxy({}, { get: (_target, key): unknown => key }),
}));

const TEST_ID = 'empty';
const IMAGE_URL = 'https://example.com/empty.svg';

function renderInTheme(theme: string, ui: ReactElement): void {
	render(
		<ThemeContext.Provider
			value={{
				theme,
				toggleTheme: jest.fn(),
				autoSwitch: false,
				setAutoSwitch: jest.fn(),
				setTheme: jest.fn(),
			}}
		>
			{ui}
		</ThemeContext.Provider>,
	);
}

function partsOf(root: HTMLElement): string[] {
	return Array.from(root.children).map((child) => child.className);
}

describe('Empty', () => {
	it('renders the default image and "No data" with native props', () => {
		render(<Empty data-testid={TEST_ID} className="custom" title="hint" />);

		const el = screen.getByTestId(TEST_ID);
		expect(el.className).toBe('empty custom');
		expect(el).toHaveAttribute('title', 'hint');
		expect(partsOf(el)).toStrictEqual(['image', 'description']);
		expect(el.querySelector('.image svg')).toHaveAttribute('width', '184');
		expect(el.querySelector('.description')).toHaveTextContent(/^No data$/);
	});

	it('dims the default image only in dark mode', () => {
		renderInTheme(THEME_MODE.DARK, <Empty data-testid="dark" />);
		renderInTheme(THEME_MODE.LIGHT, <Empty data-testid="light" />);

		const darkSvg = screen.getByTestId('dark').querySelector('svg');
		const lightSvg = screen.getByTestId('light').querySelector('svg');
		expect(darkSvg?.getAttribute('style')).toBe('opacity: 0.65;');
		expect(lightSvg?.getAttribute('style')).toBeNull();
	});

	it('switches to the normal variant and theme colours for the simple preset', () => {
		renderInTheme(
			THEME_MODE.DARK,
			<Empty data-testid="dark" image={Empty.PRESENTED_IMAGE_SIMPLE} />,
		);
		renderInTheme(
			THEME_MODE.LIGHT,
			<Empty data-testid="light" image={Empty.PRESENTED_IMAGE_SIMPLE} />,
		);

		const dark = screen.getByTestId('dark');
		const light = screen.getByTestId('light');
		expect(dark.className).toBe('empty normal');
		expect(dark.querySelector('svg')).toHaveAttribute('width', '64');

		const colours = (root: HTMLElement): (string | null)[] => [
			root.querySelector('ellipse')?.getAttribute('fill') ?? null,
			root.querySelector('g[stroke]')?.getAttribute('stroke') ?? null,
			root.querySelector('path[fill]')?.getAttribute('fill') ?? null,
		];
		expect(colours(dark)).toStrictEqual(['#25262a', '#3d3d41', '#1b1c20']);
		expect(colours(light)).toStrictEqual(['#f5f5f5', '#d9d9d9', '#fafafa']);
	});

	it('keeps the default variant for a custom image node', () => {
		render(<Empty data-testid={TEST_ID} image={<span>custom</span>} />);

		const el = screen.getByTestId(TEST_ID);
		expect(el.className).toBe('empty');
		expect(el.querySelector('.image')?.innerHTML).toBe('<span>custom</span>');
	});

	it('renders a string image as an img named after a string description', () => {
		const { rerender } = render(
			<Empty data-testid={TEST_ID} image={IMAGE_URL} description="Nothing" />,
		);
		const img = (): HTMLImageElement | null =>
			screen.getByTestId(TEST_ID).querySelector('img');
		expect(img()).toHaveAttribute('src', IMAGE_URL);
		expect(img()).toHaveAttribute('alt', 'Nothing');

		rerender(
			<Empty data-testid={TEST_ID} image={IMAGE_URL} description={<b>x</b>} />,
		);
		expect(img()).toHaveAttribute('alt', 'empty');

		rerender(<Empty data-testid={TEST_ID} image={IMAGE_URL} />);
		expect(img()).toHaveAttribute('alt', 'No data');
	});

	it('hides a falsy description and renders a custom one', () => {
		const { rerender } = render(
			<Empty data-testid={TEST_ID} description={false} />,
		);
		expect(partsOf(screen.getByTestId(TEST_ID))).toStrictEqual(['image']);

		rerender(<Empty data-testid={TEST_ID} description={<em>Custom</em>} />);
		expect(
			screen.getByTestId(TEST_ID).querySelector('.description')?.innerHTML,
		).toBe('<em>Custom</em>');
	});

	it('wraps children in a footer and styles the image wrapper', () => {
		render(
			<Empty data-testid={TEST_ID} imageStyle={{ height: 60 }}>
				<button type="button">Retry</button>
			</Empty>,
		);

		const el = screen.getByTestId(TEST_ID);
		expect(partsOf(el)).toStrictEqual(['image', 'description', 'footer']);
		expect(el.querySelector<HTMLElement>('.image')?.style.height).toBe('60px');
		expect(el.querySelector('.footer')).toHaveTextContent('Retry');
	});
});
