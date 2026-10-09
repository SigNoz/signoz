import { act, fireEvent, render, screen } from 'tests/test-utils';

import TopList from '../components/TopList/TopList';
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

const renderList = (count: number): ReturnType<typeof render> =>
	render(
		<TopList
			panelId="panel-1"
			rows={rowsOf(count)}
			valueName="count()"
			thresholds={[]}
		/>,
	);

const renderedRows = (): HTMLElement[] =>
	screen.queryAllByTestId('top-list-row');

mockListLayout();

const focusedRowIndex = (): string | null =>
	document.activeElement?.getAttribute('data-row-index') ?? null;

// Moving focus can scroll the window first, and the target row mounts a frame later.
async function pressKey(key: string): Promise<void> {
	await act(async () => {
		fireEvent.keyDown(document.activeElement as Element, { key });
		await new Promise((resolve) => setTimeout(resolve, 100));
	});
}

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
		renderList(20);
		renderedRows()[5].focus();

		await pressKey('End');
		expect(focusedRowIndex()).toBe('19');

		await pressKey('Home');
		expect(focusedRowIndex()).toBe('0');
	});

	it('stays put at the ends of the list', () => {
		renderList(3);
		const rows = renderedRows();
		rows[0].focus();

		fireEvent.keyDown(rows[0], { key: 'ArrowUp' });
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

		fireEvent.mouseMove(renderedRows()[1], { clientX: 40, clientY: 30 });

		await expect(
			screen.findByTestId('top-list-tooltip-title'),
		).resolves.toHaveTextContent('service-1');
		expect(
			screen.getAllByTestId('top-list-tooltip-row').map((row) => row.textContent),
		).toStrictEqual(['count()1', 'Share of listed total50%']);
	});

	it('hides the tooltip when the pointer leaves the list', async () => {
		renderList(2);
		fireEvent.mouseMove(renderedRows()[0]);
		await screen.findByTestId('top-list-tooltip');

		fireEvent.mouseLeave(screen.getByTestId('top-list').parentElement as Element);

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
		fireEvent.mouseMove(renderedRows()[0]);

		const footer = await screen.findByTestId('uplot-tooltip-footer');
		expect(footer).toHaveTextContent('Click to drilldown');
		expect(footer).not.toHaveTextContent('to pin the tooltip');
	});

	it('leaves the footer out when rows are not clickable', async () => {
		renderList(2);
		fireEvent.mouseMove(renderedRows()[0]);
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

		renderList(1);

		expect(screen.getByText('serv…e-0')).toBeInTheDocument();
		expect(renderedRows()[0]).toHaveAttribute('aria-label', 'service-0: 1');
	});

	it('focuses a row that was out of view once it renders', async () => {
		renderList(1000);
		renderedRows()[0].focus();

		await pressKey('End');

		expect(focusedRowIndex()).toBe('999');
	});
});
