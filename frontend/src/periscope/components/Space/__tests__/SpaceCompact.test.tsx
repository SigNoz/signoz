import { Button } from 'antd';
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

	it('gives antd children their compact position classes and size', () => {
		render(
			<Space.Compact size="small">
				<Button data-testid="first">a</Button>
				<Button data-testid="middle">b</Button>
				<Button data-testid="last">c</Button>
			</Space.Compact>,
		);

		const classesOf = (testId: string): string[] =>
			Array.from(screen.getByTestId(testId).classList).filter((name) =>
				/compact|btn-sm/.test(name),
			);
		expect(classesOf('first')).toStrictEqual([
			'ant-btn-sm',
			'ant-btn-compact-item',
			'ant-btn-compact-first-item',
		]);
		expect(classesOf('middle')).toStrictEqual([
			'ant-btn-sm',
			'ant-btn-compact-item',
		]);
		expect(classesOf('last')).toStrictEqual([
			'ant-btn-sm',
			'ant-btn-compact-item',
			'ant-btn-compact-last-item',
		]);
	});

	it('uses vertical compact classes and inherits edges from a parent', () => {
		render(
			<Space.Compact>
				<Space.Compact direction="vertical">
					<Button data-testid="inner-first">a</Button>
					<Button data-testid="inner-last">b</Button>
				</Space.Compact>
				<Button data-testid="outer-last">c</Button>
			</Space.Compact>,
		);

		const classesOf = (testId: string): string[] =>
			Array.from(screen.getByTestId(testId).classList).filter((name) =>
				name.includes('compact'),
			);
		expect(classesOf('inner-first')).toStrictEqual([
			'ant-btn-compact-vertical-item',
			'ant-btn-compact-vertical-first-item',
		]);
		expect(classesOf('inner-last')).toStrictEqual([
			'ant-btn-compact-vertical-item',
		]);
		expect(classesOf('outer-last')).toStrictEqual([
			'ant-btn-compact-item',
			'ant-btn-compact-last-item',
		]);
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
