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

	it('opens, toggles selection, updates max-lines and font-size', async () => {
		const items = [
			{ key: 'raw', label: 'Raw', data: { title: 'max lines per row' } },
			{ key: 'list', label: 'Default' },
			{ key: 'table', label: 'Column', data: { title: 'columns' } },
		];

		const { getByTestId } = render(
			<LogsFormatOptionsMenu
				items={items}
				selectedOptionFormat="table"
				config={{
					format: { value: 'table', onChange: jest.fn() },
					maxLines: { value: 2, onChange: jest.fn() },
					fontSize: { value: FontSize.SMALL, onChange: jest.fn() },
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

		const formatButton = getByTestId('periscope-btn-format-options');
		fireEvent.click(formatButton);

		const getMenuItems = (): Element[] =>
			Array.from(document.querySelectorAll('.menu-items .item'));
		const findItemByLabel = (label: string): Element | undefined =>
			getMenuItems().find((el) => (el.textContent || '').includes(label));

		const columnItem = findItemByLabel('Column') as Element;
		expect(columnItem.querySelector('svg')).toBeTruthy();

		const rawItem = findItemByLabel('Raw') as Element;
		fireEvent.click(rawItem as HTMLElement);
		await waitFor(() => {
			expect(
				(findItemByLabel('Raw') as Element).querySelector('svg'),
			).toBeTruthy();
		});

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

		const fontButton = document.querySelector(
			'.font-size-container .value',
		) as HTMLElement;
		fireEvent.click(fontButton);
		const optionButtons = Array.from(
			document.querySelectorAll('.font-size-dropdown .option-btn'),
		);
		const mediumBtn = optionButtons[1] as HTMLElement;
		fireEvent.click(mediumBtn);
		await waitFor(() => {
			expect((optionButtons[1] as Element).querySelector('svg')).toBeTruthy();
		});
	});
});
