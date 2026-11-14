import { createRef } from 'react';
import { render, screen, userEvent } from 'tests/test-utils';

import Content from '../Content';
import Footer from '../Footer';
import Header from '../Header';
import Layout from '../Layout';

jest.mock('../Layout.module.scss', () => ({
	__esModule: true,
	default: new Proxy({}, { get: (_target, key): unknown => key }),
}));

const TEST_ID = 'layout';

describe('Layout', () => {
	it('renders a layout div with children and native props', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		const onClick = jest.fn();
		render(
			<Layout
				data-testid={TEST_ID}
				className="custom"
				rootClassName="root"
				style={{ color: 'red' }}
				onClick={onClick}
			>
				child
			</Layout>,
		);

		const el = screen.getByTestId(TEST_ID);
		await user.click(el);

		expect(el.tagName).toBe('DIV');
		expect(el).toHaveTextContent('child');
		expect(el.className).toBe('layout custom root');
		expect(el.style.color).toBe('red');
		expect(onClick).toHaveBeenCalledTimes(1);
	});

	it('adds the sider class only for hasSider, without leaking the prop', () => {
		const { rerender } = render(<Layout data-testid={TEST_ID} hasSider />);
		const el = screen.getByTestId(TEST_ID);
		expect(el.className).toBe('layout hasSider');
		expect(el).not.toHaveAttribute('hasSider');
		expect(el).not.toHaveAttribute('hassider');

		rerender(<Layout data-testid={TEST_ID} hasSider={false} />);
		expect(el.className).toBe('layout');
	});

	it.each([
		['Header', Header, 'HEADER', 'header'],
		['Footer', Footer, 'FOOTER', 'footer'],
		['Content', Content, 'MAIN', 'content'],
	] as const)(
		'renders %s as its landmark element',
		(_name, Part, tagName, partClass) => {
			render(
				<Part data-testid={TEST_ID} className="custom" title="t">
					text
				</Part>,
			);

			const el = screen.getByTestId(TEST_ID);
			expect(el.tagName).toBe(tagName);
			expect(el.className).toBe(`${partClass} custom`);
			expect(el).toHaveAttribute('title', 't');
			expect(el).toHaveTextContent('text');
		},
	);

	it('exposes the parts as static members', () => {
		expect(Layout.Header).toBe(Header);
		expect(Layout.Footer).toBe(Footer);
		expect(Layout.Content).toBe(Content);
	});

	it('forwards refs to the rendered elements', () => {
		const layoutRef = createRef<HTMLDivElement>();
		const headerRef = createRef<HTMLElement>();
		const footerRef = createRef<HTMLElement>();
		const contentRef = createRef<HTMLElement>();
		render(
			<Layout data-testid="layout" ref={layoutRef}>
				<Header data-testid="header" ref={headerRef} />
				<Content data-testid="content" ref={contentRef} />
				<Footer data-testid="footer" ref={footerRef} />
			</Layout>,
		);

		expect(layoutRef.current).toBe(screen.getByTestId('layout'));
		expect(headerRef.current).toBe(screen.getByTestId('header'));
		expect(contentRef.current).toBe(screen.getByTestId('content'));
		expect(footerRef.current).toBe(screen.getByTestId('footer'));
	});
});
