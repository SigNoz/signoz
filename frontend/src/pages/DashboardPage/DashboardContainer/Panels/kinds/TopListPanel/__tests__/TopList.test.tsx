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
		queryName: 'A',
		labels: { 'service.name': `service-${index}` },
	}));
}

const renderList = (count: number): ReturnType<typeof render> =>
	render(<TopList rows={rowsOf(count)} thresholds={[]} />);

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

	it('focuses a row that was out of view once it renders', async () => {
		renderList(1000);
		renderedRows()[0].focus();

		await pressKey('End');

		expect(focusedRowIndex()).toBe('999');
	});
});
