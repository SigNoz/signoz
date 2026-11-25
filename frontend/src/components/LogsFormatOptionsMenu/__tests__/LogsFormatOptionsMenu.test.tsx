import { FontSize } from 'container/OptionsMenu/types';
import {
	fireEvent,
	render,
	screen,
	userEvent,
	waitFor,
	within,
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

	async function setup(): Promise<{
		user: ReturnType<typeof userEvent.setup>;
		getByTestId: ReturnType<typeof render>['getByTestId'];
		formatOnChange: jest.Mock<any, any>;
		maxLinesOnChange: jest.Mock<any, any>;
		fontSizeOnChange: jest.Mock<any, any>;
	}> {
		const user = userEvent.setup();
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
		await user.click(formatButton);

		return {
			user,
			getByTestId,
			formatOnChange,
			maxLinesOnChange,
			fontSizeOnChange,
		};
	}

	// Covers: opens menu, changes format selection, updates max-lines, changes font size
	it('opens and toggles format selection', async () => {
		const { user, formatOnChange } = await setup();

		// Assert initial selection
		expect(screen.getAllByTestId('format-check-icon')).toHaveLength(1);
		expect(
			within(screen.getByTestId('format-option-table')).getByTestId(
				'format-check-icon',
			),
		).toBeInTheDocument();

		// Change selection to 'Raw'
		await user.click(screen.getByTestId('format-option-raw'));
		await waitFor(() => {
			expect(screen.getAllByTestId('format-check-icon')).toHaveLength(1);
			expect(
				within(screen.getByTestId('format-option-raw')).getByTestId(
					'format-check-icon',
				),
			).toBeInTheDocument();
		});
		expect(formatOnChange).toHaveBeenCalledWith('raw');
	});

	it('increments max-lines and calls onChange', async () => {
		const { user, maxLinesOnChange, getByTestId } = await setup();

		// Increment max lines
		const input = getByTestId('max-lines-per-row-field') as HTMLInputElement;
		const initial = Number(input.value);
		await user.click(screen.getByRole('button', { name: 'More lines per row' }));

		await waitFor(() => {
			expect(Number(input.value)).toBe(initial + 1);
		});
		await waitFor(() => {
			expect(maxLinesOnChange).toHaveBeenCalledWith(initial + 1);
		});
	});

	it('clamps a typed max-lines value to 10', async () => {
		const { user, maxLinesOnChange, getByTestId } = await setup();
		const input = getByTestId('max-lines-per-row-field') as HTMLInputElement;

		await user.clear(input);
		await user.type(input, '15');
		await user.tab();

		await waitFor(() => expect(input.value).toBe('10'));
		expect(maxLinesOnChange).toHaveBeenLastCalledWith(10);
	});

	it('stops max-lines at 10', async () => {
		const { user, getByTestId } = await setup();
		const input = getByTestId('max-lines-per-row-field') as HTMLInputElement;
		const increment = screen.getByRole('button', { name: 'More lines per row' });

		for (let i = 0; i < 12; i++) {
			await user.click(increment);
		}

		await waitFor(() => expect(input.value).toBe('10'));
	});

	it('changes font size to MEDIUM and calls onChange', async () => {
		const { user, fontSizeOnChange, getByTestId } = await setup();
		// Open font dropdown
		await user.click(getByTestId('font-size-select'));

		// Choose MEDIUM
		await user.click(getByTestId(`font-size-option-${FontSize.MEDIUM}`));

		await waitFor(() => {
			expect(
				within(getByTestId(`font-size-option-${FontSize.MEDIUM}`)).getByTestId(
					'font-size-option-check',
				),
			).toBeInTheDocument();
			expect(
				within(getByTestId(`font-size-option-${FontSize.SMALL}`)).queryByTestId(
					'font-size-option-check',
				),
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
			screen.queryByTestId('periscope-btn-edit-columns'),
		).not.toBeInTheDocument();
	});

	it('does not render "Edit columns" row when format is not table', () => {
		renderWithOnOpen(jest.fn(), 'raw');

		expect(
			screen.queryByTestId('periscope-btn-edit-columns'),
		).not.toBeInTheDocument();
	});

	it('fires onOpenColumns and closes the popover when "Edit columns" is clicked', async () => {
		const onOpenColumns = jest.fn();
		const { getByTestId } = renderWithOnOpen(onOpenColumns, 'table');

		fireEvent.click(getByTestId('periscope-btn-edit-columns'));

		expect(onOpenColumns).toHaveBeenCalledTimes(1);
		await waitFor(() => {
			// Popover content unmounts on close.
			expect(screen.queryByTestId('format-option-table')).not.toBeInTheDocument();
		});
	});
});
