import { FontSize } from 'container/OptionsMenu/types';
import { fireEvent, render, waitFor } from 'tests/test-utils';

import LogsFormatOptionsMenu from '../LogsFormatOptionsMenu';

const mockUpdateFormatting = jest.fn();

jest.mock('providers/preferences/sync/usePreferenceSync', () => ({
	usePreferenceSync: (): any => ({
		preferences: {
			columns: [],
			formatting: {
				maxLines: 2,
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
					maxLines: { value: 2, onChange: maxLinesOnChange },
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
		const { maxLinesOnChange } = setup();

		// Increment max lines
		const input = document.querySelector(
			'.max-lines-per-row-input input',
		) as HTMLInputElement;
		const initial = Number(input.value);
		const buttons = document.querySelectorAll(
			'.max-lines-per-row-input .periscope-btn',
		);
		const incrementBtn = buttons[1] as HTMLElement;
		fireEvent.click(incrementBtn);

		await waitFor(() => {
			expect(Number(input.value)).toBe(initial + 1);
		});
		await waitFor(() => {
			expect(maxLinesOnChange).toHaveBeenCalledWith(initial + 1);
		});
	});

	it('changes font size to MEDIUM and calls onChange', async () => {
		const { fontSizeOnChange } = setup();
		// Open font dropdown
		const fontButton = document.querySelector(
			'.font-size-container .value',
		) as HTMLElement;
		fireEvent.click(fontButton);

		// Choose MEDIUM
		const optionButtons = Array.from(
			document.querySelectorAll('.font-size-dropdown .option-btn'),
		);
		const mediumBtn = optionButtons[1] as HTMLElement;
		fireEvent.click(mediumBtn);

		await waitFor(() => {
			expect(
				document.querySelectorAll('.font-size-dropdown .option-btn .icon'),
			).toHaveLength(1);
			expect(
				(optionButtons[1] as Element).querySelector('.icon'),
			).toBeInTheDocument();
		});
		await waitFor(() => {
			expect(fontSizeOnChange).toHaveBeenCalledWith(FontSize.MEDIUM);
		});
	});
});
