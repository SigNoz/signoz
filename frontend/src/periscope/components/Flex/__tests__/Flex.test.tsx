import { createRef } from 'react';
import { render, screen, userEvent } from 'tests/test-utils';

import Flex from '../Flex';

jest.mock('../Flex.module.scss', () => ({
	__esModule: true,
	default: new Proxy({}, { get: (_target, key): unknown => key }),
}));

const TEST_ID = 'flex';

describe('Flex', () => {
	it('renders a flex div with children and native props', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		const onClick = jest.fn();
		render(
			<Flex data-testid={TEST_ID} className="custom" onClick={onClick}>
				child
			</Flex>,
		);

		const el = screen.getByTestId(TEST_ID);
		await user.click(el);

		expect(el.tagName).toBe('DIV');
		expect(el).toHaveTextContent('child');
		expect(el.className).toBe('custom flex');
		expect(onClick).toHaveBeenCalledTimes(1);
	});

	it('maps wrap, align and justify to their classes', () => {
		render(
			<Flex
				data-testid={TEST_ID}
				wrap="wrap-reverse"
				align="flex-end"
				justify="space-between"
			/>,
		);

		expect(screen.getByTestId(TEST_ID).className).toBe(
			'flex wrapWrapReverse alignFlexEnd justifySpaceBetween',
		);
	});

	it('stretches a vertical flex only when align is unset', () => {
		const { rerender } = render(<Flex data-testid={TEST_ID} vertical />);
		expect(screen.getByTestId(TEST_ID).className).toBe(
			'flex alignStretch vertical',
		);

		rerender(<Flex data-testid={TEST_ID} vertical align="center" />);
		expect(screen.getByTestId(TEST_ID).className).toBe(
			'flex alignCenter vertical',
		);
	});

	it('applies no align class for an explicit stretch, like antd', () => {
		const { rerender } = render(<Flex data-testid={TEST_ID} align="stretch" />);
		expect(screen.getByTestId(TEST_ID).className).toBe('flex');

		rerender(<Flex data-testid={TEST_ID} vertical align="stretch" />);
		expect(screen.getByTestId(TEST_ID).className).toBe('flex vertical');
	});

	it('uses a class for preset gaps and an inline style otherwise', () => {
		const { rerender } = render(<Flex data-testid={TEST_ID} gap="middle" />);
		const el = screen.getByTestId(TEST_ID);
		expect(el.className).toBe('flex gapMiddle');
		expect(el.style.gap).toBe('');

		rerender(<Flex data-testid={TEST_ID} gap={4} />);
		expect(el.className).toBe('flex');
		expect(el.style.gap).toBe('4px');

		rerender(<Flex data-testid={TEST_ID} gap="2px 6px" />);
		expect(el.style.gap).toBe('2px 6px');

		rerender(<Flex data-testid={TEST_ID} gap={0} style={{ gap: 10 }} />);
		expect(el.style.gap).toBe('10px');
	});

	it('lets flex and gap props override the same keys in style', () => {
		render(
			<Flex
				data-testid={TEST_ID}
				flex="1 1 auto"
				gap={8}
				style={{ flex: 'none', gap: 2, color: 'red' }}
			/>,
		);

		const el = screen.getByTestId(TEST_ID);
		expect(el.style.flex).toBe('1 1 auto');
		expect(el.style.gap).toBe('8px');
		expect(el.style.color).toBe('red');
	});

	it('forwards its ref to the div', () => {
		const ref = createRef<HTMLDivElement>();
		render(<Flex data-testid={TEST_ID} ref={ref} />);

		expect(ref.current).toBe(screen.getByTestId(TEST_ID));
	});
});
