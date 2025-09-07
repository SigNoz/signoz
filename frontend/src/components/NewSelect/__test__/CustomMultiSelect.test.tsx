import {
	fireEvent,
	render,
	RenderResult,
	screen,
	waitFor,
} from '@testing-library/react';
import { VirtuosoMockContext } from 'react-virtuoso';

import CustomMultiSelect from '../CustomMultiSelect';

// Mock scrollIntoView which isn't available in JSDOM
window.HTMLElement.prototype.scrollIntoView = jest.fn();

// Helper function to render with VirtuosoMockContext
const renderWithVirtuoso = (component: React.ReactElement): RenderResult =>
	render(
		<VirtuosoMockContext.Provider
			value={{ viewportHeight: 300, itemHeight: 100 }}
		>
			{component}
		</VirtuosoMockContext.Provider>,
	);

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

describe('CustomMultiSelect Component', () => {
	it('renders with placeholder', () => {
		const handleChange = jest.fn();
		renderWithVirtuoso(
			<CustomMultiSelect
				placeholder="Select multiple options"
				options={mockOptions}
				onChange={handleChange}
			/>,
		);

		// Check placeholder exists
		const placeholderElement = screen.getByText('Select multiple options');
		expect(placeholderElement).toBeInTheDocument();
	});

	it('opens dropdown when clicked', async () => {
		const handleChange = jest.fn();
		renderWithVirtuoso(
			<CustomMultiSelect options={mockOptions} onChange={handleChange} />,
		);

		// Click to open the dropdown
		const selectElement = screen.getByRole('combobox');
		fireEvent.mouseDown(selectElement);

		// Wait for dropdown to appear
		await waitFor(() => {
			expect(screen.getByText('ALL')).toBeInTheDocument(); // The ALL option
			expect(screen.getByText('Option 1')).toBeInTheDocument();
			expect(screen.getByText('Option 2')).toBeInTheDocument();
			expect(screen.getByText('Option 3')).toBeInTheDocument();
		});
	});

	it('selects multiple options', async () => {
		const handleChange = jest.fn();

		// Start with option1 already selected
		renderWithVirtuoso(
			<CustomMultiSelect
				options={mockOptions}
				onChange={handleChange}
				value={['option1']}
			/>,
		);

		// Open dropdown
		const selectElement = screen.getByRole('combobox');
		fireEvent.mouseDown(selectElement);

		// Wait for dropdown to appear
		await waitFor(() => {
			expect(screen.getByText('Option 3')).toBeInTheDocument();
		});

		// Click on Option 3
		const option3 = screen.getByText('Option 3');
		fireEvent.click(option3);

		// Verify onChange was called with the right values
		expect(handleChange).toHaveBeenCalled();
	});

	it('selects ALL options when ALL is clicked', async () => {
		const handleChange = jest.fn();
		renderWithVirtuoso(
			<CustomMultiSelect
				options={mockOptions}
				onChange={handleChange}
				enableAllSelection
			/>,
		);

		// Open dropdown
		const selectElement = screen.getByRole('combobox');
		fireEvent.mouseDown(selectElement);

		// Wait for dropdown to appear
		await waitFor(() => {
			expect(screen.getByText('ALL')).toBeInTheDocument();
		});

		// Click on ALL option
		const allOption = screen.getByText('ALL');
		fireEvent.click(allOption);

		// Verify onChange was called with all option values
		expect(handleChange).toHaveBeenCalledWith(
			['option1', 'option2', 'option3'],
			expect.arrayContaining([
				expect.objectContaining({ value: 'option1' }),
				expect.objectContaining({ value: 'option2' }),
				expect.objectContaining({ value: 'option3' }),
			]),
		);
	});

	it('displays selected options as tags', async () => {
		renderWithVirtuoso(
			<CustomMultiSelect options={mockOptions} value={['option1', 'option2']} />,
		);

		// Check that option values are shown as tags (not labels)
		expect(screen.getByText('option1')).toBeInTheDocument();
		expect(screen.getByText('option2')).toBeInTheDocument();
	});

	it('removes a tag when clicked', async () => {
		const handleChange = jest.fn();
		renderWithVirtuoso(
			<CustomMultiSelect
				options={mockOptions}
				value={['option1', 'option2']}
				onChange={handleChange}
			/>,
		);

		// Find close button on Option 1 tag and click it
		const closeButtons = document.querySelectorAll(
			'.ant-select-selection-item-remove',
		);
		fireEvent.click(closeButtons[0]);

		// Verify onChange was called with remaining option
		expect(handleChange).toHaveBeenCalledWith(
			['option2'],
			expect.arrayContaining([expect.objectContaining({ value: 'option2' })]),
		);
	});

	it('filters options when searching', async () => {
		renderWithVirtuoso(<CustomMultiSelect options={mockOptions} />);

		// Open dropdown
		const selectElement = screen.getByRole('combobox');
		fireEvent.mouseDown(selectElement);

		// Type into search box - get input directly
		const inputElement = selectElement.querySelector('input');
		if (inputElement) {
			fireEvent.change(inputElement, { target: { value: '2' } });
		}

		// Wait for the dropdown filtering to happen
		await waitFor(() => {
			// Check that the dropdown is present
			const dropdownElement = document.querySelector(
				'.custom-multiselect-dropdown',
			);
			expect(dropdownElement).toBeInTheDocument();

			// Verify Option 2 is visible in the dropdown
			const options = document.querySelectorAll('.option-label-text');
			let foundOption2 = false;

			options.forEach((option) => {
				const text = option.textContent || '';
				if (text.includes('Option 2')) foundOption2 = true;
			});

			expect(foundOption2).toBe(true);
		});
	});

	it('renders grouped options correctly', async () => {
		renderWithVirtuoso(<CustomMultiSelect options={mockGroupedOptions} />);

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
		renderWithVirtuoso(<CustomMultiSelect options={mockOptions} loading />);

		// Open dropdown
		const selectElement = screen.getByRole('combobox');
		fireEvent.mouseDown(selectElement);

		// Check loading text is displayed
		expect(screen.getByText('Refreshing values...')).toBeInTheDocument();
	});

	it('shows error message', () => {
		renderWithVirtuoso(
			<CustomMultiSelect
				options={mockOptions}
				errorMessage="Test error message"
			/>,
		);

		// Open dropdown
		const selectElement = screen.getByRole('combobox');
		fireEvent.mouseDown(selectElement);

		// Check error message is displayed
		expect(screen.getByText('Test error message')).toBeInTheDocument();
	});

	it('shows no data message', () => {
		renderWithVirtuoso(
			<CustomMultiSelect options={[]} noDataMessage="No data available" />,
		);

		// Open dropdown
		const selectElement = screen.getByRole('combobox');
		fireEvent.mouseDown(selectElement);

		// Check no data message is displayed
		expect(screen.getByText('No data available')).toBeInTheDocument();
	});

	it('shows "ALL" tag when all options are selected', () => {
		renderWithVirtuoso(
			<CustomMultiSelect
				options={mockOptions}
				value={['option1', 'option2', 'option3']}
				maxTagCount={2}
			/>,
		);

		// When all options are selected, component shows ALL tag instead
		expect(screen.getByText('ALL')).toBeInTheDocument();
	});
});
