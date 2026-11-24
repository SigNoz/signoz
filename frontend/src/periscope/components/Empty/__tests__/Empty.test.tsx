import { Empty as AntdEmpty } from 'antd';
import { render, screen, within } from 'tests/test-utils';

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
		expect(
			within(screen.getByTestId('empty-image')).getByTestId('empty-default-image'),
		).toHaveAttribute('width', '184');
		expect(screen.getByTestId('empty-description')).toHaveTextContent(
			/^No data$/,
		);
	});

	it('themes the default image through its class, not inline style', () => {
		render(<Empty data-testid={TEST_ID} />);

		const svg = screen.getByTestId('empty-default-image');
		expect(svg).toHaveAttribute('class', 'defaultImage');
		expect(svg).not.toHaveAttribute('style');
	});

	it('switches to the normal variant and themes the simple image through classes', () => {
		render(<Empty data-testid={TEST_ID} image={Empty.PRESENTED_IMAGE_SIMPLE} />);

		const el = screen.getByTestId(TEST_ID);
		expect(el.className).toBe('empty normal');
		expect(screen.getByTestId('empty-simple-image')).toHaveAttribute(
			'width',
			'64',
		);
		expect(
			// oxlint-disable-next-line signoz/no-dom-node-access -- the theming contract is which SVG nodes carry classes
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
			// oxlint-disable-next-line signoz/no-dom-node-access -- the theming contract is that no SVG node paints with fill or stroke attributes
			el.querySelectorAll('svg [stroke], ellipse[fill], path[fill]'),
		).toHaveLength(0);
	});

	it("switches to the normal variant for antd's simple image", () => {
		render(
			<Empty data-testid={TEST_ID} image={AntdEmpty.PRESENTED_IMAGE_SIMPLE} />,
		);

		expect(screen.getByTestId(TEST_ID).className).toBe('empty normal');
	});

	it('keeps the default variant for a custom image node', () => {
		render(<Empty data-testid={TEST_ID} image={<span>custom</span>} />);

		expect(screen.getByTestId(TEST_ID).className).toBe('empty');
		expect(screen.getByTestId('empty-image').innerHTML).toBe(
			'<span>custom</span>',
		);
	});

	it('renders a string image as an img named after a string description', () => {
		const { rerender } = render(
			<Empty data-testid={TEST_ID} image={IMAGE_URL} description="Nothing" />,
		);
		const img = (): HTMLElement =>
			within(screen.getByTestId('empty-image')).getByRole('img');
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
		expect(screen.getByTestId('empty-description').innerHTML).toBe(
			'<em>Custom</em>',
		);
	});

	it('wraps children in a footer and styles the image wrapper', () => {
		render(
			<Empty data-testid={TEST_ID} imageStyle={{ height: 60 }}>
				<button type="button">Retry</button>
			</Empty>,
		);

		expect(partsOf(screen.getByTestId(TEST_ID))).toStrictEqual([
			'image',
			'description',
			'footer',
		]);
		expect(screen.getByTestId('empty-image').style.height).toBe('60px');
		expect(screen.getByTestId('empty-footer')).toHaveTextContent('Retry');
	});
});
