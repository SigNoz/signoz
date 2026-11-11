import { createRef } from 'react';
import { render, screen, userEvent } from 'tests/test-utils';

import Space from '../Space';

jest.mock('../Space.module.scss', () => ({
	__esModule: true,
	default: new Proxy({}, { get: (_target, key): unknown => key }),
}));

const TEST_ID = 'space';

function Nothing(): null {
	return null;
}

describe('Space', () => {
	it('wraps each child in an item div and passes native props', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		const onClick = jest.fn();
		render(
			<Space data-testid={TEST_ID} className="custom" onClick={onClick}>
				<b>a</b>
				text
			</Space>,
		);

		const el = screen.getByTestId(TEST_ID);
		await user.click(el);

		expect(el.className).toBe('space alignCenter gapRowSmall gapColSmall custom');
		expect(el.innerHTML).toBe(
			'<div class="item"><b>a</b></div><div class="item">text</div>',
		);
		expect(onClick).toHaveBeenCalledTimes(1);
	});

	it('centers only a horizontal space by default', () => {
		const { rerender } = render(
			<Space data-testid={TEST_ID} direction="vertical">
				a
			</Space>,
		);
		expect(screen.getByTestId(TEST_ID).className).toBe(
			'space vertical gapRowSmall gapColSmall',
		);

		rerender(
			<Space data-testid={TEST_ID} direction="vertical" align="baseline">
				a
			</Space>,
		);
		expect(screen.getByTestId(TEST_ID).className).toBe(
			'space vertical alignBaseline gapRowSmall gapColSmall',
		);
	});

	it('uses classes for preset sizes and inline gaps for numbers', () => {
		const { rerender } = render(
			<Space data-testid={TEST_ID} size={['large', 'middle']}>
				a
			</Space>,
		);
		const el = screen.getByTestId(TEST_ID);
		expect(el.className).toBe('space alignCenter gapRowMiddle gapColLarge');
		expect(el.getAttribute('style')).toBeNull();

		rerender(
			<Space data-testid={TEST_ID} size={[4, 20]} wrap>
				a
			</Space>,
		);
		expect(el.className).toBe('space alignCenter');
		expect(el.getAttribute('style')).toBe(
			'flex-wrap: wrap; column-gap: 4px; row-gap: 20px;',
		);

		rerender(
			<Space data-testid={TEST_ID} size={0} style={{ rowGap: 2 }}>
				a
			</Space>,
		);
		expect(el.getAttribute('style')).toBe('row-gap: 2px;');
	});

	it('skips empty children and splits only between rendered ones', () => {
		render(
			<Space data-testid={TEST_ID} split="|">
				{null}
				<>
					a
					<Nothing />
				</>
				{false}b{undefined}
			</Space>,
		);

		expect(screen.getByTestId(TEST_ID).innerHTML).toBe(
			'<div class="item">a</div><span>|</span>' +
				'<div class="item"></div><span>|</span>' +
				'<div class="item">b</div>',
		);
	});

	it('renders nothing without children but keeps an empty container for empty ones', () => {
		const { container, rerender } = render(<Space data-testid={TEST_ID} />);
		expect(container).toBeEmptyDOMElement();

		rerender(
			<Space data-testid={TEST_ID}>
				{null}
				{false}
			</Space>,
		);
		expect(screen.getByTestId(TEST_ID)).toBeEmptyDOMElement();
	});

	it('forwards its ref to the container', () => {
		const ref = createRef<HTMLDivElement>();
		render(
			<Space data-testid={TEST_ID} ref={ref}>
				a
			</Space>,
		);

		expect(ref.current).toBe(screen.getByTestId(TEST_ID));
	});
});
