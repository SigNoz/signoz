import { render, screen } from 'tests/test-utils';

import Space from '../Space';

jest.mock('../Space.module.scss', () => ({
	__esModule: true,
	default: new Proxy({}, { get: (_target, key): unknown => key }),
}));

const TEST_ID = 'space-compact';

describe('Space.Compact', () => {
	it('renders children unwrapped with block and vertical classes', () => {
		render(
			<Space.Compact
				data-testid={TEST_ID}
				className="custom"
				block
				direction="vertical"
			>
				<b>a</b>
				{null}
				<i>b</i>
			</Space.Compact>,
		);

		const el = screen.getByTestId(TEST_ID);
		expect(el.className).toBe('compact compactBlock vertical custom');
		expect(el.innerHTML).toBe('<b>a</b><i>b</i>');
	});

	it('renders nothing when every child is empty', () => {
		const { container } = render(
			<Space.Compact data-testid={TEST_ID}>
				{null}
				{false}
			</Space.Compact>,
		);

		expect(container).toBeEmptyDOMElement();
	});
});
