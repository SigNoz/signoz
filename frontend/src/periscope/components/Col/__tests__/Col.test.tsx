import { createRef } from 'react';
import { render, screen, userEvent } from 'tests/test-utils';

import RowContext from '../../Row/RowContext';
import Col from '../Col';

jest.mock('../Col.module.scss', () => ({
	__esModule: true,
	default: new Proxy({}, { get: (_target, key): unknown => key }),
}));

const TEST_ID = 'col';

describe('Col', () => {
	it('renders a div with children and native props', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		const onClick = jest.fn();
		render(
			<Col data-testid={TEST_ID} className="custom" onClick={onClick}>
				child
			</Col>,
		);

		const el = screen.getByTestId(TEST_ID);
		await user.click(el);

		expect(el.tagName).toBe('DIV');
		expect(el).toHaveTextContent('child');
		expect(el.className).toBe('col custom');
		expect(el.getAttribute('style')).toBeNull();
		expect(onClick).toHaveBeenCalledTimes(1);
	});

	it('maps span, order, offset, push and pull to their classes', () => {
		render(
			<Col
				data-testid={TEST_ID}
				span={12}
				order={2}
				offset={3}
				push={4}
				pull={5}
			/>,
		);

		expect(screen.getByTestId(TEST_ID).className).toBe(
			'col span12 order2 offset3 push4 pull5',
		);
	});

	it('honours a top-level 0 only for span, like antd', () => {
		render(
			<Col
				data-testid={TEST_ID}
				span={0}
				order={0}
				offset={0}
				push={0}
				pull={0}
			/>,
		);

		expect(screen.getByTestId(TEST_ID).className).toBe('col span0');
	});

	it('maps breakpoint numbers to spans and objects to every key, 0 included', () => {
		render(
			<Col
				data-testid={TEST_ID}
				xs={0}
				md={{ span: 8, offset: 0, order: 1 }}
				xxl={{ push: 2, pull: 0 }}
			/>,
		);

		expect(screen.getByTestId(TEST_ID).className).toBe(
			'col xsSpan0 mdSpan8 mdOrder1 mdOffset0 xxlPush2 xxlPull0',
		);
	});

	it.each([
		[2, '2 2 auto'],
		['100px', '0 0 100px'],
		['2.5em', '0 0 2.5em'],
		['25%', '0 0 25%'],
		['auto', 'auto'],
		['1 1 200px', '1 1 200px'],
	])('parses flex %p as %p', (flex, expected) => {
		render(<Col data-testid={TEST_ID} flex={flex} />);

		expect(screen.getByTestId(TEST_ID).style.flex).toBe(expected);
	});

	it('pads by half the horizontal gutter from RowContext', () => {
		render(
			<RowContext.Provider value={{ gutter: [24, 16] }}>
				<Col data-testid={TEST_ID} />
			</RowContext.Provider>,
		);

		const el = screen.getByTestId(TEST_ID);
		expect(el.style.paddingLeft).toBe('12px');
		expect(el.style.paddingRight).toBe('12px');
		expect(el.style.paddingTop).toBe('');
	});

	it('zeroes min-width of a flex column only in a non-wrapping row', () => {
		const { rerender } = render(
			<RowContext.Provider value={{ wrap: false }}>
				<Col data-testid={TEST_ID} flex="auto" />
			</RowContext.Provider>,
		);
		const el = screen.getByTestId(TEST_ID);
		expect(el.style.minWidth).toBe('0');

		rerender(
			<RowContext.Provider value={{ wrap: false }}>
				<Col data-testid={TEST_ID} />
			</RowContext.Provider>,
		);
		expect(el.style.minWidth).toBe('');

		rerender(
			<RowContext.Provider value={{ wrap: true }}>
				<Col data-testid={TEST_ID} flex="auto" />
			</RowContext.Provider>,
		);
		expect(el.style.minWidth).toBe('');
	});

	it('lets style override gutter padding and flex', () => {
		render(
			<RowContext.Provider value={{ gutter: [24, 0] }}>
				<Col
					data-testid={TEST_ID}
					flex={1}
					style={{ paddingLeft: 2, flex: '3 3 10px', color: 'red' }}
				/>
			</RowContext.Provider>,
		);

		const el = screen.getByTestId(TEST_ID);
		expect(el.style.paddingLeft).toBe('2px');
		expect(el.style.paddingRight).toBe('12px');
		expect(el.style.flex).toBe('3 3 10px');
		expect(el.style.color).toBe('red');
	});

	it('forwards its ref to the div', () => {
		const ref = createRef<HTMLDivElement>();
		render(<Col data-testid={TEST_ID} ref={ref} />);

		expect(ref.current).toBe(screen.getByTestId(TEST_ID));
	});
});
