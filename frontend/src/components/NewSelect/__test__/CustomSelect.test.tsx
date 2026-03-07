import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import CustomSelect from '../CustomSelect';

// Mock scrollIntoView which isn't available in JSDOM
window.HTMLElement.prototype.scrollIntoView = jest.fn();

// Mock options data
const mockOptions = [
	{ label: 'Option 1', value: 'option1' },
	{ label: 'Option 2', value: 'option2' },
	{ label: 'Option 3', value: 'option3' },
];

const mockGroupedOptions = [
	{
		label: 'Group 1',
		options: [
			{ label: 'Group 1 - Option 1', value: 'g1-option1' },
			{ label: 'Group 1 - Option 2', value: 'g1-option2' },
		],
	},
	{
		label: 'Group 2',
		options: [
			{ label: 'Group 2 - Option 1', value: 'g2-option1' },
			{ label: 'Group 2 - Option 2', value: 'g2-option2' },
		],
	},
];

describe('CustomSelect Component', () => {
	it('renders with placeholder and options', () => {
		const handleChange = jest.fn();
		render(
			<CustomSelect
				placeholder="Test placeholder"
				options={mockOptions}
				onChange={handleChange}
			/>,
		);

		// Check placeholder exists in the DOM (not using getByPlaceholderText)
		const placeholderElement = screen.getByText('Test placeholder');
		expect(placeholderElement).toBeInTheDocument();
	});

	it('opens dropdown when clicked', async () => {
		const handleChange = jest.fn();
		render(<CustomSelect options={mockOptions} onChange={handleChange} />);

		// Click to open the dropdown
		const selectElement = screen.getByRole('combobox');
		fireEvent.mouseDown(selectElement);

		// Wait for dropdown to appear
		await waitFor(() => {
			expect(screen.getByText('Option 1')).toBeInTheDocument();
			expect(screen.getByText('Option 2')).toBeInTheDocument();
			expect(screen.getByText('Option 3')).toBeInTheDocument();
		});
	});

	it('calls onChange when option is selected', async () => {
		const handleChange = jest.fn();
		render(<CustomSelect options={mockOptions} onChange={handleChange} />);

		// Open dropdown
		const selectElement = screen.getByRole('combobox');
		fireEvent.mouseDown(selectElement);

		// Click on an option
		await waitFor(() => {
			const option = screen.getByText('Option 2');
			fireEvent.click(option);
		});

		// Check onChange was called with correct value
		expect(handleChange).toHaveBeenCalledWith('option2', expect.anything());
	});

	it('filters options when searching', async () => {
		render(<CustomSelect options={mockOptions} />);

		// Open dropdown
		const selectElement = screen.getByRole('combobox');
		fireEvent.mouseDown(selectElement);

		// Type into search box
		fireEvent.change(selectElement, { target: { value: '2' } });

		// Dropdown should only show Option 2
		await waitFor(() => {
			// Check that the dropdown is present
			const dropdownElement = document.querySelector('.custom-select-dropdown');
			expect(dropdownElement).toBeInTheDocument();

			// Use a simple approach to verify filtering
			const allOptionsInDropdown = document.querySelectorAll('.option-item');
			let foundOption2 = false;

			allOptionsInDropdown.forEach((option) => {
				if (option.textContent?.includes('Option 2')) {
					foundOption2 = true;
				}

				// Should not show Options 1 or 3
				expect(option.textContent).not.toContain('Option 1');
				expect(option.textContent).not.toContain('Option 3');
			});

			expect(foundOption2).toBe(true);
		});
	});

	it('renders grouped options correctly', async () => {
		const handleChange = jest.fn();
		render(<CustomSelect options={mockGroupedOptions} onChange={handleChange} />);

		// Open dropdown
		const selectElement = screen.getByRole('combobox');
		fireEvent.mouseDown(selectElement);

		// Check group headers and options
		await waitFor(() => {
			expect(screen.getByText('Group 1')).toBeInTheDocument();
			expect(screen.getByText('Group 2')).toBeInTheDocument();
			expect(screen.getByText('Group 1 - Option 1')).toBeInTheDocument();
			expect(screen.getByText('Group 1 - Option 2')).toBeInTheDocument();
			expect(screen.getByText('Group 2 - Option 1')).toBeInTheDocument();
			expect(screen.getByText('Group 2 - Option 2')).toBeInTheDocument();
		});
	});

	it('shows loading state', () => {
		render(<CustomSelect options={mockOptions} loading />);

		// Open dropdown
		const selectElement = screen.getByRole('combobox');
		fireEvent.mouseDown(selectElement);

		// Check loading text is displayed
		expect(screen.getByText('Refreshing values...')).toBeInTheDocument();
	});

	it('shows error message', () => {
		render(
			<CustomSelect options={mockOptions} errorMessage="Test error message" />,
		);

		// Open dropdown
		const selectElement = screen.getByRole('combobox');
		fireEvent.mouseDown(selectElement);

		// Check error message is displayed
		expect(screen.getByText('Test error message')).toBeInTheDocument();
	});

	it('shows no data message', () => {
		render(<CustomSelect options={[]} noDataMessage="No data available" />);

		// Open dropdown
		const selectElement = screen.getByRole('combobox');
		fireEvent.mouseDown(selectElement);

		// Check no data message is displayed
		expect(screen.getByText('No data available')).toBeInTheDocument();
	});

	it('supports keyboard navigation', async () => {
		const handleChange = jest.fn();
		render(<CustomSelect options={mockOptions} onChange={handleChange} />);

		// Open dropdown using keyboard
		const selectElement = screen.getByRole('combobox');
		fireEvent.focus(selectElement);

		// Press down arrow to open dropdown
		fireEvent.keyDown(selectElement, { key: 'ArrowDown' });

		// Wait for dropdown to appear
		await waitFor(() => {
			expect(screen.getByText('Option 1')).toBeInTheDocument();
		});
	});

	it('handles selection via keyboard', async () => {
		const handleChange = jest.fn();
		render(<CustomSelect options={mockOptions} onChange={handleChange} />);

		// Open dropdown
		const selectElement = screen.getByRole('combobox');
		fireEvent.mouseDown(selectElement);

		// Wait for dropdown to appear then press Enter
		await waitFor(() => {
			expect(screen.getByText('Option 1')).toBeInTheDocument();

			// Press Enter to select first option
			fireEvent.keyDown(screen.getByText('Option 1'), { key: 'Enter' });
		});

		// Check onChange was called
		expect(handleChange).toHaveBeenCalled();
	});
});
