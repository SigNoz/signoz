import { createRef } from 'react';
import { render, screen, userEvent } from 'tests/test-utils';

import List from '../List';

jest.mock('../List.module.scss', () => ({
	__esModule: true,
	default: new Proxy({}, { get: (_target, key): unknown => key }),
}));

const TEST_ID = 'list';

interface Row {
	key?: string;
	id: string;
	name: string;
}

const ROWS: Row[] = [
	{ id: 'a', name: 'Alpha' },
	{ id: 'b', name: 'Beta' },
];

function renderRow(row: Row): JSX.Element {
	return <List.Item data-testid={`item-${row.id}`}>{row.name}</List.Item>;
}

describe('List', () => {
	it('renders each row through renderItem inside the items list', () => {
		render(
			<List data-testid={TEST_ID} dataSource={ROWS} renderItem={renderRow} />,
		);

		const list = screen.getByTestId(TEST_ID);
		const item = screen.getByTestId('item-a');
		expect(list.className).toBe('list split');
		expect(item.tagName).toBe('LI');
		expect(item.className).toBe('item');
		expect(item.parentElement?.className).toBe('items');
		expect(item.parentElement?.parentElement?.className).toBe('container');
		expect(list.querySelectorAll('li')).toHaveLength(2);
		expect(screen.getByTestId('item-b')).toHaveTextContent('Beta');
	});

	it('maps layout, size, split, bordered and footer to classes', () => {
		const { rerender } = render(
			<List
				data-testid={TEST_ID}
				className="custom"
				itemLayout="vertical"
				size="large"
				bordered
				footer="Footer"
			/>,
		);
		const list = screen.getByTestId(TEST_ID);
		expect(list.className).toBe(
			'list vertical lg split bordered somethingAfterLastItem custom',
		);

		rerender(<List data-testid={TEST_ID} size="small" split={false} />);
		expect(list.className).toBe('list sm');

		rerender(<List data-testid={TEST_ID} size="default" />);
		expect(list.className).toBe('list split');
	});

	it('wraps header and footer around the content', () => {
		render(<List data-testid={TEST_ID} header="Head" footer="Foot" />);

		const parts = Array.from(screen.getByTestId(TEST_ID).children);
		expect(parts.map((part) => part.className)).toStrictEqual([
			'header',
			'nestedLoading',
			'footer',
		]);
		expect(parts[0]).toHaveTextContent('Head');
		expect(parts[2]).toHaveTextContent('Foot');
	});

	it('shows the default empty state, or locale.emptyText, without data', () => {
		const { rerender } = render(<List data-testid={TEST_ID} />);
		const list = screen.getByTestId(TEST_ID);
		expect(list.querySelector('.emptyText')).toHaveTextContent('No data');
		expect(list.querySelector('.emptyText svg')).toBeInTheDocument();

		rerender(<List data-testid={TEST_ID} locale={{ emptyText: 'Nothing' }} />);
		expect(list.querySelector('.emptyText')).toHaveTextContent(/^Nothing$/);
	});

	it('renders children instead of the empty state', () => {
		render(
			<List data-testid={TEST_ID}>
				<List.Item data-testid="child">Child</List.Item>
			</List>,
		);

		const list = screen.getByTestId(TEST_ID);
		expect(list.querySelector('.emptyText')).toBeNull();
		expect(screen.getByTestId('child').parentElement?.className).toBe(
			'container',
		);
	});

	it('passes native props through and forwards its ref', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		const onClick = jest.fn();
		const ref = createRef<HTMLDivElement>();
		render(<List data-testid={TEST_ID} ref={ref} onClick={onClick} />);

		await user.click(screen.getByTestId(TEST_ID));

		expect(onClick).toHaveBeenCalledTimes(1);
		expect(ref.current).toBe(screen.getByTestId(TEST_ID));
	});
});

describe('List.Item', () => {
	it('renders actions with a split between each', () => {
		render(
			<List.Item data-testid="item" actions={['Edit', 'Delete', 'More']}>
				Content
			</List.Item>,
		);

		const actionList = screen.getByTestId('item').querySelector('.itemAction');
		const actions = Array.from(actionList?.children ?? []);
		expect(actions.map((action) => action.textContent)).toStrictEqual([
			'Edit',
			'Delete',
			'More',
		]);
		expect(actions.map((action) => !!action.querySelector('em'))).toStrictEqual([
			true,
			true,
			false,
		]);
		expect(actions[0].querySelector('em')?.className).toBe('itemActionSplit');
	});

	it('omits the action list when actions is empty', () => {
		render(
			<List.Item data-testid="item" actions={[]}>
				Content
			</List.Item>,
		);

		expect(screen.getByTestId('item').querySelector('ul')).toBeNull();
	});

	it('drops flex layout when text sits beside other children', () => {
		const { rerender } = render(
			<List.Item data-testid="item">
				text
				<span>sibling</span>
			</List.Item>,
		);
		const item = screen.getByTestId('item');
		expect(item.className).toBe('item itemNoFlex');

		rerender(<List.Item data-testid="item">only text</List.Item>);
		expect(item.className).toBe('item');
	});

	it('splits a vertical item with extra into main and extra blocks', () => {
		render(
			<List itemLayout="vertical">
				<List.Item data-testid="with-extra" extra="Extra" actions={['Edit']}>
					Body
				</List.Item>
				<List.Item data-testid="without-extra">Body</List.Item>
			</List>,
		);

		const withExtra = screen.getByTestId('with-extra');
		expect(withExtra.className).toBe('item');
		expect(
			Array.from(withExtra.children).map((child) => child.className),
		).toStrictEqual(['itemMain', 'itemExtra']);
		expect(withExtra.querySelector('.itemMain .itemAction')).toHaveTextContent(
			'Edit',
		);
		expect(screen.getByTestId('without-extra').className).toBe('item itemNoFlex');
	});

	it('renders extra inline after the actions in a horizontal list', () => {
		render(
			<List.Item data-testid="item" actions={['Edit']} extra={<b>Extra</b>}>
				<span>Body</span>
			</List.Item>,
		);

		const children = Array.from(screen.getByTestId('item').children);
		expect(children.map((child) => child.tagName)).toStrictEqual([
			'SPAN',
			'UL',
			'B',
		]);
	});

	it('forwards its ref to the li', () => {
		const ref = createRef<HTMLLIElement>();
		render(<List.Item data-testid="item" ref={ref} />);

		expect(ref.current).toBe(screen.getByTestId('item'));
	});
});

describe('List.Item.Meta', () => {
	it('renders avatar, title and description', () => {
		render(
			<List.Item.Meta
				data-testid="meta"
				className="custom"
				avatar={<i>A</i>}
				title="Title"
				description="Description"
			/>,
		);

		const meta = screen.getByTestId('meta');
		expect(meta.className).toBe('itemMeta custom');
		expect(meta.querySelector('.itemMetaAvatar')).toHaveTextContent('A');
		const title = meta.querySelector('.itemMetaContent > .itemMetaTitle');
		expect(title?.tagName).toBe('H4');
		expect(title).toHaveTextContent('Title');
		expect(meta.querySelector('.itemMetaDescription')).toHaveTextContent(
			'Description',
		);
	});

	it('omits the content block without a title or description', () => {
		render(<List.Item.Meta data-testid="meta" avatar={<i>A</i>} />);

		const meta = screen.getByTestId('meta');
		expect(meta.children).toHaveLength(1);
		expect(meta.querySelector('.itemMetaContent')).toBeNull();
	});
});
