import { act, render, screen, userEvent } from 'tests/test-utils';

import TopList from '../components/TopList/TopList';
import { HEADER_HEIGHT, LIST_PADDING_Y, ROW_GAP } from '../constants';
import { mockListLayout } from './mockListLayout';
import type { TopListRow } from '../types';

function rowsOf(count: number): TopListRow[] {
	return Array.from({ length: count }, (_, index) => ({
		key: `A-${index}`,
		label: `service-${index}`,
		isEmptyLabel: false,
		value: count - index,
		rawValue: count - index,
		ratio: (count - index) / count,
		share: null,
		queryName: 'A',
		labels: { 'service.name': `service-${index}` },
	}));
}

const renderList = (
	count: number,
	{ clickable = false } = {},
): ReturnType<typeof render> =>
	render(
		<TopList
			panelId="panel-1"
			rows={rowsOf(count)}
			valueName="count()"
			thresholds={[]}
			onSelect={clickable ? jest.fn() : undefined}
		/>,
	);

const renderedRows = (): HTMLElement[] =>
	screen.queryAllByTestId('top-list-row');

mockListLayout();

const focusedRowIndex = (): string | null =>
	document.activeElement?.getAttribute('data-row-index') ?? null;

// Moving focus can scroll the window first, and the target row mounts a frame later.
let user: ReturnType<typeof userEvent.setup>;
beforeEach(() => {
	user = userEvent.setup({ pointerEventsCheck: 0 });
});

async function pressKey(key: string): Promise<void> {
	await user.keyboard(`{${key}}`);
	await act(async () => {
		await new Promise((resolve) => setTimeout(resolve, 100));
	});
}

const hover = (element: Element): Promise<void> => user.hover(element);

describe('TopList', () => {
	it('renders every row of a list that fits', () => {
		renderList(5);

		expect(renderedRows()).toHaveLength(5);
	});

	it.each([100, 1000])('renders only a window of a %i-row list', (count) => {
		renderList(count);

		const rendered = renderedRows().length;
		expect(rendered).toBeGreaterThan(0);
		expect(rendered).toBeLessThan(40);
	});

	it('jumps to the first and last rows with Home and End', async () => {
		renderList(20, { clickable: true });
		renderedRows()[5].focus();

		await pressKey('End');
		expect(focusedRowIndex()).toBe('19');

		await pressKey('Home');
		expect(focusedRowIndex()).toBe('0');
	});

	it('stays put at the ends of the list', async () => {
		renderList(3, { clickable: true });
		const rows = renderedRows();
		rows[0].focus();

		await pressKey('ArrowUp');
		expect(rows[0]).toHaveFocus();
	});

	it('numbers rows and shows their share when asked', () => {
		const rows = rowsOf(2).map((row, index) => ({
			...row,
			share: index === 0 ? 2 / 3 : 1 / 3,
		}));
		render(
			<TopList
				panelId="panel-1"
				rows={rows}
				valueName="count()"
				thresholds={[]}
				showRank
				showShare
			/>,
		);

		expect(
			screen.getAllByTestId('top-list-row-rank').map((rank) => rank.textContent),
		).toStrictEqual(['1', '2']);
		expect(
			screen
				.getAllByTestId('top-list-row-share')
				.map((share) => share.textContent),
		).toStrictEqual(['67%', '33%']);
	});

	it('paints bars the panel color unless a background threshold matches', () => {
		render(
			<TopList
				panelId="panel-1"
				rows={rowsOf(2)}
				valueName="count()"
				barColor="#00C853"
				thresholds={[
					{ value: 2, operator: '>=', color: 'Red', format: 'background' },
				]}
			/>,
		);

		const fills = screen.getAllByTestId('top-list-row-fill');
		expect(fills[0].style.getPropertyValue('--fill-color')).not.toBe('#00C853');
		expect(fills[1].style.getPropertyValue('--fill-color')).toBe('#00C853');
	});

	it('heads the columns that are shown', () => {
		render(
			<TopList
				panelId="panel-1"
				rows={rowsOf(2)}
				valueName="count()"
				labelName="service.name"
				thresholds={[]}
				showRank
				showShare
			/>,
		);

		expect(screen.getByTestId('top-list-header').textContent).toBe(
			'#service.nameSharecount()',
		);
	});

	it('explains a header on hover with its full name', async () => {
		render(
			<TopList
				panelId="panel-1"
				rows={rowsOf(2)}
				valueName="sum(signoz_calls_total)"
				labelName="service.name"
				thresholds={[]}
			/>,
		);

		await hover(screen.getByText('sum(signoz_calls_total)'));

		const tooltip = await screen.findAllByTestId(
			'top-list-header-tooltip',
			{},
			{ timeout: 2000 },
		);
		expect(tooltip[0]).toHaveTextContent(
			'sum(signoz_calls_total)The value each row is ranked by.',
		);
	});

	it('follows the pointer with the hovered row in the tooltip', async () => {
		const rows = rowsOf(2).map((row) => ({ ...row, share: 0.5 }));
		render(
			<TopList
				panelId="panel-1"
				rows={rows}
				valueName="count()"
				thresholds={[]}
				showShare
			/>,
		);

		await hover(renderedRows()[1]);

		await expect(
			screen.findByTestId('top-list-tooltip-title'),
		).resolves.toHaveTextContent('service-1');
		expect(
			screen.getAllByTestId('top-list-tooltip-row').map((row) => row.textContent),
		).toStrictEqual(['count()1', 'Share of listed total50%']);
	});

	it('hides the tooltip over the empty space below the rows', async () => {
		renderList(2);
		await hover(renderedRows()[1]);
		await screen.findByTestId('top-list-tooltip');

		await hover(screen.getByTestId('top-list'));

		expect(screen.queryByTestId('top-list-tooltip')).not.toBeInTheDocument();
	});

	it('hides the tooltip when the pointer leaves the list', async () => {
		renderList(2);
		await hover(renderedRows()[0]);
		await screen.findByTestId('top-list-tooltip');

		await user.unhover(screen.getByTestId('top-list').parentElement as Element);

		expect(screen.queryByTestId('top-list-tooltip')).not.toBeInTheDocument();
	});

	it('hints at drilldown, not pinning, when rows are clickable', async () => {
		render(
			<TopList
				panelId="panel-1"
				rows={rowsOf(2)}
				valueName="count()"
				thresholds={[]}
				onSelect={jest.fn()}
			/>,
		);
		await hover(renderedRows()[0]);

		const footer = await screen.findByTestId('uplot-tooltip-footer');
		expect(footer).toHaveTextContent('Click to drilldown');
		expect(footer).not.toHaveTextContent('to pin the tooltip');
	});

	it('leaves the footer out when rows are not clickable', async () => {
		renderList(2);
		await hover(renderedRows()[0]);
		await screen.findByTestId('top-list-tooltip');

		expect(screen.queryByTestId('uplot-tooltip-footer')).not.toBeInTheDocument();
	});

	it('shows neither rank nor share by default', () => {
		renderList(3);

		expect(screen.queryByTestId('top-list-row-rank')).not.toBeInTheDocument();
		expect(screen.queryByTestId('top-list-row-share')).not.toBeInTheDocument();
	});

	it('cuts the middle out of a label wider than its bar', () => {
		// 100px bar, 17px of label inset, 10px per character: 8 characters fit.
		jest.spyOn(Element.prototype, 'clientWidth', 'get').mockReturnValue(100);
		jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
			font: '',
			measureText: (text: string) => ({ width: text.length * 10 }),
		} as unknown as CanvasRenderingContext2D);

		renderList(1, { clickable: true });

		expect(screen.getByText('serv…e-0')).toBeInTheDocument();
		expect(renderedRows()[0]).toHaveAttribute('aria-label', 'service-0: 1');
	});

	it('focuses a row that was out of view once it renders', async () => {
		renderList(1000, { clickable: true });
		renderedRows()[0].focus();

		await pressKey('End');

		expect(focusedRowIndex()).toBe('999');
	});

	it('scrolls a row moved to below the view fully into it', async () => {
		renderList(100, { clickable: true });
		const container = screen.getByTestId('top-list').parentElement as HTMLElement;
		const rowHeight = parseInt(
			screen.getByTestId('top-list').style.getPropertyValue('--row-height'),
			10,
		);
		const rowsTop = LIST_PADDING_Y / 2 + HEADER_HEIGHT + ROW_GAP;
		const rowBottom = (index: number): number =>
			rowsTop + index * (rowHeight + ROW_GAP) + rowHeight;
		const firstHidden = Array.from({ length: 100 }, (_, index) => index).find(
			(index) => rowBottom(index) > container.clientHeight,
		) as number;
		(
			container.querySelector(
				`[data-row-index="${firstHidden - 1}"]`,
			) as HTMLElement
		).focus();

		await pressKey('ArrowDown');

		expect(focusedRowIndex()).toBe(String(firstHidden));
		expect(container.scrollTop + container.clientHeight).toBeGreaterThanOrEqual(
			rowBottom(firstHidden),
		);
	});

	it('makes one row the Tab stop and moves it with focus', async () => {
		renderList(5, { clickable: true });
		const tabStops = (): string[] =>
			renderedRows()
				.filter((row) => row.tabIndex === 0)
				.map((row) => row.getAttribute('data-row-index') as string);

		expect(tabStops()).toStrictEqual(['0']);

		renderedRows()[0].focus();
		await pressKey('ArrowDown');

		expect(tabStops()).toStrictEqual(['1']);
	});

	it('moves through rows that are not clickable by keyboard', async () => {
		renderList(20);
		renderedRows()[0].focus();

		await pressKey('End');

		expect(focusedRowIndex()).toBe('19');
	});

	it('positions each row in the whole list', () => {
		renderList(100);

		const [first] = renderedRows();
		expect(first.closest('li')).toHaveAttribute('aria-posinset', '1');
		expect(first.closest('li')).toHaveAttribute('aria-setsize', '100');
	});

	it('renders rows that are not clickable as plain list items', () => {
		renderList(3);

		expect(screen.queryAllByRole('button')).toHaveLength(0);
		expect(renderedRows()[0].closest('li')).toHaveAttribute(
			'aria-label',
			'service-0: 3',
		);
	});

	it('keeps the tooltip on the hovered row when a refetch reorders the rows', async () => {
		const rows = rowsOf(3);
		const { rerender } = render(
			<TopList
				panelId="panel-1"
				rows={rows}
				valueName="count()"
				thresholds={[]}
			/>,
		);
		await hover(renderedRows()[1]);
		await expect(
			screen.findByTestId('top-list-tooltip-title'),
		).resolves.toHaveTextContent('service-1');

		rerender(
			<TopList
				panelId="panel-1"
				rows={[rows[1], rows[0], rows[2]]}
				valueName="count()"
				thresholds={[]}
			/>,
		);

		expect(screen.getByTestId('top-list-tooltip-title')).toHaveTextContent(
			'service-1',
		);
	});
});
