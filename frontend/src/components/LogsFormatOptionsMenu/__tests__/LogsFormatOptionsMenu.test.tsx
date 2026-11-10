import { FontSize } from 'container/OptionsMenu/types';
import {
	fireEvent,
	render,
	screen,
	userEvent,
	waitFor,
} from 'tests/test-utils';

import LogsFormatOptionsMenu from '../LogsFormatOptionsMenu';

const mockUpdateFormatting = jest.fn();

jest.mock('providers/preferences/sync/usePreferenceSync', () => ({
	usePreferenceSync: (): any => ({
		preferences: {
			columns: [],
			formatting: {
				maxLines: 1,
				format: 'table',
				fontSize: 'small',
				version: 1,
			},
		},
		loading: false,
		error: null,
		updateColumns: jest.fn(),
		updateFormatting: mockUpdateFormatting,
	}),
}));

describe('LogsFormatOptionsMenu (unit)', () => {
	beforeEach(() => {
		mockUpdateFormatting.mockClear();
	});

	function setup(): {
		getByTestId: ReturnType<typeof render>['getByTestId'];
		findItemByLabel: (label: string) => Element | undefined;
		formatOnChange: jest.Mock<any, any>;
		maxLinesOnChange: jest.Mock<any, any>;
		fontSizeOnChange: jest.Mock<any, any>;
	} {
		const items = [
			{ key: 'raw', label: 'Raw', data: { title: 'max lines per row' } },
			{ key: 'list', label: 'Default' },
			{ key: 'table', label: 'Column', data: { title: 'columns' } },
		];

		const formatOnChange = jest.fn();
		const maxLinesOnChange = jest.fn();
		const fontSizeOnChange = jest.fn();

		const { getByTestId } = render(
			<LogsFormatOptionsMenu
				items={items}
				selectedOptionFormat="table"
				config={{
					format: { value: 'table', onChange: formatOnChange },
					maxLines: { value: 1, onChange: maxLinesOnChange },
					fontSize: { value: FontSize.SMALL, onChange: fontSizeOnChange },
					addColumn: {
						isFetching: false,
						value: [],
						options: [],
						onFocus: jest.fn(),
						onBlur: jest.fn(),
						onSearch: jest.fn(),
						onSelect: jest.fn(),
						onRemove: jest.fn(),
						onReorder: jest.fn(),
					},
				}}
			/>,
		);

		// Open the popover menu by default for each test
		const formatButton = getByTestId('periscope-btn-format-options');
		fireEvent.click(formatButton);

		const getMenuItems = (): Element[] =>
			Array.from(document.querySelectorAll('.menu-items .item'));
		const findItemByLabel = (label: string): Element | undefined =>
			getMenuItems().find((el) => (el.textContent || '').includes(label));

		return {
			getByTestId,
			findItemByLabel,
			formatOnChange,
			maxLinesOnChange,
			fontSizeOnChange,
		};
	}

	// Covers: opens menu, changes format selection, updates max-lines, changes font size
	it('opens and toggles format selection', async () => {
		const { findItemByLabel, formatOnChange } = setup();

		// Assert initial selection
		const columnItem = findItemByLabel('Column') as Element;
		expect(document.querySelectorAll('.menu-items .item svg')).toHaveLength(1);
		expect(columnItem.querySelector('svg')).toBeInTheDocument();

		// Change selection to 'Raw'
		const rawItem = findItemByLabel('Raw') as Element;
		fireEvent.click(rawItem as HTMLElement);
		await waitFor(() => {
			const rawEl = findItemByLabel('Raw') as Element;
			expect(document.querySelectorAll('.menu-items .item svg')).toHaveLength(1);
			expect(rawEl.querySelector('svg')).toBeInTheDocument();
		});
		expect(formatOnChange).toHaveBeenCalledWith('raw');
	});

	it('increments max-lines and calls onChange', async () => {
		const { maxLinesOnChange, getByTestId } = setup();

		// Increment max lines
		const input = getByTestId('max-lines-per-row') as HTMLInputElement;
		const initial = Number(input.value);
		fireEvent.click(screen.getByRole('button', { name: 'More lines per row' }));

		await waitFor(() => {
			expect(Number(input.value)).toBe(initial + 1);
		});
		await waitFor(() => {
			expect(maxLinesOnChange).toHaveBeenCalledWith(initial + 1);
		});
	});

	it('clamps a typed max-lines value to 10', async () => {
		const { maxLinesOnChange, getByTestId } = setup();
		const input = getByTestId('max-lines-per-row') as HTMLInputElement;
		const user = userEvent.setup();

		await user.clear(input);
		await user.type(input, '15');
		await user.tab();

		await waitFor(() => expect(input.value).toBe('10'));
		expect(maxLinesOnChange).toHaveBeenLastCalledWith(10);
	});

	it('stops max-lines at 10', async () => {
		const { getByTestId } = setup();
		const input = getByTestId('max-lines-per-row') as HTMLInputElement;
		const increment = screen.getByRole('button', { name: 'More lines per row' });
		const user = userEvent.setup();

		for (let i = 0; i < 12; i++) {
			await user.click(increment);
		}

		await waitFor(() => expect(input.value).toBe('10'));
	});

	it('changes font size to MEDIUM and calls onChange', async () => {
		const { fontSizeOnChange, getByTestId } = setup();
		// Open font dropdown
		fireEvent.click(getByTestId('font-size-select'));

		// Choose MEDIUM
		fireEvent.click(getByTestId(`font-size-option-${FontSize.MEDIUM}`));

		await waitFor(() => {
			expect(
				getByTestId(`font-size-option-${FontSize.MEDIUM}`).querySelector('svg'),
			).toBeInTheDocument();
			expect(
				getByTestId(`font-size-option-${FontSize.SMALL}`).querySelector('svg'),
			).not.toBeInTheDocument();
		});
		await waitFor(() => {
			expect(fontSizeOnChange).toHaveBeenCalledWith(FontSize.MEDIUM);
		});
	});

	function renderWithOnOpen(
		onOpenColumns?: jest.Mock,
		selectedOptionFormat: 'table' | 'raw' | 'list' = 'table',
	): { getByTestId: ReturnType<typeof render>['getByTestId'] } {
		const items = [
			{ key: 'raw', label: 'Raw', data: { title: 'max lines per row' } },
			{ key: 'list', label: 'Default' },
			{ key: 'table', label: 'Column', data: { title: 'columns' } },
		];

		const { getByTestId } = render(
			<LogsFormatOptionsMenu
				items={items}
				selectedOptionFormat={selectedOptionFormat}
				config={{
					format: { value: selectedOptionFormat, onChange: jest.fn() },
					maxLines: { value: 1, onChange: jest.fn() },
					fontSize: { value: FontSize.SMALL, onChange: jest.fn() },
				}}
				onOpenColumns={onOpenColumns}
			/>,
		);
		fireEvent.click(getByTestId('periscope-btn-format-options'));
		return { getByTestId };
	}

	it('renders "Edit columns" row when format=table and onOpenColumns provided', () => {
		const onOpenColumns = jest.fn();
		const { getByTestId } = renderWithOnOpen(onOpenColumns, 'table');

		expect(getByTestId('periscope-btn-edit-columns')).toBeInTheDocument();
	});

	it('does not render "Edit columns" row when onOpenColumns is not provided', () => {
		renderWithOnOpen(undefined, 'table');

		expect(
			document.querySelector('[data-testid="periscope-btn-edit-columns"]'),
		).toBeNull();
	});

	it('does not render "Edit columns" row when format is not table', () => {
		renderWithOnOpen(jest.fn(), 'raw');

		expect(
			document.querySelector('[data-testid="periscope-btn-edit-columns"]'),
		).toBeNull();
	});

	it('fires onOpenColumns and closes the popover when "Edit columns" is clicked', async () => {
		const onOpenColumns = jest.fn();
		const { getByTestId } = renderWithOnOpen(onOpenColumns, 'table');

		fireEvent.click(getByTestId('periscope-btn-edit-columns'));

		expect(onOpenColumns).toHaveBeenCalledTimes(1);
		await waitFor(() => {
			// Popover content unmounts on close.
			expect(document.querySelector('.menu-container')).toBeNull();
		});
	});
});
