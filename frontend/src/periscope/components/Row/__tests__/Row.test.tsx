// eslint-disable-next-line no-restricted-imports -- reads the RowContext Row provides
import { createRef, useContext } from 'react';
import { act, render, screen, userEvent } from 'tests/test-utils';

import Row from '../Row';
import RowContext from '../RowContext';

jest.mock('../Row.module.scss', () => ({
	__esModule: true,
	default: new Proxy({}, { get: (_target, key): unknown => key }),
}));

const TEST_ID = 'row';
const PROBE_TEST_ID = 'row-context';

function ContextProbe(): JSX.Element {
	const context = useContext(RowContext);
	return <span data-testid={PROBE_TEST_ID}>{JSON.stringify(context)}</span>;
}

type Listener = () => void;

/** Simulates a viewport `width` px wide; returns a resize function. */
function mockViewport(width: number): (next: number) => void {
	let current = width;
	const listeners = new Set<Listener>();
	const matches = (query: string): boolean => {
		const [, kind, px] = /\((min|max)-width: (\d+)px\)/.exec(query) ?? [];
		return kind === 'min' ? current >= Number(px) : current <= Number(px);
	};
	jest
		.spyOn(window, 'matchMedia')
		.mockImplementation((query: string): MediaQueryList => ({
			get matches(): boolean {
				return matches(query);
			},
			media: query,
			onchange: null,
			addListener: (listener): void => {
				listeners.add(listener as Listener);
			},
			removeListener: (listener): void => {
				listeners.delete(listener as Listener);
			},
			addEventListener: jest.fn(),
			removeEventListener: jest.fn(),
			dispatchEvent: jest.fn(),
		}));
	return (next: number): void => {
		current = next;
		act(() => listeners.forEach((listener) => listener()));
	};
}

describe('Row', () => {
	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('renders a row div with children and native props', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		const onClick = jest.fn();
		render(
			<Row data-testid={TEST_ID} className="custom" onClick={onClick}>
				child
			</Row>,
		);

		const el = screen.getByTestId(TEST_ID);
		await user.click(el);

		expect(el.tagName).toBe('DIV');
		expect(el).toHaveTextContent('child');
		expect(el.className).toBe('row custom');
		expect(el.getAttribute('style')).toBeNull();
		expect(onClick).toHaveBeenCalledTimes(1);
	});

	it('maps wrap, justify and align to their classes', () => {
		render(
			<Row
				data-testid={TEST_ID}
				wrap={false}
				justify="space-between"
				align="bottom"
			/>,
		);

		expect(screen.getByTestId(TEST_ID).className).toBe(
			'row noWrap justifySpaceBetween alignBottom',
		);
	});

	it('applies no class for wrap=true or align="stretch", like antd', () => {
		render(<Row data-testid={TEST_ID} wrap align="stretch" />);

		expect(screen.getByTestId(TEST_ID).className).toBe('row');
	});

	it('turns a horizontal gutter into negative margins', () => {
		const { rerender } = render(<Row data-testid={TEST_ID} gutter={24} />);
		const el = screen.getByTestId(TEST_ID);
		expect(el.getAttribute('style')).toBe(
			'margin-left: -12px; margin-right: -12px;',
		);

		rerender(<Row data-testid={TEST_ID} gutter={[16, 8]} />);
		expect(el.getAttribute('style')).toBe(
			'margin-left: -8px; margin-right: -8px; row-gap: 8px;',
		);
	});

	it('sets a zero vertical gutter but no margins for a zero horizontal one', () => {
		render(<Row data-testid={TEST_ID} gutter={[0, 0]} />);

		expect(screen.getByTestId(TEST_ID).getAttribute('style')).toBe('row-gap: 0;');
	});

	it('lets style override the gutter margins', () => {
		render(
			<Row data-testid={TEST_ID} gutter={[16, 8]} style={{ marginLeft: 4 }} />,
		);

		const el = screen.getByTestId(TEST_ID);
		expect(el.style.marginLeft).toBe('4px');
		expect(el.style.marginRight).toBe('-8px');
		expect(el.style.rowGap).toBe('8px');
	});

	it('provides the resolved gutter and wrap to its children', () => {
		const { rerender } = render(
			<Row>
				<ContextProbe />
			</Row>,
		);
		expect(screen.getByTestId(PROBE_TEST_ID)).toHaveTextContent(
			'{"gutter":[0,null]}',
		);

		rerender(
			<Row gutter={[16, 8]} wrap={false}>
				<ContextProbe />
			</Row>,
		);
		expect(screen.getByTestId(PROBE_TEST_ID)).toHaveTextContent(
			'{"gutter":[16,8],"wrap":false}',
		);
	});

	it('resolves responsive props to the widest matching breakpoint', () => {
		const resize = mockViewport(800);
		render(
			<Row
				data-testid={TEST_ID}
				gutter={[{ xs: 8, md: 16, xl: 32 }, { sm: 4 }]}
				justify={{ sm: 'start', lg: 'center' }}
				align={{ md: 'middle' }}
			>
				<ContextProbe />
			</Row>,
		);
		const el = screen.getByTestId(TEST_ID);
		expect(el.className).toBe('row justifyStart alignMiddle');
		expect(el.style.marginLeft).toBe('-8px');
		expect(el.style.rowGap).toBe('4px');
		expect(screen.getByTestId(PROBE_TEST_ID)).toHaveTextContent(
			'{"gutter":[16,4]}',
		);

		resize(1300);
		expect(el.className).toBe('row justifyCenter alignMiddle');
		expect(el.style.marginLeft).toBe('-16px');

		resize(500);
		expect(el.style.marginLeft).toBe('-4px');
		expect(el.style.rowGap).toBe('');
	});

	it('keeps the last align and justify when they resolve to nothing, like antd', () => {
		const resize = mockViewport(1300);
		const { rerender } = render(
			<Row data-testid={TEST_ID} justify={{ lg: 'center' }} align="bottom" />,
		);
		const el = screen.getByTestId(TEST_ID);
		expect(el.className).toBe('row justifyCenter alignBottom');

		resize(500);
		expect(el.className).toBe('row justifyCenter alignBottom');

		rerender(<Row data-testid={TEST_ID} justify="end" />);
		expect(el.className).toBe('row justifyEnd alignBottom');
	});

	it('resolves a gutter made responsive after mount as if every breakpoint matched, like antd', () => {
		mockViewport(500);
		const { rerender } = render(<Row data-testid={TEST_ID} gutter={8} />);
		rerender(
			<Row
				data-testid={TEST_ID}
				gutter={{ xs: 4, md: 20 }}
				justify={{ xs: 'end' }}
			/>,
		);

		const el = screen.getByTestId(TEST_ID);
		expect(el.className).toBe('row justifyEnd');
		expect(el.style.marginLeft).toBe('-10px');
	});

	it('does not query media when no prop is responsive', () => {
		const matchMedia = jest.spyOn(window, 'matchMedia');
		render(<Row gutter={[8, 8]} justify="center" align="top" />);

		expect(matchMedia).not.toHaveBeenCalled();
	});

	it('forwards its ref to the div', () => {
		const ref = createRef<HTMLDivElement>();
		render(<Row data-testid={TEST_ID} ref={ref} />);

		expect(ref.current).toBe(screen.getByTestId(TEST_ID));
	});
});
