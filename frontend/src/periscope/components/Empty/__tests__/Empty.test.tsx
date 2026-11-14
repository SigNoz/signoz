import { render, screen } from 'tests/test-utils';

import Empty from '../Empty';

jest.mock('../Empty.module.scss', () => ({
	__esModule: true,
	default: new Proxy({}, { get: (_target, key): unknown => key }),
}));

const TEST_ID = 'empty';
const IMAGE_URL = 'https://example.com/empty.svg';

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

	it('themes the default image through its class, not inline style', () => {
		render(<Empty data-testid={TEST_ID} />);

		const svg = screen.getByTestId(TEST_ID).querySelector('svg');
		expect(svg).toHaveAttribute('class', 'defaultImage');
		expect(svg).not.toHaveAttribute('style');
	});

	it('switches to the normal variant and themes the simple image through classes', () => {
		render(<Empty data-testid={TEST_ID} image={Empty.PRESENTED_IMAGE_SIMPLE} />);

		const el = screen.getByTestId(TEST_ID);
		expect(el.className).toBe('empty normal');
		expect(el.querySelector('svg')).toHaveAttribute('width', '64');
		expect(
			Array.from(el.querySelectorAll('svg [class]')).map((node) => [
				node.tagName,
				node.getAttribute('class'),
			]),
		).toStrictEqual([
			['ellipse', 'simpleShadow'],
			['g', 'simpleBorder'],
			['path', 'simpleContent'],
		]);
		expect(
			el.querySelectorAll('svg [stroke], ellipse[fill], path[fill]'),
		).toHaveLength(0);
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
